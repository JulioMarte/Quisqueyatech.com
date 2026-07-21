export type AssessmentTranscriptTurn = {
  speaker: "user" | "agent";
  text: string;
  timestampMs?: number;
};

export function parseAssessmentTranscript(raw?: string): AssessmentTranscriptTurn[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [{ speaker: "agent", text: raw }];
    return parsed.flatMap((entry): AssessmentTranscriptTurn[] => {
      if (!entry || typeof entry !== "object") return [];
      const item = entry as Record<string, unknown>;
      const directText =
        typeof item.text === "string"
          ? item.text
          : typeof item.content === "string"
            ? item.content
            : undefined;
      const content = Array.isArray(item.content)
        ? item.content
            .map((part) =>
              typeof part === "string"
                ? part
                : part &&
                    typeof part === "object" &&
                    typeof (part as Record<string, unknown>).text === "string"
                  ? String((part as Record<string, unknown>).text)
                  : "",
            )
            .filter(Boolean)
            .join(" ")
        : directText;
      if (!content?.trim()) return [];
      const role = String(item.speaker || item.role || item.type || "agent").toLowerCase();
      return [
        {
          speaker: ["user", "human", "visitor", "client"].some((value) => role.includes(value))
            ? "user"
            : "agent",
          text: content.trim(),
          timestampMs: typeof item.timestampMs === "number" ? item.timestampMs : undefined,
        },
      ];
    });
  } catch {
    return raw.trim() ? [{ speaker: "agent", text: raw.trim() }] : [];
  }
}
