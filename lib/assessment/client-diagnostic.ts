import { assessmentTelemetryEvents } from "@/lib/assessment/telemetry";

export const clientDiagnosticEvents = assessmentTelemetryEvents;

export type ClientDiagnosticEvent = (typeof clientDiagnosticEvents)[number];

export const playbackStates = ["unknown", "blocked", "ready", "playing", "failed"] as const;

export type PlaybackState = (typeof playbackStates)[number];

export type ClientDiagnosticPayload = {
  supportId: string;
  event: ClientDiagnosticEvent;
  roomName: string;
  playbackState: PlaybackState;
  client: string;
  sessionKey: string;
  turnId?: string;
  state?: string;
  code?: string;
  durationMs?: number;
};

export function describeClient(userAgent: string) {
  const browser = /Firefox\//i.test(userAgent)
    ? "Firefox"
    : /Edg\//i.test(userAgent)
      ? "Edge"
      : /CriOS\//i.test(userAgent)
        ? "Chrome iOS"
        : /Chrome\//i.test(userAgent)
          ? "Chrome"
          : /Safari\//i.test(userAgent)
            ? "Safari"
            : "Other";
  const platform = /Android/i.test(userAgent)
    ? "Android"
    : /iPhone|iPad|iPod/i.test(userAgent)
      ? "iOS"
      : /Windows/i.test(userAgent)
        ? "Windows"
        : /Mac OS X/i.test(userAgent)
          ? "macOS"
          : /Linux/i.test(userAgent)
            ? "Linux"
            : "Other";
  return `${browser} / ${platform}`;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseClientDiagnostic(value: unknown): ClientDiagnosticPayload | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.supportId !== "string" ||
    !uuidPattern.test(candidate.supportId) ||
    typeof candidate.event !== "string" ||
    !clientDiagnosticEvents.includes(candidate.event as ClientDiagnosticEvent) ||
    typeof candidate.roomName !== "string" ||
    candidate.roomName.length < 10 ||
    candidate.roomName.length > 180 ||
    typeof candidate.playbackState !== "string" ||
    !playbackStates.includes(candidate.playbackState as PlaybackState) ||
    typeof candidate.client !== "string" ||
    candidate.client.length < 1 ||
    candidate.client.length > 180 ||
    typeof candidate.sessionKey !== "string" ||
    !uuidPattern.test(candidate.sessionKey) ||
    (candidate.turnId !== undefined &&
      (typeof candidate.turnId !== "string" || candidate.turnId.length > 80)) ||
    (candidate.state !== undefined &&
      (typeof candidate.state !== "string" || candidate.state.length > 80)) ||
    (candidate.code !== undefined &&
      (typeof candidate.code !== "string" || candidate.code.length > 80)) ||
    (candidate.durationMs !== undefined &&
      (typeof candidate.durationMs !== "number" ||
        !Number.isFinite(candidate.durationMs) ||
        candidate.durationMs < 0 ||
        candidate.durationMs > 120_000))
  )
    return null;
  return candidate as ClientDiagnosticPayload;
}
