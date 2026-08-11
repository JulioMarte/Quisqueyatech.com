import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { VoiceProviderId } from "@/lib/assessment/types";
import { runtimeSecret } from "@/lib/server/runtime-secret-cache";

type TokenPurpose = "progress" | "resume" | "provider-override";
type TokenPayload = {
  purpose: TokenPurpose;
  assessmentId?: string;
  provider?: VoiceProviderId;
  exp: number;
  nonce: string;
};

function secret() {
  const value = runtimeSecret("assessmentTokenSecret") || process.env.ASSESSMENT_TOKEN_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV !== "production") return "local-development-assessment-secret-change-me";
  throw new Error("ASSESSMENT_TOKEN_SECRET is required in production");
}

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}
function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createAssessmentToken(payload: Omit<TokenPayload, "nonce">) {
  const body = encode(JSON.stringify({ ...payload, nonce: crypto.randomUUID() }));
  return `${body}.${sign(body)}`;
}

export function verifyAssessmentToken(token: string, purpose: TokenPurpose): TokenPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
    return payload.purpose === purpose && payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export function progressToken(assessmentId: string) {
  return createAssessmentToken({
    purpose: "progress",
    assessmentId,
    exp: Date.now() + 20 * 60_000,
  });
}

export function resumeToken(assessmentId: string) {
  return createAssessmentToken({
    purpose: "resume",
    assessmentId,
    exp: Date.now() + 24 * 60 * 60_000,
  });
}

export function assessmentTokenHash(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

export function providerOverrideToken(provider: VoiceProviderId) {
  return createAssessmentToken({
    purpose: "provider-override",
    provider,
    exp: Date.now() + 24 * 60 * 60_000,
  });
}
