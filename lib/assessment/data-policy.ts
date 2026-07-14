import type { AssessmentAlert, AssessmentEvidence } from "./types";

const sensitivePatterns = [
  { pattern: /\b(?:\d[ -]*?){13,19}\b/g, label: "payment-card-like number" },
  { pattern: /\b(?:password|contrase(?:ña|na)|clave|passcode|pin)\s*[:=]\s*\S+/gi, label: "credential" },
  { pattern: /\b(?:api[_ -]?key|secret|token)\s*[:=]\s*[A-Za-z0-9_\-.]{12,}/gi, label: "access secret" },
  { pattern: /\b(?:cvv|cvc)\s*[:=]?\s*\d{3,4}\b/gi, label: "card verification code" },
] as const;

export function enforceAssessmentDataPolicy(updates: AssessmentEvidence[], now = Date.now()) {
  const alerts: AssessmentAlert[] = [];
  const sanitized = updates.map((update) => {
    let value = update.value;
    let evidence = update.evidence;
    for (const rule of sensitivePatterns) {
      const before = `${value}\n${evidence}`;
      value = value.replace(rule.pattern, "[REDACTED]");
      rule.pattern.lastIndex = 0;
      evidence = evidence.replace(rule.pattern, "[REDACTED]");
      rule.pattern.lastIndex = 0;
      if (before !== `${value}\n${evidence}`) alerts.push({ code: "sensitive-data-redacted", field: update.field, message: `Redacted ${rule.label}`, occurredAt: now });
    }
    return { ...update, value, evidence, status: alerts.some((alert) => alert.field === update.field) ? "pending" as const : update.status };
  });
  return { updates: sanitized, alerts };
}

export function redactSensitiveText(input: string) {
  let text = input;
  let redacted = false;
  for (const rule of sensitivePatterns) {
    const next = text.replace(rule.pattern, "[REDACTED]");
    rule.pattern.lastIndex = 0;
    redacted ||= next !== text;
    text = next;
  }
  return { text, redacted };
}
