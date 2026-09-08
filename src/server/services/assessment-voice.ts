import { randomUUID } from "node:crypto";
import { AccessToken, AgentDispatchClient, RoomServiceClient } from "livekit-server-sdk";
import type { SettingsService } from "./settings";
import { decryptSetting } from "./webhook-http";
import { DEFAULT_GEMINI_LIVE_MODEL, DEFAULT_GEMINI_LIVE_VOICE, INTERVIEW_FRAMEWORK_VERSION } from "./assessment-runtime";

export interface AssessmentVoiceCreateInput {
  assessmentId: string;
  sessionKey: string;
  locale: "es" | "en";
  name: string;
  resumeSummary?: string;
}

export interface AssessmentParticipantTokenInput {
  assessmentId: string;
  sessionKey: string;
  locale: "es" | "en";
  name: string;
  roomName: string;
}

export interface AssessmentVoiceSession {
  provider: "livekit";
  assessmentId: string;
  roomUrl: string;
  token: string;
  roomName: string;
  supportId: string;
  dispatchId: string;
  agentReadyAtStart: boolean;
}

export interface AssessmentVoiceRuntime {
  createSession(input: AssessmentVoiceCreateInput): Promise<AssessmentVoiceSession>;
  deleteRoom(roomName: string): Promise<void>;
  issueParticipantToken(input: AssessmentParticipantTokenInput): Promise<{ roomUrl: string; token: string }>;
}

export class AssessmentVoiceError extends Error {
  constructor(
    readonly code: "LIVEKIT_NOT_CONFIGURED" | "AGENT_DISPATCH_FAILED" | "AGENT_CONFIGURATION" | "AGENT_MODEL_UNAVAILABLE",
    message: string,
  ) {
    super(message);
    this.name = "AssessmentVoiceError";
  }
}

interface LiveKitRuntimeConfig {
  apiUrl: string;
  roomUrl: string;
  apiKey: string;
  apiSecret: string;
  model: string;
  voice: string;
}

function normalizeLiveKitUrl(raw: string) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new AssessmentVoiceError("LIVEKIT_NOT_CONFIGURED", "LiveKit URL is invalid"); }
  if (url.protocol !== "wss:" && url.protocol !== "https:") {
    throw new AssessmentVoiceError("LIVEKIT_NOT_CONFIGURED", "LiveKit URL must use WSS or HTTPS");
  }
  if (!url.hostname || url.username || url.password) {
    throw new AssessmentVoiceError("LIVEKIT_NOT_CONFIGURED", "LiveKit URL is invalid");
  }
  const api = new URL(url.toString());
  api.protocol = "https:";
  api.pathname = "";
  api.search = "";
  api.hash = "";
  const room = new URL(api.toString());
  room.protocol = "wss:";
  return { apiUrl: api.toString(), roomUrl: room.toString() };
}

function runtimeConfig(settings: SettingsService): LiveKitRuntimeConfig {
  const runtime = settings.internalRuntime();
  const rawUrl = String(runtime.config.livekitUrl || "").trim();
  const encryptedKey = runtime.secrets.livekitApiKey;
  const encryptedSecret = runtime.secrets.livekitApiSecret;
  if (!rawUrl || !encryptedKey || !encryptedSecret) {
    throw new AssessmentVoiceError("LIVEKIT_NOT_CONFIGURED", "LiveKit credentials are incomplete");
  }
  const { apiUrl, roomUrl } = normalizeLiveKitUrl(rawUrl);
  try {
    return {
      apiUrl,
      roomUrl,
      apiKey: decryptSetting(encryptedKey),
      apiSecret: decryptSetting(encryptedSecret),
      model: String(runtime.config.geminiLiveModel || DEFAULT_GEMINI_LIVE_MODEL),
      voice: String(runtime.config.geminiLiveVoice || DEFAULT_GEMINI_LIVE_VOICE),
    };
  } catch {
    throw new AssessmentVoiceError("LIVEKIT_NOT_CONFIGURED", "LiveKit credentials could not be decrypted");
  }
}

function metadataState(raw: string | undefined) {
  try {
    const value = JSON.parse(raw || "{}") as Record<string, unknown>;
    return {
      state: typeof value.state === "string" ? value.state : "",
      ready: value.ready === true,
    };
  } catch {
    return { state: "", ready: false };
  }
}

async function participantToken(config: LiveKitRuntimeConfig, input: AssessmentParticipantTokenInput) {
  const metadata = JSON.stringify({
    assessmentId: input.assessmentId,
    sessionKey: input.sessionKey,
    locale: input.locale,
    frameworkVersion: INTERVIEW_FRAMEWORK_VERSION,
  });
  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity: `lead-${input.assessmentId}`,
    name: input.name,
    metadata,
  });
  token.addGrant({
    room: input.roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return token.toJwt();
}

export function assessmentVoiceFromSettings(
  settings: SettingsService,
  options: { readyTimeoutMs?: number; pollMs?: number } = {},
): AssessmentVoiceRuntime {
  const readyTimeoutMs = Math.max(0, Math.min(options.readyTimeoutMs ?? Number(process.env.LIVEKIT_AGENT_READY_TIMEOUT_MS || 60_000), 120_000));
  const pollMs = Math.max(100, Math.min(options.pollMs ?? 500, 5_000));

  return {
    async createSession(input) {
      const config = runtimeConfig(settings);
      const roomName = `assessment-${input.assessmentId}-${input.sessionKey}`;
      const supportId = randomUUID();
      const metadata = JSON.stringify({
        assessmentId: input.assessmentId,
        sessionKey: input.sessionKey,
        locale: input.locale,
        frameworkVersion: INTERVIEW_FRAMEWORK_VERSION,
        supportId,
        resumeSummary: input.resumeSummary,
      });
      const dispatchClient = new AgentDispatchClient(config.apiUrl, config.apiKey, config.apiSecret);
      const rooms = new RoomServiceClient(config.apiUrl, config.apiKey, config.apiSecret);
      let dispatch: { id: string };
      try {
        dispatch = await dispatchClient.createDispatch(roomName, "quisqueyatech-assessment", { metadata });
      } catch (error) {
        throw new AssessmentVoiceError(
          "AGENT_DISPATCH_FAILED",
          error instanceof Error ? error.message : "LiveKit dispatch failed",
        );
      }

      let agentReadyAtStart = false;
      const deadline = Date.now() + readyTimeoutMs;
      try {
        while (Date.now() < deadline) {
          const participants = await rooms.listParticipants(roomName);
          for (const participant of participants) {
            if (Number(participant.kind) !== 4) continue;
            const state = metadataState(participant.metadata);
            if (state.state === "configuration_error") {
              await rooms.deleteRoom(roomName).catch(() => undefined);
              throw new AssessmentVoiceError("AGENT_CONFIGURATION", "LiveKit agent configuration failed");
            }
            if (state.state === "model_unavailable") {
              await rooms.deleteRoom(roomName).catch(() => undefined);
              throw new AssessmentVoiceError("AGENT_MODEL_UNAVAILABLE", "LiveKit model is unavailable");
            }
            if (state.ready || state.state === "ready") {
              agentReadyAtStart = true;
              break;
            }
          }
          if (agentReadyAtStart) break;
          await new Promise((resolve) => setTimeout(resolve, Math.min(pollMs, Math.max(1, deadline - Date.now()))));
        }
      } catch (error) {
        if (error instanceof AssessmentVoiceError) throw error;
        await rooms.deleteRoom(roomName).catch(() => undefined);
        throw new AssessmentVoiceError(
          "AGENT_DISPATCH_FAILED",
          error instanceof Error ? error.message : "LiveKit participant readiness failed",
        );
      }

      return {
        provider: "livekit",
        assessmentId: input.assessmentId,
        roomUrl: config.roomUrl,
        token: await participantToken(config, { ...input, roomName }),
        roomName,
        supportId,
        dispatchId: dispatch.id,
        agentReadyAtStart,
      };
    },

    async deleteRoom(roomName) {
      const config = runtimeConfig(settings);
      const rooms = new RoomServiceClient(config.apiUrl, config.apiKey, config.apiSecret);
      await rooms.deleteRoom(roomName).catch(() => undefined);
    },

    async issueParticipantToken(input) {
      const config = runtimeConfig(settings);
      return {
        roomUrl: config.roomUrl,
        token: await participantToken(config, input),
      };
    },
  };
}
