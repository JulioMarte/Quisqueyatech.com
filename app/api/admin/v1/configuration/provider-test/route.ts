import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import {
  adminException,
  adminFailure,
  adminJson,
  authorizeContentRequest,
  readAdminJson,
  requestId,
} from "@/lib/server/admin-content";
import { runtimeConfig } from "@/lib/server/runtime-config";
import { LiveKitDispatchError } from "@/lib/livekit/dispatch-core";
import { probeLiveKitAgent } from "@/lib/server/livekit";

const requestSchema = z.object({ provider: z.enum(["livekit", "gemini-live"]) }).strict();

export async function POST(request: Request) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(trace, "Unauthorized", 401);
    const parsed = requestSchema.safeParse(await readAdminJson(request, 2_048));
    if (!parsed.success) return adminFailure(trace, "Proveedor no válido.", 400);
    const config = await runtimeConfig();
    const startedAt = Date.now();

    if (parsed.data.provider === "gemini-live") {
      if (!config.geminiApiKey)
        return adminFailure(
          trace,
          "Gemini no tiene una API key configurada.",
          503,
          "CONFIGURATION_ERROR",
        );
      const model = String(config.geminiLiveModel || "gemini-3.1-flash-live-preview");
      await new GoogleGenAI({ apiKey: String(config.geminiApiKey) }).models.get({ model });
      return adminJson(trace, {
        provider: parsed.data.provider,
        success: true,
        durationMs: Date.now() - startedAt,
      });
    }

    if (!config.livekitUrl || !config.livekitApiKey || !config.livekitApiSecret)
      return adminFailure(
        trace,
        "LiveKit no está configurado completamente.",
        503,
        "CONFIGURATION_ERROR",
      );
    try {
      const result = await probeLiveKitAgent(config, trace);
      return adminJson(trace, { provider: parsed.data.provider, ...result });
    } catch (error) {
      if (error instanceof LiveKitDispatchError)
        return adminFailure(
          trace,
          `El agente LiveKit no estuvo disponible (${error.code}). Soporte: ${error.supportId}`,
          502,
          "UPSTREAM_ERROR",
        );
      throw error;
    }
  } catch (error) {
    return adminException(trace, "configuration.provider-test", error);
  }
}
