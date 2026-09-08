import { createDecipheriv, createHmac } from "node:crypto";
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP, type LookupFunction } from "node:net";

export interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  durationMs: number;
}

function encryptionKey() {
  const raw = process.env.CONFIG_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error("CONFIGURATION_ERROR");
  const result = /^[a-f\d]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (result.length !== 32) throw new Error("CONFIGURATION_ERROR");
  return result;
}

export function decryptSetting(value: string) {
  const [version, iv, tag, encrypted] = value.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("CONFIGURATION_ERROR");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function forbiddenIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0)) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0) || a >= 224
  );
}

function normalizedHostname(value: string) {
  const host = value.toLowerCase().replace(/\.$/, "");
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

export function forbiddenIp(address: string) {
  const value = normalizedHostname(address).split("%")[0];
  if (isIP(value) === 4) return forbiddenIpv4(value);
  const mapped = value.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return forbiddenIpv4(mapped[1]);
  return value === "::" || value === "::1" || /^f[cd]/.test(value) || /^fe[89ab]/.test(value) || /^ff/.test(value) || /^2001:db8[:]/.test(value);
}

export function normalizedDestination(raw: string) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("INVALID_DESTINATION"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || !url.hostname) throw new Error("INVALID_DESTINATION");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("INVALID_DESTINATION");
  const host = normalizedHostname(url.hostname);
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host === "metadata.google.internal") {
    throw new Error("DESTINATION_BLOCKED");
  }
  if (isIP(host) && forbiddenIp(host)) throw new Error("DESTINATION_BLOCKED");
  return url;
}

export async function deliverWebhook(input: {
  url: string;
  encryptedSecret: string;
  eventId: string;
  body: string;
  timestamp: string;
}): Promise<DeliveryResult> {
  const startedAt = Date.now();
  try {
    const url = normalizedDestination(input.url);
    const hostname = normalizedHostname(url.hostname);
    const addresses = isIP(hostname)
      ? [{ address: hostname, family: isIP(hostname) }]
      : await lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some((item) => forbiddenIp(item.address))) throw new Error("DESTINATION_BLOCKED");
    const preferred = addresses.find((item) => item.family === 4) ?? addresses[0];
    const pinnedLookup = ((
      _hostname: string,
      _options: unknown,
      callback: (error: Error | null, address: string, family: number) => void,
    ) => callback(null, preferred.address, preferred.family)) as LookupFunction;

    const secret = decryptSetting(input.encryptedSecret);
    const signature = createHmac("sha256", secret).update(input.body, "utf8").digest("hex");
    const statusCode = await new Promise<number>((resolve, reject) => {
      const send = url.protocol === "https:" ? httpsRequest : httpRequest;
      const request = send(url, {
        method: "POST",
        lookup: pinnedLookup,
        timeout: 10_000,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(input.body),
          "X-QuisqueyaTech-Event": input.eventId,
          "X-QuisqueyaTech-Timestamp": input.timestamp,
          "X-QuisqueyaTech-Signature": `sha256=${signature}`,
        },
      }, (response) => {
        response.resume();
        resolve(response.statusCode ?? 0);
      });
      request.on("timeout", () => request.destroy(new Error("TIMEOUT")));
      request.on("error", reject);
      request.end(input.body);
    });
    const success = statusCode >= 200 && statusCode < 300;
    return { success, statusCode, error: success ? undefined : `HTTP ${statusCode}`, durationMs: Date.now() - startedAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const safeError = ["DESTINATION_BLOCKED", "INVALID_DESTINATION", "CONFIGURATION_ERROR", "TIMEOUT"].includes(message)
      ? message
      : "NETWORK_ERROR";
    return { success: false, error: safeError, durationMs: Date.now() - startedAt };
  }
}
