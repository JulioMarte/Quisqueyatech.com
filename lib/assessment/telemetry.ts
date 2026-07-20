export const assessmentTelemetryEvents = [
  "audio_blocked",
  "audio_unlocked",
  "track_subscribed",
  "track_unsubscribed",
  "play_rejected",
  "audio_playing",
  "audio_failed",
  "room_reconnecting",
  "room_reconnected",
  "room_disconnected",
  "agent_metadata",
  "turn_user_final",
  "turn_response",
  "turn_stalled",
  "turn_recovered",
  "recovery_required",
  "recovery_started",
  "session_recovered",
  "recovery_failed",
  "agent_state",
  "user_state",
  "speech_created",
  "metrics_collected",
  "tool_started",
  "tool_completed",
  "tool_failed",
  "model_error",
  "session_closed",
] as const;

export type AssessmentTelemetryEvent = (typeof assessmentTelemetryEvents)[number];

export type AssessmentTelemetryInput = {
  eventId?: string;
  supportId: string;
  sessionKey: string;
  event: AssessmentTelemetryEvent;
  turnId?: string;
  state?: string;
  code?: string;
  durationMs?: number;
  recoverable?: boolean;
};

export const telemetryRetentionMs = 30 * 24 * 60 * 60_000;
