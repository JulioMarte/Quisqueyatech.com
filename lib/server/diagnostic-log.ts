import "server-only";

type DiagnosticDetails = Record<string, unknown>;

const sensitiveKeyPattern =
  /token|secret|key|authorization|password|credential|transcript|prompt|metadata/i;

function sanitize(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return value.slice(0, 240);
  if (Array.isArray(value)) return value.map((item) => sanitize(item));
  if (typeof value !== "object") return String(value).slice(0, 240);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sensitiveKeyPattern.test(key) ? "<redacted>" : sanitize(item),
    ]),
  );
}

export function diagnosticLog(
  service: string,
  stage: string,
  details: DiagnosticDetails = {},
  level: "info" | "error" = "info",
) {
  const payload = sanitize({
    service,
    stage,
    occurredAt: new Date().toISOString(),
    ...details,
  });
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else console.info(line);
}

export function errorSummary(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message.slice(0, 240) };
  }
  return { name: "UnknownError", message: String(error).slice(0, 240) };
}
