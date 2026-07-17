import type { VoiceStatus } from "@/lib/assessment/types";

export function normalizeVoiceStatus(value: unknown): VoiceStatus {
  const status = String(value || "").toLowerCase();
  if (status.includes("reconnect")) return "reconnecting";
  if (status.includes("end") || status.includes("disconnect") || status.includes("closed"))
    return "ended";
  if (status.includes("listen") || status === "idle" || status.includes("connected"))
    return "listening";
  if (status.includes("think") || status.includes("process")) return "thinking";
  if (status.includes("speak") || status.includes("play")) return "speaking";
  if (status.includes("error") || status.includes("fail")) return "error";
  return "connecting";
}
