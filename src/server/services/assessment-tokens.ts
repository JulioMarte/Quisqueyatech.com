import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

type AssessmentTokenPurpose = "progress" | "resume";

export interface AssessmentTokenPayload {
  purpose: AssessmentTokenPurpose;
  assessmentId: string;
  exp: number;
  nonce: string;
}

export class AssessmentTokenService {
  constructor(
    private readonly secret: string,
    private readonly clock: () => number = Date.now,
  ) {
    if (secret.trim().length < 32) throw new Error("ASSESSMENT_TOKEN_SECRET must be at least 32 characters");
  }

  private sign(body: string) {
    return createHmac("sha256", this.secret).update(body).digest("base64url");
  }

  private issue(purpose: AssessmentTokenPurpose, assessmentId: string, ttlMs: number) {
    if (!assessmentId || ttlMs <= 0) throw new Error("INVALID_ASSESSMENT_TOKEN");
    const body = Buffer.from(JSON.stringify({
      purpose,
      assessmentId,
      exp: this.clock() + ttlMs,
      nonce: randomUUID(),
    } satisfies AssessmentTokenPayload)).toString("base64url");
    return `${body}.${this.sign(body)}`;
  }

  progress(assessmentId: string) {
    return this.issue("progress", assessmentId, 20 * 60_000);
  }

  resume(assessmentId: string) {
    return this.issue("resume", assessmentId, 24 * 60 * 60_000);
  }

  verify(token: string, purpose: AssessmentTokenPurpose): AssessmentTokenPayload | null {
    const [body, signature, extra] = token.split(".");
    if (!body || !signature || extra !== undefined) return null;
    const expected = this.sign(body);
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
    try {
      const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<AssessmentTokenPayload>;
      if (
        parsed.purpose !== purpose ||
        typeof parsed.assessmentId !== "string" || !parsed.assessmentId ||
        typeof parsed.exp !== "number" || parsed.exp <= this.clock() ||
        typeof parsed.nonce !== "string" || !parsed.nonce
      ) return null;
      return parsed as AssessmentTokenPayload;
    } catch {
      return null;
    }
  }

  hash(token: string) {
    return createHash("sha256").update(token).digest("base64url");
  }
}
