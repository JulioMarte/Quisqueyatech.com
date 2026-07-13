import "server-only";
import { AccessToken } from "livekit-server-sdk";
import type { AssessmentIntake } from "@/lib/validations/assessment";

export type VoiceProviderName = "ultravox" | "livekit" | "demo";
export type VoiceSession = { provider: VoiceProviderName; assessmentId: string; joinUrl?: string; roomUrl?: string; token?: string; notice?: string };

export interface VoiceAssessmentProvider {
  createSession(intake: AssessmentIntake, assessmentId: string): Promise<VoiceSession>;
}

export function assessmentPrompt(locale: "es" | "en", name: string) {
  return locale === "es"
    ? `Eres el agente de evaluación de QuisqueyaTech. Habla en español claro y profesional con ${name}. Tu tarea es realizar un levantamiento de máximo 15 minutos, no vender ni prometer resultados. Pregunta, una cosa a la vez, por: contexto de la empresa, proceso que más tiempo consume, herramientas actuales, volumen, pasos manuales, errores o demoras, impacto, restricciones y resultado deseado. Resume para confirmar. No recomiendes marcas específicas. Antes de terminar explica que el resultado es preliminar y llama a la herramienta finalizar_evaluacion con un resumen estructurado.`
    : `You are the QuisqueyaTech assessment agent. Speak clear, professional English with ${name}. Run a discovery session of no more than 15 minutes. Do not sell or promise outcomes. Ask one question at a time about company context, the most time-consuming process, current tools, volume, manual steps, errors or delays, impact, constraints, and desired outcome. Confirm your summary. Do not recommend specific brands. Explain that results are preliminary and call the finalizar_evaluacion tool with a structured summary before ending.`;
}

class UltravoxProvider implements VoiceAssessmentProvider {
  async createSession(intake: AssessmentIntake, assessmentId: string): Promise<VoiceSession> {
    const apiKey = process.env.ULTRAVOX_API_KEY;
    if (!apiKey) return demoSession(assessmentId, "Ultravox is ready for an API key.");
    const response = await fetch(process.env.ULTRAVOX_API_URL || "https://api.ultravox.ai/api/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify({
        systemPrompt: assessmentPrompt(intake.locale, intake.firstName),
        model: process.env.ULTRAVOX_MODEL || undefined,
        voice: process.env.ULTRAVOX_VOICE || undefined,
        temperature: 0.3,
        maxDuration: "900s",
        recordingEnabled: true,
        metadata: { assessmentId, locale: intake.locale },
      }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Ultravox call creation failed (${response.status})`);
    const result = (await response.json()) as { joinUrl: string };
    return { provider: "ultravox", assessmentId, joinUrl: result.joinUrl };
  }
}

class LiveKitProvider implements VoiceAssessmentProvider {
  async createSession(intake: AssessmentIntake, assessmentId: string): Promise<VoiceSession> {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const roomUrl = process.env.LIVEKIT_URL;
    if (!apiKey || !apiSecret || !roomUrl) return demoSession(assessmentId, "LiveKit is ready for cloud credentials and an agent worker.");
    const roomName = `assessment-${assessmentId}`;
    const token = new AccessToken(apiKey, apiSecret, { identity: `lead-${assessmentId}`, name: `${intake.firstName} ${intake.lastName}`, metadata: JSON.stringify({ assessmentId, locale: intake.locale }) });
    token.addGrant({ room: roomName, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true });
    return { provider: "livekit", assessmentId, roomUrl, token: await token.toJwt() };
  }
}

function demoSession(assessmentId: string, notice: string): VoiceSession { return { provider: "demo", assessmentId, notice }; }

export function getVoiceProvider(): VoiceAssessmentProvider {
  return process.env.VOICE_PROVIDER === "livekit" ? new LiveKitProvider() : new UltravoxProvider();
}
