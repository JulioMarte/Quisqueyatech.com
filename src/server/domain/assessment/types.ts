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

export interface AssessmentEvidence {
  field: AssessmentFieldKey;
  value: string;
  evidence: string;
  status: EvidenceStatus;
  confidence: number;
  confirmedAt?: number;
}

export interface AssessmentAlert {
  code: "sensitive-data-redacted" | "contradiction" | "invalid-contact";
  field?: AssessmentFieldKey;
  message: string;
  occurredAt: number;
}

export interface AssessmentSnapshot {
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
}

export interface ProgressInput {
  assessmentId: string;
  eventId: string;
  reason: ProgressReason;
  elapsedSeconds: number;
  updates?: AssessmentEvidence[];
}

export interface ProgressOutput {
  snapshot: AssessmentSnapshot;
  coverageScore: number;
  essentialMissing: AssessmentFieldKey[];
  currentBranch: string;
  nextInstruction: string;
  suggestedAction: SuggestedAction;
}
