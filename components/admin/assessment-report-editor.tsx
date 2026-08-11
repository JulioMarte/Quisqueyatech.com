"use client";

import { Mail, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AssessmentReport = {
  subject: string;
  executiveSummary: string;
  processSummary: string;
  opportunities: {
    title: string;
    rationale: string;
    impact: string;
    confidence: "high" | "medium" | "low";
  }[];
  assumptions: string[];
  openQuestions: string[];
  nextStep: string;
};

export function ReportEditor({
  report,
  busy,
  canSend,
  sendReason,
  onUpdate,
  onSave,
  onPreview,
  onSend,
}: {
  report: AssessmentReport;
  busy: boolean;
  canSend: boolean;
  sendReason: string;
  onUpdate<K extends keyof AssessmentReport>(key: K, value: AssessmentReport[K]): void;
  onSave(): void;
  onPreview(): void;
  onSend(): void;
}) {
  const updateOpportunity = (
    index: number,
    patch: Partial<AssessmentReport["opportunities"][number]>,
  ) =>
    onUpdate(
      "opportunities",
      report.opportunities.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <h2 className="font-display text-xl font-bold">Reporte revisable</h2>
      <div className="mt-4 space-y-4">
        <Field
          label="Asunto"
          value={report.subject}
          onChange={(value) => onUpdate("subject", value)}
        />
        <Field
          label="Resumen ejecutivo"
          value={report.executiveSummary}
          onChange={(value) => onUpdate("executiveSummary", value)}
          area
        />
        <Field
          label="Proceso"
          value={report.processSummary}
          onChange={(value) => onUpdate("processSummary", value)}
          area
        />
        {report.opportunities.map((opportunity, index) => (
          <fieldset
            key={`${opportunity.title}-${index}`}
            className="rounded-xl border border-line p-4"
          >
            <legend className="px-2 font-semibold">Oportunidad {index + 1}</legend>
            <Field
              label="Título"
              value={opportunity.title}
              onChange={(title) => updateOpportunity(index, { title })}
            />
            <Field
              label="Razonamiento"
              value={opportunity.rationale}
              onChange={(rationale) => updateOpportunity(index, { rationale })}
              area
            />
            <Field
              label="Impacto"
              value={opportunity.impact}
              onChange={(impact) => updateOpportunity(index, { impact })}
            />
            <label className="block text-sm font-medium">
              <span className="mb-1 block">Confianza</span>
              <select
                value={opportunity.confidence}
                onChange={(event) =>
                  updateOpportunity(index, {
                    confidence: event.target.value as "high" | "medium" | "low",
                  })
                }
                className="min-h-11 w-full rounded-lg border border-line px-3"
              >
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </label>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={() =>
                onUpdate(
                  "opportunities",
                  report.opportunities.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </fieldset>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={report.opportunities.length >= 5}
          onClick={() =>
            onUpdate("opportunities", [
              ...report.opportunities,
              { title: "", rationale: "", impact: "", confidence: "medium" },
            ])
          }
        >
          <Plus className="h-4 w-4" />
          Añadir oportunidad
        </Button>
        <StringList
          label="Supuestos"
          values={report.assumptions}
          onChange={(assumptions) => onUpdate("assumptions", assumptions)}
        />
        <StringList
          label="Preguntas pendientes"
          values={report.openQuestions}
          onChange={(openQuestions) => onUpdate("openQuestions", openQuestions)}
        />
        <Field
          label="Siguiente paso"
          value={report.nextStep}
          onChange={(value) => onUpdate("nextStep", value)}
          area
        />
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} type="button" variant="outline" onClick={onSave}>
            <Save className="h-4 w-4" />
            Guardar borrador
          </Button>
          <Button disabled={busy} type="button" variant="outline" onClick={onPreview}>
            Vista previa exacta
          </Button>
          <Button
            disabled={busy || !canSend}
            title={sendReason || undefined}
            type="button"
            onClick={onSend}
          >
            <Mail className="h-4 w-4" />
            Aprobar y enviar
          </Button>
        </div>
        {sendReason ? <p className="text-sm text-amber-900">{sendReason}</p> : null}
      </div>
    </div>
  );
}

function StringList({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange(values: string[]): void;
}) {
  return (
    <fieldset className="rounded-xl border border-line p-4">
      <legend className="px-2 font-semibold">{label}</legend>
      {values.map((value, index) => (
        <div key={index} className="mb-2 flex gap-2">
          <input
            value={value}
            onChange={(event) =>
              onChange(
                values.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)),
              )
            }
            className="min-h-11 flex-1 rounded-lg border border-line px-3"
          />
          <Button
            type="button"
            variant="outline"
            aria-label={`Eliminar ${label.toLowerCase()} ${index + 1}`}
            onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => onChange([...values, ""])}>
        <Plus className="h-4 w-4" />
        Añadir
      </Button>
    </fieldset>
  );
}

function Field({
  label,
  value,
  onChange,
  area = false,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  area?: boolean;
}) {
  const className = "min-h-11 w-full rounded-lg border border-line px-3 py-2";
  return (
    <label className="block text-sm font-medium">
      <span className="mb-1 block">{label}</span>
      {area ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={className}
          rows={4}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={className}
        />
      )}
    </label>
  );
}
