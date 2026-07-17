import type {
  AssessmentFieldKey,
  AssessmentSnapshot,
  EvidenceStatus,
  InterviewStage,
  ProgressInput,
  ProgressOutput,
  SuggestedAction,
} from "./types";

const essential: AssessmentFieldKey[] = [
  "email",
  "phone",
  "priorityProcess",
  "trigger",
  "outcome",
  "pain",
  "volume",
  "impact",
  "desiredOutcome",
];
const groups: { weight: number; fields: AssessmentFieldKey[] }[] = [
  { weight: 15, fields: ["name", "company", "role", "email", "phone"] },
  { weight: 20, fields: ["businessContext", "candidateProcesses", "priorityProcess"] },
  { weight: 20, fields: ["trigger", "outcome", "owners", "tools", "steps", "exceptions"] },
  { weight: 15, fields: ["volume", "manualWork"] },
  { weight: 15, fields: ["pain", "impact"] },
  { weight: 10, fields: ["desiredOutcome", "successMetric"] },
  { weight: 5, fields: ["constraints", "validators"] },
];

const stageFields: { stage: InterviewStage; fields: AssessmentFieldKey[]; branch: string }[] = [
  {
    stage: "identity",
    fields: ["name", "company", "role", "email", "phone"],
    branch: "identity-and-contact",
  },
  {
    stage: "context",
    fields: ["businessContext", "candidateProcesses"],
    branch: "business-context",
  },
  { stage: "process", fields: ["priorityProcess"], branch: "priority-process" },
  {
    stage: "workflow",
    fields: ["trigger", "outcome", "owners", "tools", "steps", "exceptions"],
    branch: "current-workflow",
  },
  {
    stage: "impact",
    fields: ["volume", "manualWork", "pain", "impact"],
    branch: "evidence-and-impact",
  },
  {
    stage: "outcome",
    fields: ["desiredOutcome", "successMetric", "constraints", "validators"],
    branch: "desired-outcome",
  },
  { stage: "confirmation", fields: [], branch: "confirmation" },
];

export function createAssessmentSnapshot(
  locale: "es" | "en",
  now = Date.now(),
): AssessmentSnapshot {
  return {
    version: 1,
    revision: 0,
    locale,
    stage: "identity",
    fields: {},
    probeCounts: {},
    coverageScore: 0,
    essentialMissing: [...essential],
    currentBranch: "identity-and-contact",
    elapsedSeconds: 0,
    complete: false,
    alerts: [],
    lastUpdatedAt: now,
  };
}

export class AssessmentInterviewEngine {
  advance(current: AssessmentSnapshot, input: ProgressInput, now = Date.now()): ProgressOutput {
    const fields = { ...current.fields };
    const probeCounts = { ...current.probeCounts };
    for (const update of input.updates || []) {
      if (!update.value.trim() || !update.evidence.trim()) continue;
      const status = validatedStatus(update.field, update.value, update.status);
      fields[update.field] = {
        ...update,
        status,
        confidence: Math.max(0, Math.min(1, update.confidence)),
        confirmedAt: status === "confirmed" ? now : update.confirmedAt,
      };
      if (status === "pending")
        probeCounts[update.field] = Math.min(2, (probeCounts[update.field] || 0) + 1);
    }
    const coverageScore = scoreCoverage(fields);
    const essentialMissing = essential.filter((field) => fields[field]?.status !== "confirmed");
    const stageInfo =
      stageFields.find(({ fields: required }) =>
        required.some((field) => {
          const value = fields[field];
          return !value || (value.status === "pending" && (probeCounts[field] || 0) < 2);
        }),
      ) || stageFields.at(-1)!;
    const elapsedSeconds = Math.max(current.elapsedSeconds, Math.min(900, input.elapsedSeconds));
    const complete = essentialMissing.length === 0 && coverageScore >= 80;
    const action = suggestedAction(complete, elapsedSeconds, input.reason, essentialMissing);
    const snapshot: AssessmentSnapshot = {
      ...current,
      revision: (current.revision || 0) + 1,
      fields,
      probeCounts,
      stage: complete ? "complete" : stageInfo.stage,
      currentBranch: complete ? "complete" : stageInfo.branch,
      coverageScore,
      essentialMissing,
      elapsedSeconds,
      complete,
      alerts: current.alerts || [],
      lastUpdatedAt: now,
    };
    return {
      snapshot,
      coverageScore,
      essentialMissing,
      currentBranch: snapshot.currentBranch,
      nextInstruction: instructionFor(snapshot, action),
      suggestedAction: action,
    };
  }
}

export function scoreCoverage(fields: AssessmentSnapshot["fields"]) {
  const score = groups.reduce((total, group) => {
    const earned = group.fields.reduce((value, field) => {
      const status = fields[field]?.status;
      return (
        value +
        (status === "confirmed"
          ? 1
          : status === "estimated"
            ? 0.65
            : status === "inferred"
              ? 0.35
              : 0)
      );
    }, 0);
    return total + group.weight * (earned / group.fields.length);
  }, 0);
  return Math.round(score);
}

function suggestedAction(
  complete: boolean,
  elapsed: number,
  reason: ProgressInput["reason"],
  missing: AssessmentFieldKey[],
): SuggestedAction {
  if (elapsed >= 870 || reason === "close") return "finish";
  if (complete || elapsed >= 780)
    return missing.includes("email") || missing.includes("phone") ? "confirm-contact" : "summarize";
  return "continue";
}

function instructionFor(snapshot: AssessmentSnapshot, action: SuggestedAction) {
  const es = snapshot.locale === "es";
  if (action === "finish")
    return es
      ? "Cierra ahora con una despedida breve. Explica que el reporte revisado llegará dentro de un día laborable. No hagas otra pregunta."
      : "Close now with a brief farewell. Explain that the reviewed report will arrive within one business day. Ask no further question.";
  if (action === "confirm-contact")
    return es
      ? "Confirma ahora correo y teléfono, repitiéndolos por partes. Haz una sola pregunta."
      : "Confirm email and phone now, repeating them in chunks. Ask one question only.";
  if (action === "summarize")
    return es
      ? "Resume los hechos principales, separa estimaciones y pendientes, y pregunta si entendiste correctamente."
      : "Summarize the main facts, separate estimates and pending items, and ask whether you understood correctly.";
  const next = stageFields.find((item) => item.branch === snapshot.currentBranch);
  const field = next?.fields.find(
    (key) =>
      !snapshot.fields[key] ||
      (snapshot.fields[key]?.status === "pending" && (snapshot.probeCounts[key] || 0) < 2),
  );
  return es
    ? `Continúa la rama ${snapshot.currentBranch}. Recoge ${field || "el siguiente dato pendiente"}. Refleja brevemente lo escuchado y haz una sola pregunta. No inventes datos.`
    : `Continue the ${snapshot.currentBranch} branch. Collect ${field || "the next missing fact"}. Briefly reflect what you heard and ask exactly one question. Do not invent data.`;
}

function validatedStatus(
  field: AssessmentFieldKey,
  value: string,
  status: EvidenceStatus,
): EvidenceStatus {
  if (status !== "confirmed") return status;
  if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "pending";
  if (field === "phone" && !/^\+[1-9]\d{7,14}$/.test(value.replace(/[\s()-]/g, "")))
    return "pending";
  return status;
}
