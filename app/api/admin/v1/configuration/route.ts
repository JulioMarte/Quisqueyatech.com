import { z } from "zod";
import { api } from "@/convex/_generated/api";
import {
  adminException,
  adminFailure,
  adminJson,
  authorizeContentRequest,
  readAdminJson,
  requestId,
} from "@/lib/server/admin-content";
import { fetchAuthMutation } from "@/lib/server/auth-server";
import { encryptSetting, maskLastFour, resolveSafeExternalUrl } from "@/lib/server/secure-config";
import { runtimeConfig } from "@/lib/server/runtime-config";

const optionalText = (maximum: number) => z.string().trim().max(maximum).optional();
const configurationSchema = z
  .object({
    defaultProvider: z.enum(["ultravox", "livekit", "gemini-live"]).optional(),
    ultravoxApiUrl: optionalText(2_048),
    ultravoxModel: optionalText(200),
    ultravoxVoice: optionalText(200),
    livekitUrl: optionalText(2_048),
    geminiLiveModel: optionalText(200),
    geminiLiveVoice: optionalText(200),
    webhookEnabled: z.boolean().optional(),
    webhookUrl: optionalText(2_048),
  })
  .strict();

const secretsSchema = z
  .object({
    ultravoxApiKey: optionalText(8_192),
    ultravoxWebhookSecret: optionalText(8_192),
    livekitApiKey: optionalText(8_192),
    livekitApiSecret: optionalText(8_192),
    geminiApiKey: optionalText(8_192),
    webhookSecret: optionalText(8_192),
  })
  .strict();

const updateSchema = z
  .object({ config: configurationSchema, secrets: secretsSchema.optional().default({}) })
  .strict();

export async function GET(request: Request) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(trace, "Unauthorized", 401);
    const runtime = await runtimeConfig();
    return adminJson(trace, {
      source: "convex-env",
      readOnly: true,
      config: {
        defaultProvider: "livekit",
        ultravoxApiUrl: runtime.ultravoxApiUrl,
        ultravoxModel: runtime.ultravoxModel,
        ultravoxVoice: runtime.ultravoxVoice,
        livekitUrl: runtime.livekitUrl,
        geminiLiveModel: runtime.geminiLiveModel,
        geminiLiveVoice: runtime.geminiLiveVoice,
      },
      secrets: Object.fromEntries(
        [
          "ultravoxApiKey",
          "ultravoxWebhookSecret",
          "livekitApiKey",
          "livekitApiSecret",
          "geminiApiKey",
          "webhookSecret",
        ].map((key) => {
          const value = typeof runtime[key] === "string" ? String(runtime[key]) : "";
          return [key, { configured: Boolean(value), lastFour: value ? value.slice(-4) : "" }];
        }),
      ),
    });
  } catch (error) {
    return adminException(trace, "configuration.get", error);
  }
}

export async function PUT(request: Request) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(trace, "Unauthorized", 401);
    if (process.env.RUNTIME_CONFIG_SOURCE !== "legacy-encrypted-settings") {
      return adminFailure(
        trace,
        "La configuración es de solo lectura. Actualiza las variables del deployment en Convex.",
        409,
      );
    }
    const parsed = updateSchema.safeParse(await readAdminJson(request, 64_000));
    if (!parsed.success)
      return adminFailure(trace, parsed.error.issues[0]?.message || "Invalid configuration", 400);
    const config = {
      ...parsed.data.config,
      defaultProvider: "livekit" as const,
      geminiLiveModel: parsed.data.config.geminiLiveModel || "gemini-3.1-flash-live-preview",
      geminiLiveVoice: parsed.data.config.geminiLiveVoice || "Aoede",
    };
    for (const key of ["webhookUrl", "ultravoxApiUrl"] as const) {
      if (!config[key]) continue;
      try {
        config[key] = (await resolveSafeExternalUrl(config[key])).url;
      } catch {
        return adminFailure(trace, `${key} no apunta a un destino público permitido.`, 400);
      }
    }
    if (config.livekitUrl) {
      try {
        const livekit = new URL(config.livekitUrl);
        if (!["wss:", "https:"].includes(livekit.protocol))
          throw new Error("Invalid LiveKit protocol");
        const probe = new URL(livekit);
        probe.protocol = "https:";
        await resolveSafeExternalUrl(probe.toString());
        config.livekitUrl = livekit.toString();
      } catch {
        return adminFailure(
          trace,
          "livekitUrl no apunta a un destino público WSS/HTTPS permitido.",
          400,
        );
      }
    }
    if (config.webhookEnabled && !config.webhookUrl)
      return adminFailure(
        trace,
        "La URL del webhook es obligatoria cuando las entregas están activas.",
        400,
      );
    const secrets = Object.entries(parsed.data.secrets)
      .filter(
        (entry): entry is [string, string] => typeof entry[1] === "string" && Boolean(entry[1]),
      )
      .map(([key, value]) => ({
        key,
        ciphertext: encryptSetting(value),
        lastFour: maskLastFour(value),
        version: 1,
      }));
    await fetchAuthMutation(api.settings.adminSave, { config, secrets });
    return adminJson(trace, { ok: true });
  } catch (error) {
    return adminException(trace, "configuration.update", error);
  }
}
