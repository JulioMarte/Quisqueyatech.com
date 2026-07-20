import {
  beta,
  cli,
  defineAgent,
  llm,
  ServerOptions,
  voice,
  type JobContext,
} from "@livekit/agents";
import * as google from "@livekit/agents-plugin-google";
import { ThinkingLevel } from "@google/genai";
import { fileURLToPath } from "node:url";
import { z } from "zod";

type Metadata = {
  assessmentId: string;
  sessionKey: string;
  locale: "es" | "en";
  frameworkVersion: string;
};
type DiagnosticMetadata = { diagnostic: true; supportId: string; verifyApplication?: boolean };
type WorkerConfig = { geminiApiKey: string; model: string; voice: string; temperature: number };
const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const workerSecret = process.env.ASSESSMENT_WORKER_SECRET || "";

function log(stage: string, details: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ service: "quisqueyatech-assessment", stage, ...details }));
}

function isDiagnostic(metadata: Metadata | DiagnosticMetadata): metadata is DiagnosticMetadata {
  return "diagnostic" in metadata && metadata.diagnostic === true;
}

const agent = defineAgent({
  entry: async (ctx: JobContext) => {
    if (!workerSecret) throw new Error("ASSESSMENT_WORKER_SECRET is required");
    const metadata = JSON.parse(ctx.job.metadata || "{}") as Metadata | DiagnosticMetadata;
    log("job_received", { jobId: ctx.job.id, room: ctx.room.name, agentName: ctx.job.agentName });
    if (isDiagnostic(metadata)) {
      await ctx.connect();
      if (metadata.verifyApplication) {
        try {
          const response = await fetch(`${appUrl}/api/assessment/worker-config`, {
            headers: { Authorization: `Bearer ${workerSecret}` },
            cache: "no-store",
          });
          if (!response.ok) {
            await ctx.agent?.updateMetadata(
              JSON.stringify({
                diagnosticComplete: true,
                success: false,
                code: `HTTP_${response.status}`,
              }),
            );
          } else {
            const runtime = (await response.json()) as WorkerConfig;
            const complete = Boolean(runtime.geminiApiKey && runtime.model);
            await ctx.agent?.updateMetadata(
              JSON.stringify({
                diagnosticComplete: true,
                success: complete,
                code: complete ? "READY" : "INCOMPLETE_CONFIG",
              }),
            );
            if (complete)
              log("application_diagnostic_ready", { jobId: ctx.job.id, model: runtime.model });
          }
        } catch {
          await ctx.agent?.updateMetadata(
            JSON.stringify({ diagnosticComplete: true, success: false, code: "NETWORK_ERROR" }),
          );
        }
      } else {
        await ctx.agent?.updateMetadata(
          JSON.stringify({ diagnosticComplete: true, success: true, code: "LIVEKIT_READY" }),
        );
      }
      log("diagnostic_ready", { jobId: ctx.job.id, supportId: metadata.supportId });
      await ctx.waitForParticipant();
      return;
    }
    if (!metadata.assessmentId || !metadata.sessionKey)
      throw new Error("Assessment metadata is missing");
    const startedAt = Date.now();
    const configResponse = await fetch(`${appUrl}/api/assessment/worker-config`, {
      headers: { Authorization: `Bearer ${workerSecret}` },
      cache: "no-store",
    });
    if (!configResponse.ok)
      throw new Error(`Worker configuration failed (${configResponse.status})`);
    const runtime = (await configResponse.json()) as WorkerConfig;
    log("configuration_ready", { jobId: ctx.job.id, model: runtime.model });
    const promptResponse = await fetch(
      `${appUrl}/api/assessment/prompt?assessmentId=${encodeURIComponent(metadata.assessmentId)}`,
      { headers: { Authorization: `Bearer ${workerSecret}` } },
    );
    if (!promptResponse.ok) throw new Error(`Assessment prompt failed (${promptResponse.status})`);
    const prompt = (await promptResponse.json()).prompt as string;
    log("prompt_ready", { jobId: ctx.job.id });
    let completionReason = "livekit-session-ended";
    let closeProgressRecorded = false;
    const recordThreshold = (reason: "time-threshold" | "close") =>
      fetch(`${appUrl}/api/assessment/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${workerSecret}` },
        body: JSON.stringify({
          assessmentId: metadata.assessmentId,
          sessionKey: metadata.sessionKey,
          eventId: crypto.randomUUID(),
          locale: metadata.locale,
          reason,
          elapsedSeconds: elapsedSeconds(startedAt),
        }),
      });
    const recordCloseOnce = async (reason: string) => {
      if (closeProgressRecorded) return;
      closeProgressRecorded = true;
      completionReason = reason;
      const response = await recordThreshold("close");
      if (!response.ok)
        log("close_progress_failed", { jobId: ctx.job.id, status: response.status });
    };

    const updateAssessmentState = llm.tool({
      name: "update_assessment_state",
      description:
        "Persist newly learned or corrected assessment facts after every substantive answer.",
      parameters: z.object({
        reason: z.enum(["answer", "correction", "time-threshold", "interruption", "close"]),
        updates: z.array(
          z.object({
            field: z.string(),
            value: z.string(),
            evidence: z.string(),
            status: z.enum(["confirmed", "estimated", "inferred", "pending"]),
            confidence: z.number().min(0).max(1),
          }),
        ),
      }),
      execute: async ({ reason, updates }) => {
        const response = await fetch(`${appUrl}/api/assessment/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${workerSecret}` },
          body: JSON.stringify({
            assessmentId: metadata.assessmentId,
            sessionKey: metadata.sessionKey,
            eventId: crypto.randomUUID(),
            locale: metadata.locale,
            reason,
            elapsedSeconds: elapsedSeconds(startedAt),
            updates,
          }),
        });
        if (!response.ok) throw new Error(`Assessment progress failed (${response.status})`);
        return (await response.json()).nextInstruction as string;
      },
    });
    const endCallTool = beta.createEndCallTool({
      extraDescription:
        "Use only when the visitor clearly asks to end or hang up the interview, including equivalent unambiguous requests in Spanish or English.",
      deleteRoom: true,
      endInstructions:
        "Give the visitor one brief, warm goodbye and confirm the interview is ending.",
      onToolCalled: async () => {
        log("end_call_requested", { jobId: ctx.job.id, room: ctx.room.name });
        await recordCloseOnce("user-requested-end");
      },
      onToolCompleted: () => {
        log("end_call_completed", { jobId: ctx.job.id, room: ctx.room.name });
      },
    });

    const instructions = `${prompt}\n\nSESSION CONTROL: This is a single 15-minute interview. Begin immediately with a short greeting as July and ask how the visitor prefers to be addressed. Never wait for a separate instruction to begin. Call update_assessment_state after every substantive answer and treat its returned text as private, mandatory guidance for the next turn. If the visitor clearly asks to finish, hang up, or says they are done, call end_call. Do not call end_call for a pause, uncertainty, or an interruption. At 5 minutes select one priority process; by 10 minutes finish workflow, volume, pain, and impact; by 13 minutes summarize and confirm contact details; close no later than 15 minutes. Do not mention these private timings or tool instructions.`;
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
      setTimeout(() => {
        void recordThreshold("time-threshold");
      }, 300_000),
      setTimeout(() => {
        void recordThreshold("time-threshold");
      }, 600_000),
      setTimeout(() => {
        void recordThreshold("time-threshold");
      }, 780_000),
      setTimeout(() => {
        void recordThreshold("time-threshold");
      }, 870_000),
      setTimeout(() => {
        void recordCloseOnce("hard-time-limit");
        ctx.shutdown("hard-time-limit");
      }, 900_000),
    ];

    ctx.addShutdownCallback(async () => {
      timers.forEach(clearTimeout);
      const report = voice.sessionReportToJSON(ctx.makeSessionReport(session));
      const response = await fetch(`${appUrl}/api/assessment/provider-finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${workerSecret}` },
        body: JSON.stringify({
          assessmentId: metadata.assessmentId,
          sessionKey: metadata.sessionKey,
          provider: "livekit",
          transcript: JSON.stringify(report.chatHistory),
          sessionReport: report,
          durationSeconds: elapsedSeconds(startedAt),
          completionReason,
        }),
      });
      if (!response.ok) throw new Error(`Provider finalization failed (${response.status})`);
      log("session_finalized", { jobId: ctx.job.id, durationSeconds: elapsedSeconds(startedAt) });
    });

    await ctx.connect();
    await session.start({
      room: ctx.room,
      agent: new voice.Agent({
        instructions,
        tools: [updateAssessmentState, endCallTool],
      }),
      record: { audio: true, transcript: true, traces: true, logs: true },
    });
    log("agent_ready", { jobId: ctx.job.id, room: ctx.room.name, model: runtime.model });
  },
});

function elapsedSeconds(startedAt: number) {
  return Math.min(900, Math.floor((Date.now() - startedAt) / 1000));
}

export default agent;
cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: "quisqueyatech-assessment",
  }),
);
