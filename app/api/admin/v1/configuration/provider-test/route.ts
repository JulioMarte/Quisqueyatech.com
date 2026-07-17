import { GoogleGenAI } from "@google/genai";
import { AccessToken } from "livekit-server-sdk";
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
import { requestExternalSafely } from "@/lib/server/secure-config";

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
    const livekitUrl = new URL(String(config.livekitUrl));
    livekitUrl.protocol = "https:";
    livekitUrl.pathname = "/twirp/livekit.RoomService/ListRooms";
    livekitUrl.search = "";
    const token = new AccessToken(String(config.livekitApiKey), String(config.livekitApiSecret));
    token.addGrant({ roomList: true });
    const result = await requestExternalSafely(livekitUrl.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await token.toJwt()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ names: [] }),
    });
    if (!result.success)
      return adminFailure(
        trace,
        `LiveKit rechazó la prueba (${result.error || "UPSTREAM_ERROR"}).`,
        502,
        "UPSTREAM_ERROR",
      );
    return adminJson(trace, {
      provider: parsed.data.provider,
      success: true,
      statusCode: result.statusCode,
      durationMs: result.durationMs,
    });
  } catch (error) {
    return adminException(trace, "configuration.provider-test", error);
  }
}
