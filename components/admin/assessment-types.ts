import type { AssessmentReport } from "@/components/admin/assessment-report-editor";

export type EvidenceStatus = "confirmed" | "estimated" | "inferred" | "pending";
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

export type AssessmentEvidenceField = {
  field: AssessmentFieldKey;
  value: string;
  evidence: string;
  status: EvidenceStatus;
  confidence: number;
};

export type AssessmentSummary = {
  assessmentId: string;
  status: string;
  reportStatus?: string;
  reportRevision: number;
  stage?: string;
  coverageScore?: number;
  createdAt: number;
  completedAt?: number;
  lead: {
    firstName: string;
    lastName: string;
    company?: string;
    email: string;
    locale?: "es" | "en";
  } | null;
};

export type AssessmentDetail = AssessmentSummary & {
  provider?: string;
  providerModel?: string;
  providerVoice?: string;
  durationSeconds?: number;
  transcript?: string;
  transcriptExpiresAt: number;
  completionReason?: string;
  sendError?: string;
  snapshot?: {
    revision: number;
    fields: Partial<Record<AssessmentFieldKey, AssessmentEvidenceField>>;
    alerts?: { occurredAt: number; message: string }[];
  };
  reportDraft?: AssessmentReport;
  telemetry?: {
    eventId: string;
    source: string;
    event: string;
    state?: string;
    code?: string;
    durationMs?: number;
    createdAt: number;
  }[];
  telemetrySummary?: {
    lastState?: string;
    lastEvent?: string;
    stalledTurns: number;
    recoveredTurns: number;
    toolErrors: number;
    modelErrors: number;
    responseP50Ms?: number;
    responseP95Ms?: number;
  };
};
