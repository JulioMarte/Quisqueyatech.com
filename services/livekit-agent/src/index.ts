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
import { errorCode, fetchBounded } from "./http.js";

type Metadata = {
  assessmentId: string;
  sessionKey: string;
  locale: "es" | "en";
  frameworkVersion: string;
  supportId: string;
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
          const response = await fetchBounded(
            `${appUrl}/api/assessment/worker-config`,
            {
              headers: { Authorization: `Bearer ${workerSecret}` },
              cache: "no-store",
            },
            { timeoutMs: 8_000, retries: 1 },
          );
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
    const supportId = metadata.supportId || crypto.randomUUID();
    const telemetry = (
      event: string,
      details: {
        turnId?: string;
        state?: string;
        code?: string;
        durationMs?: number;
        recoverable?: boolean;
      } = {},
    ) => {
      const payload = {
        eventId: crypto.randomUUID(),
        assessmentId: metadata.assessmentId,
        supportId,
        sessionKey: metadata.sessionKey,
        event,
        ...details,
      };
      log(event, { jobId: ctx.job.id, room: ctx.room.name, ...details });
      void fetchBounded(
        `${appUrl}/api/assessment/worker-diagnostic`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${workerSecret}` },
          body: JSON.stringify(payload),
        },
        { timeoutMs: 3_000 },
      ).catch(() => log("telemetry_delivery_failed", { jobId: ctx.job.id, event }));
    };
    const configResponse = await fetchBounded(
      `${appUrl}/api/assessment/worker-config`,
      {
        headers: { Authorization: `Bearer ${workerSecret}` },
        cache: "no-store",
      },
      { timeoutMs: 8_000, retries: 1 },
    );
    if (!configResponse.ok)
      throw new Error(`Worker configuration failed (${configResponse.status})`);
    const runtime = (await configResponse.json()) as WorkerConfig;
    log("configuration_ready", { jobId: ctx.job.id, model: runtime.model });
    const promptResponse = await fetchBounded(
      `${appUrl}/api/assessment/prompt?assessmentId=${encodeURIComponent(metadata.assessmentId)}`,
      { headers: { Authorization: `Bearer ${workerSecret}` } },
      { timeoutMs: 8_000, retries: 1 },
    );
    if (!promptResponse.ok) throw new Error(`Assessment prompt failed (${promptResponse.status})`);
    const prompt = (await promptResponse.json()).prompt as string;
    log("prompt_ready", { jobId: ctx.job.id });
    let completionReason = "livekit-session-ended";
    let closeProgressRecorded = false;
    let finalizeAssessment = false;
    const recordThreshold = (reason: "time-threshold" | "close") =>
      fetchBounded(
        `${appUrl}/api/assessment/progress`,
        {
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
        },
        { timeoutMs: 8_000, retries: 1 },
      );
    const recordCloseOnce = async (reason: string) => {
      if (closeProgressRecorded) return;
      closeProgressRecorded = true;
      completionReason = reason;
      finalizeAssessment = true;
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
        const toolStartedAt = Date.now();
        const eventId = crypto.randomUUID();
        telemetry("tool_started", { state: "update_assessment_state" });
        try {
          const response = await fetchBounded(
            `${appUrl}/api/assessment/progress`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${workerSecret}`,
              },
              body: JSON.stringify({
                assessmentId: metadata.assessmentId,
                sessionKey: metadata.sessionKey,
                eventId,
                locale: metadata.locale,
                reason,
                elapsedSeconds: elapsedSeconds(startedAt),
                updates,
              }),
            },
            { timeoutMs: 5_000, retries: 1 },
          );
          if (!response.ok) throw new Error(`HTTP_${response.status}`);
          const result = (await response.json()) as { nextInstruction?: unknown };
          if (typeof result.nextInstruction !== "string") throw new Error("INVALID_RESPONSE");
          telemetry("tool_completed", {
            state: "update_assessment_state",
            durationMs: Date.now() - toolStartedAt,
          });
          return result.nextInstruction;
        } catch (error) {
          const code =
            errorCode(error) === "tool_timeout"
              ? "tool_timeout"
              : error instanceof Error && /^HTTP_\d+$/.test(error.message)
                ? error.message.toLowerCase()
                : "tool_failed";
          telemetry("tool_failed", {
            state: "update_assessment_state",
            code,
            durationMs: Date.now() - toolStartedAt,
          });
          return metadata.locale === "es"
            ? "No se pudo guardar este turno. No vuelvas a llamar esta herramienta ahora; reconoce brevemente la respuesta y continúa con la siguiente pregunta pendiente."
            : "This turn could not be saved. Do not call this tool again now; briefly acknowledge the answer and continue with the next missing question.";
        }
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
    let currentTurnId: string | undefined;
    let turnStartedAt = 0;
    let stalledTurnId: string | undefined;
    let turnWatchdog: ReturnType<typeof setTimeout> | undefined;
    let recoveryTimer: ReturnType<typeof setTimeout> | undefined;
    let lastAgentState = "initializing";

    const updateAgentMetadata = (state: string, recoveryCode?: string) => {
      void ctx.agent
        ?.updateMetadata(
          JSON.stringify({
            state,
            turnId: currentTurnId,
            recoveryCode,
            occurredAt: Date.now(),
          }),
        )
        .catch(() => log("agent_metadata_failed", { jobId: ctx.job.id, state }));
    };
    const clearTurnTimers = () => {
      if (turnWatchdog) clearTimeout(turnWatchdog);
      if (recoveryTimer) clearTimeout(recoveryTimer);
      turnWatchdog = undefined;
      recoveryTimer = undefined;
    };
    const resolveTurn = () => {
      if (!currentTurnId) return;
      const turnId = currentTurnId;
      telemetry("turn_response", { turnId, durationMs: Date.now() - turnStartedAt });
      if (stalledTurnId === turnId) {
        telemetry("turn_recovered", { turnId, durationMs: Date.now() - turnStartedAt });
        stalledTurnId = undefined;
      }
      clearTurnTimers();
      currentTurnId = undefined;
    };
    const armTurnWatchdog = (turnId: string, delayMs = 12_000) => {
      if (turnWatchdog) clearTimeout(turnWatchdog);
      turnWatchdog = setTimeout(() => {
        if (currentTurnId !== turnId) return;
        stalledTurnId = turnId;
        telemetry("turn_stalled", { turnId, state: lastAgentState, code: "model_stalled" });
        updateAgentMetadata("recovery_required", "model_stalled");
        try {
          session.interrupt({ force: true });
        } catch {
          // There may be no active speech handle even though the model stopped responding.
        }
        recoveryTimer = setTimeout(() => {
          if (stalledTurnId !== turnId) return;
          telemetry("recovery_required", {
            turnId,
            state: lastAgentState,
            code: "recovery_required",
          });
          updateAgentMetadata("recovery_available", "recovery_required");
        }, 18_000);
      }, delayMs);
    };

    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (event) => {
      if (!event.isFinal) return;
      currentTurnId = crypto.randomUUID();
      turnStartedAt = Date.now();
      telemetry("turn_user_final", { turnId: currentTurnId });
      if (lastAgentState === "speaking") resolveTurn();
      else armTurnWatchdog(currentTurnId);
    });
    session.on(voice.AgentSessionEventTypes.AgentStateChanged, (event) => {
      lastAgentState = event.newState;
      telemetry("agent_state", { state: event.newState, turnId: currentTurnId });
      updateAgentMetadata(event.newState);
      if (event.newState === "speaking") resolveTurn();
    });
    session.on(voice.AgentSessionEventTypes.UserStateChanged, (event) => {
      telemetry("user_state", { state: event.newState, turnId: currentTurnId });
    });
    session.on(voice.AgentSessionEventTypes.SpeechCreated, (event) => {
      telemetry("speech_created", { state: event.source, turnId: currentTurnId });
      resolveTurn();
    });
    session.on(voice.AgentSessionEventTypes.FunctionToolsExecuted, (event) => {
      for (const call of event.functionCalls) {
        telemetry("tool_completed", { state: call.name, turnId: currentTurnId });
      }
      if (currentTurnId) armTurnWatchdog(currentTurnId);
    });
    session.on(voice.AgentSessionEventTypes.MetricsCollected, (event) => {
      telemetry("metrics_collected", {
        state: String((event.metrics as { type?: unknown }).type || "agent"),
        turnId: currentTurnId,
      });
    });
    session.on(voice.AgentSessionEventTypes.Error, (event) => {
      clearTurnTimers();
      const recoverable = Boolean(event.error.recoverable);
      telemetry("model_error", {
        turnId: currentTurnId,
        state: lastAgentState,
        code: "model_error",
        recoverable,
      });
      if (!recoverable) {
        finalizeAssessment = false;
        completionReason = "model-error";
        updateAgentMetadata("recovery_available", "model_error");
      }
    });
    session.on(voice.AgentSessionEventTypes.Close, (event) => {
      clearTurnTimers();
      const reason = String(event.reason || "session-closed");
      if (!closeProgressRecorded) {
        finalizeAssessment = false;
        completionReason = reason;
      }
      telemetry("session_closed", {
        state: lastAgentState,
        code: event.error ? "model_error" : reason.slice(0, 80),
        recoverable: event.error ? Boolean(event.error.recoverable) : undefined,
      });
    });
    const timers = [
      setTimeout(() => {
        void recordThreshold("time-threshold").catch((error) =>
          log("threshold_failed", { jobId: ctx.job.id, code: errorCode(error) }),
        );
      }, 300_000),
      setTimeout(() => {
        void recordThreshold("time-threshold").catch((error) =>
          log("threshold_failed", { jobId: ctx.job.id, code: errorCode(error) }),
        );
      }, 600_000),
      setTimeout(() => {
        void recordThreshold("time-threshold").catch((error) =>
          log("threshold_failed", { jobId: ctx.job.id, code: errorCode(error) }),
        );
      }, 780_000),
      setTimeout(() => {
        void recordThreshold("time-threshold").catch((error) =>
          log("threshold_failed", { jobId: ctx.job.id, code: errorCode(error) }),
        );
      }, 870_000),
      setTimeout(() => {
        void recordCloseOnce("hard-time-limit").finally(() => ctx.shutdown("hard-time-limit"));
      }, 900_000),
    ];

    ctx.addShutdownCallback(async () => {
      timers.forEach(clearTimeout);
      clearTurnTimers();
      const report = voice.sessionReportToJSON(ctx.makeSessionReport(session));
      const response = await fetchBounded(
        `${appUrl}/api/assessment/provider-finalize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${workerSecret}`,
          },
          body: JSON.stringify({
            assessmentId: metadata.assessmentId,
            sessionKey: metadata.sessionKey,
            provider: "livekit",
            transcript: JSON.stringify(report.chatHistory),
            sessionReport: report,
            durationSeconds: elapsedSeconds(startedAt),
            completionReason,
            finalizeAssessment,
          }),
        },
        { timeoutMs: 10_000, retries: 1 },
      );
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
      record: { audio: false, transcript: false, traces: true, logs: true },
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
