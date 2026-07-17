import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import type { LookupFunction } from "node:net";

function key() {
  const raw = process.env.CONFIG_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error("CONFIG_ENCRYPTION_KEY is required");
  const value = /^[a-f\d]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (value.length !== 32) throw new Error("CONFIG_ENCRYPTION_KEY must encode exactly 32 bytes");
  return value;
}
export function encryptSetting(value: string) { const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(), iv); const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]); return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`; }
export function decryptSetting(value: string) { const [version, iv, tag, encrypted] = value.split("."); if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("Unsupported encrypted setting"); const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url")); decipher.setAuthTag(Buffer.from(tag, "base64url")); return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8"); }
export function maskLastFour(value: string) { return value.slice(-4); }

const forbiddenHostnames = new Set([
  "localhost",
  "metadata",
  "metadata.google.internal",
  "instance-data",
  "instance-data.ec2.internal",
]);

function ipv4Number(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0;
}

function inV4Range(value: number, base: string, prefix: number) {
  const start = ipv4Number(base);
  if (start === null) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) === (start & mask);
}

function expandIpv6(address: string) {
  const normalized = address.toLowerCase().split("%")[0];
  const mapped = normalized.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  let input = normalized;
  if (mapped) {
    const v4 = ipv4Number(mapped[2]);
    if (v4 === null) return null;
    input = `${mapped[1]}${(v4 >>> 16).toString(16)}:${(v4 & 0xffff).toString(16)}`;
  }
  const halves = input.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;
  const groups = [...left, ...Array(missing).fill("0"), ...right];
  if (groups.length !== 8 || groups.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;
  return groups.map((part) => Number.parseInt(part, 16));
}

/** Rejects addresses that cannot be valid public Internet destinations. */
export function isForbiddenExternalIp(address: string) {
  const family = isIP(address);
  if (family === 4) {
    const value = ipv4Number(address)!;
    return [
      ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
      ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
      ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
      ["224.0.0.0", 4], ["240.0.0.0", 4],
    ].some(([base, prefix]) => inV4Range(value, String(base), Number(prefix)));
  }
  if (family !== 6) return true;
  const groups = expandIpv6(address);
  if (!groups) return true;
  if (groups.slice(0, 5).every((part) => part === 0) && groups[5] === 0xffff) {
    const mapped = `${groups[6] >>> 8}.${groups[6] & 255}.${groups[7] >>> 8}.${groups[7] & 255}`;
    return isForbiddenExternalIp(mapped);
  }
  const allZero = groups.every((part) => part === 0);
  const loopback = groups.slice(0, 7).every((part) => part === 0) && groups[7] === 1;
  const uniqueLocal = (groups[0] & 0xfe00) === 0xfc00;
  const linkLocal = (groups[0] & 0xffc0) === 0xfe80;
  const multicast = (groups[0] & 0xff00) === 0xff00;
  const documentation = groups[0] === 0x2001 && groups[1] === 0x0db8;
  return allZero || loopback || uniqueLocal || linkLocal || multicast || documentation;
}

export function assertSafeExternalUrl(raw: string) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Invalid external URL"); }
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("Production URLs must use HTTPS");
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || !url.hostname || url.port === "0") throw new Error("Invalid external URL");
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (forbiddenHostnames.has(host) || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Private destinations are not allowed");
  if (isIP(host) && isForbiddenExternalIp(host)) throw new Error("Private destinations are not allowed");
  return url.toString();
}

type LookupResult = { address: string; family: number };
type LookupAll = (hostname: string) => Promise<LookupResult[]>;

/** Revalidates DNS immediately before an outbound request. Mixed public/private answers are rejected. */
export async function resolveSafeExternalUrl(raw: string, resolver: LookupAll = async (hostname) => lookup(hostname, { all: true, verbatim: true })) {
  const normalized = assertSafeExternalUrl(raw);
  const url = new URL(normalized);
  if (isIP(url.hostname)) return { url: normalized, addresses: [{ address: url.hostname, family: isIP(url.hostname) }] };
  const addresses = await resolver(url.hostname);
  if (!addresses.length || addresses.some((item) => isForbiddenExternalIp(item.address))) throw new Error("Private destinations are not allowed");
  return { url: normalized, addresses };
}

export function signWebhookBody(secret: string, body: string) {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

export type WebhookPostResult = { success: boolean; statusCode?: number; error?: string; durationMs: number };

export type SafeExternalRequestResult = WebhookPostResult & { body?: string };

/** Performs a small outbound HTTP request without redirects and pins DNS to an address already checked for SSRF. */
export async function requestExternalSafely(
  rawUrl: string,
  options: { method?: "GET" | "POST"; headers?: Record<string, string>; body?: string; timeoutMs?: number; maxResponseBytes?: number } = {},
): Promise<SafeExternalRequestResult> {
  const startedAt = Date.now();
  try {
    const resolved = await resolveSafeExternalUrl(rawUrl);
    const url = new URL(resolved.url);
    const preferred = resolved.addresses.find((item) => item.family === 4) ?? resolved.addresses[0];
    const pinnedLookup: LookupFunction = ((_hostname, _lookupOptions, callback) => callback(null, preferred.address, preferred.family)) as LookupFunction;
    const response = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
      const send = url.protocol === "https:" ? httpsRequest : httpRequest;
      const body = options.body;
      const headers = { ...options.headers };
      if (body !== undefined) headers["Content-Length"] = String(Buffer.byteLength(body));
      const req = send(url, { method: options.method ?? "GET", headers, lookup: pinnedLookup, timeout: options.timeoutMs ?? 10_000 }, (incoming) => {
        const chunks: Buffer[] = [];
        let received = 0;
        const maximum = options.maxResponseBytes ?? 32_768;
        incoming.on("data", (chunk: Buffer) => {
          received += chunk.length;
          if (received > maximum) return incoming.destroy(new Error("RESPONSE_TOO_LARGE"));
          chunks.push(chunk);
        });
        incoming.on("end", () => resolve({ statusCode: incoming.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }));
        incoming.on("error", reject);
      });
      req.on("timeout", () => req.destroy(new Error("TIMEOUT")));
      req.on("error", reject);
      req.end(body);
    });
    const success = response.statusCode >= 200 && response.statusCode < 300;
    return { success, statusCode: response.statusCode, body: response.body, error: success ? undefined : `HTTP ${response.statusCode}`, durationMs: Date.now() - startedAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const sanitized = /private destinations/i.test(message) ? "DESTINATION_BLOCKED" : message === "TIMEOUT" ? "TIMEOUT" : message === "RESPONSE_TOO_LARGE" ? "RESPONSE_TOO_LARGE" : /invalid external url|https/i.test(message) ? "INVALID_DESTINATION" : "NETWORK_ERROR";
    return { success: false, error: sanitized, durationMs: Date.now() - startedAt };
  }
}

/** Sends without redirects and pins the request to a DNS answer already checked for SSRF. */
export async function postWebhookSafely(rawUrl: string, body: string, headers: Record<string, string>, timeoutMs = 10_000): Promise<WebhookPostResult> {
  const result = await requestExternalSafely(rawUrl, { method: "POST", body, headers, timeoutMs, maxResponseBytes: 1_024 });
  return { success: result.success, statusCode: result.statusCode, error: result.error, durationMs: result.durationMs };
}
