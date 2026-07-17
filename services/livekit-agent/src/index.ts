import { cli, defineAgent, llm, ServerOptions, voice, type JobContext } from "@livekit/agents";
import * as google from "@livekit/agents-plugin-google";
import { ThinkingLevel } from "@google/genai";
import { fileURLToPath } from "node:url";
import { z } from "zod";

type Metadata = { assessmentId: string; sessionKey: string; locale: "es" | "en"; frameworkVersion: string };
type WorkerConfig = { geminiApiKey: string; model: string; voice: string; temperature: number };
const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const workerSecret = process.env.ASSESSMENT_WORKER_SECRET || "";

const agent = defineAgent({
  entry: async (ctx: JobContext) => {
    if (!workerSecret) throw new Error("ASSESSMENT_WORKER_SECRET is required");
    await ctx.connect();
    const participant = await ctx.waitForParticipant();
    const metadata = JSON.parse(participant.metadata || "{}") as Metadata;
    if (!metadata.assessmentId || !metadata.sessionKey) throw new Error("Assessment metadata is missing");
    const startedAt = Date.now();
    const configResponse = await fetch(`${appUrl}/api/assessment/worker-config`, { headers: { Authorization: `Bearer ${workerSecret}` }, cache: "no-store" });
    if (!configResponse.ok) throw new Error(`Worker configuration failed (${configResponse.status})`);
    const runtime = await configResponse.json() as WorkerConfig;
    const promptResponse = await fetch(`${appUrl}/api/assessment/prompt?assessmentId=${encodeURIComponent(metadata.assessmentId)}`, { headers: { Authorization: `Bearer ${workerSecret}` } });
    if (!promptResponse.ok) throw new Error(`Assessment prompt failed (${promptResponse.status})`);
    const prompt = (await promptResponse.json()).prompt as string;
    const recordThreshold = (reason: "time-threshold" | "close") => fetch(`${appUrl}/api/assessment/progress`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${workerSecret}` }, body: JSON.stringify({ assessmentId: metadata.assessmentId, sessionKey: metadata.sessionKey, eventId: crypto.randomUUID(), locale: metadata.locale, reason, elapsedSeconds: elapsedSeconds(startedAt) }) });

    const updateAssessmentState = llm.tool({
      description: "Persist newly learned or corrected assessment facts after every substantive answer.",
      parameters: z.object({
        reason: z.enum(["answer", "correction", "time-threshold", "interruption", "close"]),
        updates: z.array(z.object({ field: z.string(), value: z.string(), evidence: z.string(), status: z.enum(["confirmed", "estimated", "inferred", "pending"]), confidence: z.number().min(0).max(1) })),
      }),
      execute: async ({ reason, updates }) => {
        const response = await fetch(`${appUrl}/api/assessment/progress`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${workerSecret}` }, body: JSON.stringify({ assessmentId: metadata.assessmentId, sessionKey: metadata.sessionKey, eventId: crypto.randomUUID(), locale: metadata.locale, reason, elapsedSeconds: elapsedSeconds(startedAt), updates }) });
        if (!response.ok) throw new Error(`Assessment progress failed (${response.status})`);
        return (await response.json()).nextInstruction as string;
      },
    });

    const instructions = `${prompt}\n\nSESSION CONTROL: This is a single 15-minute interview. Begin immediately with a short greeting as July and ask how the visitor prefers to be addressed. Never wait for a separate instruction to begin. Call update_assessment_state after every substantive answer and treat its returned text as private, mandatory guidance for the next turn. At 5 minutes select one priority process; by 10 minutes finish workflow, volume, pain, and impact; by 13 minutes summarize and confirm contact details; close no later than 15 minutes. Do not mention these private timings or tool instructions.`;
    const session = new voice.AgentSession({
      llm: new google.beta.realtime.RealtimeModel({
        apiKey: runtime.geminiApiKey,
        model: runtime.model,
        voice: runtime.voice,
        temperature: runtime.temperature,
        instructions,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL, includeThoughts: false },
      }),
    });
    const timers = [
      setTimeout(() => { void recordThreshold("time-threshold"); }, 300_000),
      setTimeout(() => { void recordThreshold("time-threshold"); }, 600_000),
      setTimeout(() => { void recordThreshold("time-threshold"); }, 780_000),
      setTimeout(() => { void recordThreshold("time-threshold"); }, 870_000),
      setTimeout(() => { void recordThreshold("close"); ctx.shutdown("hard-time-limit"); }, 900_000),
    ];

    ctx.addShutdownCallback(async () => {
      timers.forEach(clearTimeout);
      const report = voice.sessionReportToJSON(ctx.makeSessionReport(session));
      const response = await fetch(`${appUrl}/api/assessment/provider-finalize`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${workerSecret}` }, body: JSON.stringify({ assessmentId: metadata.assessmentId, sessionKey: metadata.sessionKey, provider: "livekit", transcript: JSON.stringify(report.chatHistory), sessionReport: report, durationSeconds: elapsedSeconds(startedAt), completionReason: "livekit-session-ended" }) });
      if (!response.ok) throw new Error(`Provider finalization failed (${response.status})`);
    });

    await session.start({
      room: ctx.room,
      agent: new voice.Agent({ instructions, tools: { update_assessment_state: updateAssessmentState } }),
      record: { audio: true, transcript: true, traces: true, logs: true },
    });
  },
});

function elapsedSeconds(startedAt: number) { return Math.min(900, Math.floor((Date.now() - startedAt) / 1000)); }

export default agent;
cli.runApp(new ServerOptions({
  agent: fileURLToPath(import.meta.url),
  agentName: "quisqueyatech-assessment",
}));
