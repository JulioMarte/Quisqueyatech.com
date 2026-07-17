import { GoogleGenAI, Modality } from "@google/genai";
import type { AssessmentEvidence } from "@/lib/assessment/types";

type Config = {
  token: string;
  model: string;
  systemInstruction: string;
  onStatus(
    status:
      "connecting" | "listening" | "thinking" | "speaking" | "reconnecting" | "ended" | "error",
  ): void;
  onTranscript(line: { speaker: "user" | "agent"; text: string }): void;
  onProgress(
    reason: "answer" | "correction" | "interruption" | "close",
    updates: AssessmentEvidence[],
  ): Promise<{ nextInstruction: string }>;
};

export async function connectGeminiLive(config: Config) {
  config.onStatus("connecting");
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
  const inputContext = new AudioContext();
  const outputContext = new AudioContext({ sampleRate: 24000 });
  const outputGain = outputContext.createGain();
  outputGain.connect(outputContext.destination);
  const ai = new GoogleGenAI({ apiKey: config.token, httpOptions: { apiVersion: "v1alpha" } });
  let nextPlaybackTime = 0;
  let closedByClient = false;
  let resumptionHandle: string | undefined;
  let reconnecting = false;
  const activeSources = new Set<AudioBufferSourceNode>();
  const playAudio = (base64: string) => {
    const bytes = base64ToBytes(base64);
    const sampleCount = Math.floor(bytes.length / 2);
    const buffer = outputContext.createBuffer(1, sampleCount, 24000);
    const channel = buffer.getChannelData(0);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let index = 0; index < sampleCount; index += 1)
      channel[index] = view.getInt16(index * 2, true) / 32768;
    const source = outputContext.createBufferSource();
    source.buffer = buffer;
    source.connect(outputGain);
    activeSources.add(source);
    source.onended = () => activeSources.delete(source);
    nextPlaybackTime = Math.max(nextPlaybackTime, outputContext.currentTime);
    source.start(nextPlaybackTime);
    nextPlaybackTime += buffer.duration;
  };

  let liveSession: Awaited<ReturnType<typeof ai.live.connect>>;
  const connect = async () =>
    ai.live.connect({
      model: config.model,
      callbacks: {
        onopen: () => config.onStatus("listening"),
        onerror: () => config.onStatus(reconnecting ? "reconnecting" : "error"),
        onclose: () => {
          if (closedByClient) return config.onStatus("ended");
          if (!reconnecting) {
            reconnecting = true;
            config.onStatus("reconnecting");
            void connect()
              .then((session) => {
                liveSession = session;
                reconnecting = false;
              })
              .catch(() => config.onStatus("error"));
          }
        },
        onmessage: (message) => {
          if (
            message.sessionResumptionUpdate?.resumable &&
            message.sessionResumptionUpdate.newHandle
          )
            resumptionHandle = message.sessionResumptionUpdate.newHandle;
          if (message.goAway) config.onStatus("reconnecting");
          const content = message.serverContent;
          if (content?.interrupted) {
            for (const source of activeSources)
              try {
                source.stop();
              } catch {
                /* already stopped */
              }
            activeSources.clear();
            nextPlaybackTime = outputContext.currentTime;
          }
          if (content?.inputTranscription?.text)
            config.onTranscript({ speaker: "user", text: content.inputTranscription.text });
          if (content?.outputTranscription?.text)
            config.onTranscript({ speaker: "agent", text: content.outputTranscription.text });
          const parts = content?.modelTurn?.parts || [];
          for (const part of parts)
            if (part.inlineData?.data && part.inlineData.mimeType?.startsWith("audio/")) {
              config.onStatus("speaking");
              playAudio(part.inlineData.data);
            }
          if (content?.turnComplete) config.onStatus("listening");
          if (message.toolCall?.functionCalls?.length) {
            config.onStatus("thinking");
            for (const call of message.toolCall.functionCalls) {
              if (call.name !== "update_assessment_state") continue;
              const args = call.args as
                { reason?: string; updates?: AssessmentEvidence[] } | undefined;
              const reason = ["answer", "correction", "interruption", "close"].includes(
                String(args?.reason),
              )
                ? (args!.reason as "answer" | "correction" | "interruption" | "close")
                : "answer";
              void config
                .onProgress(reason, Array.isArray(args?.updates) ? args.updates : [])
                .then((result) =>
                  liveSession.sendToolResponse({
                    functionResponses: [
                      {
                        id: call.id,
                        name: call.name,
                        response: { result: result.nextInstruction },
                      },
                    ],
                  }),
                )
                .catch((error) =>
                  liveSession.sendToolResponse({
                    functionResponses: [
                      {
                        id: call.id,
                        name: call.name,
                        response: {
                          error: error instanceof Error ? error.message : "Progress failed",
                        },
                      },
                    ],
                  }),
                );
            }
          }
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: config.systemInstruction,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        sessionResumption: { handle: resumptionHandle },
        tools: [
          {
            functionDeclarations: [
              {
                name: "update_assessment_state",
                description:
                  "Persist newly learned or corrected assessment facts after every substantive answer.",
                parametersJsonSchema: {
                  type: "object",
                  properties: {
                    reason: {
                      type: "string",
                      enum: ["answer", "correction", "interruption", "close"],
                    },
                    updates: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          field: { type: "string" },
                          value: { type: "string" },
                          evidence: { type: "string" },
                          status: {
                            type: "string",
                            enum: ["confirmed", "estimated", "inferred", "pending"],
                          },
                          confidence: { type: "number" },
                        },
                        required: ["field", "value", "evidence", "status", "confidence"],
                      },
                    },
                  },
                  required: ["reason", "updates"],
                },
              },
            ],
          },
        ],
      },
    });
  liveSession = await connect();

  const source = inputContext.createMediaStreamSource(stream);
  const processor = inputContext.createScriptProcessor(2048, 1, 1);
  const silent = inputContext.createGain();
  silent.gain.value = 0;
  processor.onaudioprocess = (event) => {
    const data = event.inputBuffer.getChannelData(0);
    liveSession.sendRealtimeInput({
      audio: {
        data: pcm16ToBase64(resample(data, inputContext.sampleRate, 16000)),
        mimeType: "audio/pcm;rate=16000",
      },
    });
  };
  source.connect(processor);
  processor.connect(silent);
  silent.connect(inputContext.destination);

  return {
    leave: async () => {
      closedByClient = true;
      processor.disconnect();
      source.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      for (const item of activeSources)
        try {
          item.stop();
        } catch {
          /* already stopped */
        }
      liveSession.close();
      await inputContext.close();
      await outputContext.close();
    },
    muteMic: (value: boolean) =>
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !value;
      }),
    muteSpeaker: (value: boolean) => {
      outputGain.gain.value = value ? 0 : 1;
    },
    sendGuidance: (instruction: string) =>
      liveSession.sendClientContent({
        turns: [{ role: "user", parts: [{ text: `<instruction>${instruction}</instruction>` }] }],
        turnComplete: false,
      }),
  };
}

function resample(input: Float32Array, inputRate: number, outputRate: number) {
  if (inputRate === outputRate) return input;
  const output = new Float32Array(Math.max(1, Math.round((input.length * outputRate) / inputRate)));
  const ratio = inputRate / outputRate;
  for (let index = 0; index < output.length; index += 1) {
    const position = index * ratio;
    const left = Math.floor(position);
    const right = Math.min(input.length - 1, left + 1);
    const fraction = position - left;
    output[index] = input[left] * (1 - fraction) + input[right] * fraction;
  }
  return output;
}

function pcm16ToBase64(input: Float32Array) {
  const bytes = new Uint8Array(input.length * 2);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < input.length; index += 1)
    view.setInt16(index * 2, Math.max(-1, Math.min(1, input[index])) * 0x7fff, true);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
