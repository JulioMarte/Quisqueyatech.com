export const voiceProviderIds = ["ultravox", "livekit", "gemini-live"] as const;
export type VoiceProviderId = (typeof voiceProviderIds)[number];

export type VoiceStatus =
  "connecting" | "listening" | "thinking" | "speaking" | "reconnecting" | "ended" | "error";

export type EvidenceStatus = "confirmed" | "estimated" | "inferred" | "pending";
export type InterviewStage =
  | "identity"
  | "context"
  | "process"
  | "workflow"
  | "impact"
  | "outcome"
  | "confirmation"
  | "complete";
export type ProgressReason = "answer" | "correction" | "time-threshold" | "interruption" | "close";
export type SuggestedAction = "continue" | "summarize" | "confirm-contact" | "finish";

export type AssessmentFieldKey =
  | "name"
  | "company"
  | "role"
  | "email"
  | "phone"
  | "businessContext"
  | "candidateProcesses"
  | "priorityProcess"
  | "trigger"
  | "outcome"
  | "owners"
  | "tools"
  | "steps"
  | "exceptions"
  | "volume"
  | "manualWork"
  | "pain"
  | "impact"
  | "desiredOutcome"
  | "successMetric"
  | "constraints"
  | "validators";

export type AssessmentEvidence = {
  field: AssessmentFieldKey;
  value: string;
  evidence: string;
  status: EvidenceStatus;
  confidence: number;
  confirmedAt?: number;
};

export type AssessmentSnapshot = {
  version: 1;
  revision: number;
  locale: "es" | "en";
  stage: InterviewStage;
  fields: Partial<Record<AssessmentFieldKey, AssessmentEvidence>>;
  probeCounts: Partial<Record<AssessmentFieldKey, number>>;
  coverageScore: number;
  essentialMissing: AssessmentFieldKey[];
  currentBranch: string;
  elapsedSeconds: number;
  complete: boolean;
  alerts: AssessmentAlert[];
  lastUpdatedAt: number;
};

export type AssessmentAlert = {
  code: "sensitive-data-redacted" | "contradiction" | "invalid-contact";
  field?: AssessmentFieldKey;
  message: string;
  occurredAt: number;
};

export type ProgressInput = {
  assessmentId: string;
  eventId: string;
  reason: ProgressReason;
  elapsedSeconds: number;
  updates?: AssessmentEvidence[];
};

export type ProgressOutput = {
  snapshot: AssessmentSnapshot;
  coverageScore: number;
  essentialMissing: AssessmentFieldKey[];
  currentBranch: string;
  nextInstruction: string;
  suggestedAction: SuggestedAction;
};

export type TranscriptTurn = {
  speaker: "user" | "agent";
  text: string;
  final: boolean;
  timestampMs?: number;
};
export type NormalizedVoiceEvent = {
  type: "started" | "joined" | "ended" | "error";
  providerSessionId?: string;
  reason?: string;
  occurredAt: number;
};

export type GeminiSessionConfig = {
  responseModalities: ["AUDIO"];
  language: "es" | "en";
  systemInstruction: string;
};
export type ProviderSession =
  | { provider: "ultravox"; assessmentId: string; callId: string; joinUrl: string }
  | {
      provider: "livekit";
      assessmentId: string;
      roomUrl: string;
      token: string;
      roomName: string;
      supportId: string;
      dispatchId: string;
    }
  | {
      provider: "gemini-live";
      assessmentId: string;
      ephemeralToken: string;
      model: string;
      sessionConfig: GeminiSessionConfig;
    };
export type VoiceStartSession =
  ProviderSession | { provider: "demo"; assessmentId: string; notice: string };

export type AssessmentContext = {
  assessmentId: string;
  sessionKey: string;
  locale: "es" | "en";
  name: string;
  progressToken: string;
  resumeSummary?: string;
};

export interface VoiceProviderAdapter {
  readonly id: VoiceProviderId;
  createSession(context: AssessmentContext): Promise<ProviderSession>;
  sendGuidance(session: ProviderSession, instruction: string): Promise<void>;
  endSession(session: ProviderSession, message?: string): Promise<void>;
  getCanonicalTranscript(session: ProviderSession): Promise<TranscriptTurn[]>;
  normalizeLifecycleEvent(payload: unknown): NormalizedVoiceEvent;
}
