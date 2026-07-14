import "server-only";
import { GoogleGenAI, Modality } from "@google/genai";
import { AccessToken } from "livekit-server-sdk";
import type {
  AssessmentContext,
  NormalizedVoiceEvent,
  ProviderSession,
  TranscriptTurn,
  VoiceProviderAdapter,
  VoiceProviderId,
  VoiceStartSession,
} from "@/lib/assessment/types";

export const interviewFrameworkVersion = "2026-07-v1";

export function assessmentPrompt(locale: "es" | "en", name: string, resumeSummary?: string) {
  const resume = resumeSummary ? `\nCONTEXTO CONFIRMADO DE UNA SESIÓN ANTERIOR:\n${resumeSummary}\nRetoma desde el primer dato pendiente, sin pedir que repita lo confirmado.` : "";
  return locale === "es"
    ? `Eres July (pronunciado Ju-li), la agente virtual de levantamiento de QuisqueyaTech. Habla en español claro, cálido y profesional con ${name}. Identifícate siempre como agente virtual; nunca finjas ser humana.

OBJETIVO: producir una ficha verificable de un único proceso prioritario en un máximo de 15 minutos. No vendas, no agendes y no prometas soluciones. Haz exactamente una pregunta por turno. Refleja brevemente lo escuchado y profundiza hasta dos veces cuando una respuesta sea vaga; después acepta un rango o marca el dato pendiente.

ORDEN: identidad y contacto; contexto y procesos candidatos; proceso prioritario; flujo actual; volumen, dolor e impacto; resultado deseado y restricciones; resumen y confirmación. Confirma correo y teléfono repitiéndolos por partes. No solicites pacientes, contraseñas, tarjetas ni datos identificables: detén cortésmente esos detalles y pide métricas agregadas o ejemplos anónimos.

Cada vez que obtengas o corrijas información útil llama update_assessment_state antes de la siguiente pregunta. Sigue la instrucción privada devuelta por la herramienta. Al cerrar, explica que un reporte revisado llegará por correo dentro de un día laborable.${resume}`
    : `You are July (pronounced Ju-li), QuisqueyaTech's virtual discovery agent. Speak clear, warm, professional English with ${name}. Always identify yourself as a virtual agent; never pretend to be human.

GOAL: create a verifiable brief for one priority process within 15 minutes. Do not sell, schedule, or promise solutions. Ask exactly one question per turn. Briefly reflect what you heard and probe vague answers at most twice; then accept a range or mark the fact pending.

ORDER: identity and contact; context and candidate processes; priority process; current workflow; volume, pain, and impact; desired outcome and constraints; summary and confirmation. Confirm email and phone by repeating them in chunks. Never request patient data, passwords, cards, or identifying sensitive information: stop those details and ask for aggregate metrics or anonymized examples.

Whenever useful information is obtained or corrected, call update_assessment_state before the next question. Follow the private instruction returned by the tool. At closing, explain that a reviewed report will arrive by email within one business day.${resumeSummary ? `\nCONFIRMED CONTEXT FROM A PREVIOUS SESSION:\n${resumeSummary}\nResume at the first missing fact without asking the user to repeat confirmed facts.` : ""}`;
}

const progressTool = {
  temporaryTool: {
    modelToolName: "update_assessment_state",
    description: "Persist newly learned or corrected assessment facts. Call after every substantive user answer and follow the returned private next-step instruction.",
    dynamicParameters: [
      { name: "reason", location: "PARAMETER_LOCATION_BODY", schema: { type: "string", enum: ["answer", "correction", "interruption", "close"] }, required: true },
      { name: "updates", location: "PARAMETER_LOCATION_BODY", schema: { type: "array", items: { type: "object", properties: { field: { type: "string" }, value: { type: "string" }, evidence: { type: "string" }, status: { type: "string", enum: ["confirmed", "estimated", "inferred", "pending"] }, confidence: { type: "number" } }, required: ["field", "value", "evidence", "status", "confidence"] } }, required: true },
    ],
    client: {},
  },
};

abstract class BaseAdapter implements VoiceProviderAdapter {
  abstract readonly id: VoiceProviderId;
  abstract createSession(context: AssessmentContext): Promise<ProviderSession>;
  async sendGuidance() { throw new Error(`${this.id} does not support server-side guidance`); }
  async endSession() { throw new Error(`${this.id} does not support server-side termination`); }
  async getCanonicalTranscript(): Promise<TranscriptTurn[]> { throw new Error(`${this.id} does not expose a canonical transcript through this adapter`); }
  normalizeLifecycleEvent(payload: unknown): NormalizedVoiceEvent {
    const value = typeof payload === "object" && payload ? payload as Record<string, unknown> : {};
    const event = String(value.event || value.type || "").toLowerCase();
    const type = event.includes("error") || event.includes("fail") ? "error" : event.includes("end") || event.includes("disconnect") ? "ended" : event.includes("join") || event.includes("connect") ? "joined" : "started";
    return { type, providerSessionId: String(value.callId || value.id || "") || undefined, reason: typeof value.reason === "string" ? value.reason : undefined, occurredAt: Date.now() };
  }
}

class UltravoxAdapter extends BaseAdapter {
  readonly id = "ultravox" as const;
  async createSession(context: AssessmentContext): Promise<ProviderSession> {
    const response = await fetch(process.env.ULTRAVOX_API_URL || "https://api.ultravox.ai/api/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": process.env.ULTRAVOX_API_KEY! },
      body: JSON.stringify({
        systemPrompt: assessmentPrompt(context.locale, context.name, context.resumeSummary),
        model: process.env.ULTRAVOX_MODEL || undefined,
        voice: process.env.ULTRAVOX_VOICE || undefined,
        temperature: 0.3,
        maxDuration: "900s",
        timeExceededMessage: context.locale === "es" ? "Hemos llegado al límite de tiempo. Gracias; recibirás tu reporte revisado por correo." : "We have reached the time limit. Thank you; your reviewed report will arrive by email.",
        inactivityMessages: [{ duration: "25s", message: context.locale === "es" ? "¿Sigues ahí? Tómate tu tiempo." : "Are you still there? Take your time." }, { duration: "35s", message: context.locale === "es" ? "Podemos retomar durante las próximas 24 horas. Cerraré por ahora." : "You can resume within 24 hours. I will close for now.", endBehavior: "END_BEHAVIOR_HANG_UP_SOFT" }],
        selectedTools: [progressTool, { toolName: "hangUp" }],
        recordingEnabled: true,
        languageHint: context.locale,
        firstSpeakerSettings: { agent: {} },
        metadata: { assessmentId: context.assessmentId, sessionKey: context.sessionKey, locale: context.locale, frameworkVersion: interviewFrameworkVersion },
      }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Ultravox call creation failed (${response.status})`);
    const result = await response.json() as { callId: string; joinUrl: string };
    return { provider: "ultravox", assessmentId: context.assessmentId, callId: result.callId, joinUrl: result.joinUrl };
  }
}

class LiveKitAdapter extends BaseAdapter {
  readonly id = "livekit" as const;
  async createSession(context: AssessmentContext): Promise<ProviderSession> {
    const roomName = `assessment-${context.assessmentId}`;
    const token = new AccessToken(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!, { identity: `lead-${context.assessmentId}`, name: context.name, metadata: JSON.stringify({ assessmentId: context.assessmentId, sessionKey: context.sessionKey, locale: context.locale, frameworkVersion: interviewFrameworkVersion }) });
    token.addGrant({ room: roomName, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true });
    return { provider: "livekit", assessmentId: context.assessmentId, roomUrl: process.env.LIVEKIT_URL!, token: await token.toJwt(), roomName };
  }
}

class GeminiLiveAdapter extends BaseAdapter {
  readonly id = "gemini-live" as const;
  async createSession(context: AssessmentContext): Promise<ProviderSession> {
    const model = process.env.GEMINI_LIVE_MODEL || "gemini-2.5-flash-native-audio-preview-12-2025";
    const systemInstruction = assessmentPrompt(context.locale, context.name, context.resumeSummary);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!, httpOptions: { apiVersion: "v1alpha" } });
    const token = await ai.authTokens.create({ config: { uses: 1, expireTime: new Date(Date.now() + 20 * 60_000).toISOString(), newSessionExpireTime: new Date(Date.now() + 60_000).toISOString(), liveConnectConstraints: { model, config: { responseModalities: [Modality.AUDIO], sessionResumption: {} } } } });
    if (!token.name) throw new Error("Gemini did not return an ephemeral token");
    return { provider: "gemini-live", assessmentId: context.assessmentId, ephemeralToken: token.name, model, sessionConfig: { responseModalities: ["AUDIO"], language: context.locale, systemInstruction } };
  }
}

const adapters: Record<VoiceProviderId, VoiceProviderAdapter> = { ultravox: new UltravoxAdapter(), livekit: new LiveKitAdapter(), "gemini-live": new GeminiLiveAdapter() };

export function providerConfigured(provider: VoiceProviderId) {
  if (provider === "ultravox") return Boolean(process.env.ULTRAVOX_API_KEY && (process.env.NODE_ENV !== "production" || process.env.ULTRAVOX_WEBHOOK_SECRET));
  if (provider === "livekit") return Boolean(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET && process.env.LIVEKIT_URL && process.env.ASSESSMENT_WORKER_SECRET);
  return Boolean(process.env.GEMINI_API_KEY && (process.env.NODE_ENV !== "production" || process.env.GEMINI_LIVE_MODEL));
}

export function getVoiceProvider(provider: VoiceProviderId): VoiceProviderAdapter { return adapters[provider]; }

export async function createVoiceSession(provider: VoiceProviderId, context: AssessmentContext): Promise<VoiceStartSession> {
  if (!providerConfigured(provider)) {
    if (process.env.NODE_ENV === "production") throw new Error(`${provider} is not fully configured`);
    return { provider: "demo", assessmentId: context.assessmentId, notice: `${provider} is ready for credentials.` };
  }
  return getVoiceProvider(provider).createSession(context);
}
