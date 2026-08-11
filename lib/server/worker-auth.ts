import { timingSafeEqual } from "node:crypto";
import { runtimeSecret } from "@/lib/server/runtime-secret-cache";

export function bearerToken(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
}

export function safeEqualSecret(expected: string | undefined, received: string | undefined) {
  const left = Buffer.from(expected || "");
  const right = Buffer.from(received || "");
  return left.length > 0 && left.length === right.length && timingSafeEqual(left, right);
}

export function isTrustedAssessmentWorker(request: Request) {
  return safeEqualSecret(
    runtimeSecret("assessmentWorkerSecret") || process.env.ASSESSMENT_WORKER_SECRET,
    bearerToken(request),
  );
}
