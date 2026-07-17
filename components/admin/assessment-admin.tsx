"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Mail, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Eyebrow, Section } from "@/components/ui/section";
import { adminRequest, type AdminPage } from "@/lib/client/admin-response";

type Report = {
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
type Summary = {
  assessmentId: string;
  status: string;
  reportStatus?: string;
  reportRevision: number;
  coverageScore?: number;
  createdAt: number;
  completedAt?: number;
  lead: {
    firstName: string;
    lastName: string;
    company: string;
    email: string;
    locale: "es" | "en";
  } | null;
};
type Detail = Summary & {
  provider?: string;
  providerModel?: string;
  providerVoice?: string;
  frameworkVersion?: string;
  transcript?: string;
  snapshot?: {
    fields?: { email?: { status?: string; value?: string } };
    alerts?: { occurredAt: number; message: string; field?: string }[];
  };
  reportDraft?: Report;
  sendError?: string;
  reportSendMessageId?: string;
};
export function AssessmentAdmin() {
  const confirmRef = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<Summary[]>([]),
    [selected, setSelected] = useState<Detail | null>(null),
    [report, setReport] = useState<Report | null>(null),
    [filter, setFilter] = useState(""),
    [cursor, setCursor] = useState<string | null>(null),
    [isDone, setIsDone] = useState(true),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [messageKind, setMessageKind] = useState<"error" | "success">("success"),
    [previewHtml, setPreviewHtml] = useState("");
  const announce = (value: string, kind: "error" | "success" = "success") => {
    setMessage(value);
    setMessageKind(kind);
  };

  const load = useCallback(
    async (append = false, nextCursor: string | null = null) => {
      setLoading(true);
      try {
        const page = await adminRequest<AdminPage<Summary>>(
          `/api/admin/v1/assessments?limit=25${filter ? `&status=${encodeURIComponent(filter)}` : ""}${nextCursor ? `&cursor=${encodeURIComponent(nextCursor)}` : ""}`,
          { cache: "no-store" },
        );
        setItems((current) => (append ? [...current, ...page.items] : page.items));
        setCursor(page.continueCursor || null);
        setIsDone(page.isDone);
      } catch (error) {
        announce(
          error instanceof Error ? error.message : "No se pudieron cargar las evaluaciones.",
          "error",
        );
      } finally {
        setLoading(false);
      }
    },
    [filter],
  );
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function selectAssessment(item: Summary) {
    setLoading(true);
    setMessage("");
    try {
      const detail = await adminRequest<Detail>(`/api/admin/v1/assessments/${item.assessmentId}`, {
        cache: "no-store",
      });
      setSelected(detail);
      setReport(detail.reportDraft || null);
      setPreviewHtml("");
      requestAnimationFrame(() => document.getElementById("assessment-detail")?.focus());
    } catch (error) {
      announce(
        error instanceof Error ? error.message : "No se pudo cargar la evaluación.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }
  async function refreshSelected() {
    if (!selected) return;
    await selectAssessment(selected);
    await load();
  }
  async function loadPreview() {
    if (!selected || !report) return;
    try {
      const data = await adminRequest<{ html: string }>("/api/admin/v1/assessments/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: selected.lead?.locale || "es", report }),
      });
      setPreviewHtml(data.html);
    } catch (error) {
      announce(
        error instanceof Error ? error.message : "No se pudo generar la vista previa.",
        "error",
      );
    }
  }
  async function review(action: "save" | "approve-and-send") {
    if (!selected || !report) return;
    setBusy(true);
    setMessage("");
    try {
      await adminRequest("/api/admin/v1/assessments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: selected.assessmentId,
          expectedRevision: selected.reportRevision,
          action,
          report,
        }),
      });
      confirmRef.current?.close();
      announce(action === "save" ? "Borrador guardado." : "Reporte aprobado y enviado.");
      await refreshSelected();
    } catch (error) {
      const failure = error instanceof Error ? error.message : "No se pudo completar la revisión.";
      if (action === "approve-and-send") await refreshSelected().catch(() => undefined);
      announce(failure, "error");
    } finally {
      setBusy(false);
    }
  }
  const verifiedEmail = Boolean(
    selected?.lead?.email &&
    selected.snapshot?.fields?.email?.status === "confirmed" &&
    selected.snapshot.fields.email.value === selected.lead.email,
  );
  const update = <K extends keyof Report>(key: K, value: Report[K]) =>
    setReport((current) => (current ? { ...current, [key]: value } : current));

  return (
    <Section className="min-h-screen bg-bg-2 py-8">
      <Container className="max-w-[1600px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Levantamiento conversacional</Eyebrow>
            <h1 className="mt-3 font-display text-4xl font-bold text-primary">
              Evaluaciones y reportes
            </h1>
            <p className="mt-2 text-text-2">
              Borradores editables, envío confirmado e historial protegido contra conflictos.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm font-medium">
              <span className="mb-1 block">Filtrar estado</span>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="min-h-11 rounded-lg border border-line bg-white px-3"
              >
                <option value="">Todos</option>
                <option value="review_pending">En revisión</option>
                <option value="sending">Enviando</option>
                <option value="send_failed">Envío fallido</option>
                <option value="sent">Enviado</option>
              </select>
            </label>
            <span className="inline-flex min-h-11 items-center rounded-lg border border-line bg-white px-3 text-sm font-medium">
              LiveKit · Gemini 3.1 Live
            </span>
            <Button type="button" variant="outline" disabled={loading} onClick={() => void load()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Actualizar
            </Button>
          </div>
        </div>
        {message ? (
          <p
            role={messageKind === "error" ? "alert" : "status"}
            className={`mt-5 rounded-lg border p-3 text-sm ${messageKind === "error" ? "border-red-300 bg-red-50 text-red-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}
          >
            {message}
          </p>
        ) : null}
        <div className="mt-7 grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
          <aside
            className="max-h-[calc(100vh-12rem)] overflow-y-auto rounded-2xl border border-line bg-white p-3"
            aria-label="Evaluaciones"
          >
            {loading && !items.length ? (
              <p className="p-6 text-center text-text-2">Cargando evaluaciones…</p>
            ) : items.length ? (
              items.map((item) => (
                <button
                  key={item.assessmentId}
                  type="button"
                  onClick={() => void selectAssessment(item)}
                  className={`mb-2 min-h-14 w-full rounded-xl p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tech ${selected?.assessmentId === item.assessmentId ? "bg-primary text-white" : "hover:bg-bg-2"}`}
                >
                  <span className="block font-semibold">
                    {item.lead?.firstName || "Visitante"} · {item.lead?.company || "Sin empresa"}
                  </span>
                  <span
                    className={`mt-1 block text-xs ${selected?.assessmentId === item.assessmentId ? "text-white/80" : "text-mute"}`}
                  >
                    {new Date(item.createdAt).toLocaleDateString("es-DO")} ·{" "}
                    {labelStatus(item.reportStatus || item.status)} · {item.coverageScore || 0}%
                  </span>
                </button>
              ))
            ) : (
              <p className="p-6 text-center text-text-2">Todavía no hay evaluaciones.</p>
            )}
            {!isDone ? (
              <Button
                type="button"
                variant="outline"
                className="mt-2 w-full"
                disabled={loading}
                onClick={() => void load(true, cursor)}
              >
                Cargar más
              </Button>
            ) : null}
          </aside>
          <main id="assessment-detail" tabIndex={-1} className="min-w-0 focus:outline-none">
            {selected ? (
              <div className="space-y-5">
                <div className="grid gap-3 rounded-2xl border border-line bg-white p-5 sm:grid-cols-4">
                  <Metric label="Cobertura" value={`${selected.coverageScore || 0}%`} />
                  <Metric label="Proveedor" value={selected.provider || "—"} />
                  <Metric
                    label="Estado"
                    value={labelStatus(selected.reportStatus || selected.status)}
                  />
                  <Metric label="Contacto" value={verifiedEmail ? "Verificado" : "Pendiente"} />
                </div>
                {selected.sendError ? (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900"
                  >
                    Último envío fallido: {selected.sendError}
                  </p>
                ) : null}
                <div className="grid gap-5 lg:grid-cols-2">
                  <Evidence detail={selected} />
                  <div className="space-y-5">
                    {report ? (
                      <ReportEditor
                        report={report}
                        busy={busy}
                        canSend={
                          verifiedEmail &&
                          selected.reportStatus !== "sent" &&
                          selected.reportStatus !== "sending"
                        }
                        sendReason={
                          !verifiedEmail
                            ? "Confirma el email para habilitar el envío."
                            : selected.reportStatus === "sent"
                              ? "El reporte enviado es inmutable."
                              : selected.reportStatus === "sending"
                                ? "Hay un envío activo."
                                : ""
                        }
                        onUpdate={update}
                        onSave={() => void review("save")}
                        onPreview={() => void loadPreview()}
                        onSend={() => {
                          confirmRef.current?.showModal();
                        }}
                      />
                    ) : (
                      <div className="rounded-2xl border border-line bg-white p-5 text-text-2">
                        El borrador se generará al terminar la evaluación.
                      </div>
                    )}
                    {previewHtml ? (
                      <iframe
                        title="Vista previa exacta del correo"
                        srcDoc={previewHtml}
                        className="h-[650px] w-full rounded-2xl border border-line bg-white"
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-96 items-center justify-center rounded-2xl border border-dashed border-line bg-white text-text-2">
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Selecciona una evaluación
              </div>
            )}
          </main>
        </div>
      </Container>
      <dialog
        ref={confirmRef}
        className="fixed inset-0 z-50 m-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl backdrop:bg-primary/70"
      >
        <h2 className="font-display text-2xl font-bold text-primary">Confirmar envío</h2>
        <dl className="mt-4 grid gap-3 rounded-xl bg-bg-2 p-4">
          <div>
            <dt className="text-xs font-semibold uppercase text-mute">Destinatario</dt>
            <dd className="mt-1 break-all">{selected?.lead?.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-mute">Asunto</dt>
            <dd className="mt-1">{report?.subject}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-text-2">
          Una vez confirmado por el proveedor, el reporte será inmutable.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => confirmRef.current?.close()}
          >
            Cancelar
          </Button>
          <Button type="button" disabled={busy} onClick={() => void review("approve-and-send")}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Confirmar y enviar
          </Button>
        </div>
      </dialog>
    </Section>
  );
}

function Evidence({ detail }: { detail: Detail }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <h2 className="font-display text-xl font-bold">Evidencia</h2>
      {detail.snapshot?.alerts?.length ? (
        <ul className="mt-4 list-disc rounded-xl bg-amber-50 p-4 pl-8 text-sm text-amber-900">
          {detail.snapshot.alerts.map((alert, index) => (
            <li key={`${alert.occurredAt}-${index}`}>{alert.message}</li>
          ))}
        </ul>
      ) : null}
      <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-bg-2 p-4 text-xs">
        {JSON.stringify(detail.snapshot, null, 2)}
      </pre>
      <h2 className="mt-6 font-display text-xl font-bold">Transcripción</h2>
      <div className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl bg-bg-2 p-4 text-sm text-text-2">
        {detail.transcript || "Pendiente de finalización"}
      </div>
    </div>
  );
}
function ReportEditor({
  report,
  busy,
  canSend,
  sendReason,
  onUpdate,
  onSave,
  onPreview,
  onSend,
}: {
  report: Report;
  busy: boolean;
  canSend: boolean;
  sendReason: string;
  onUpdate<K extends keyof Report>(key: K, value: Report[K]): void;
  onSave(): void;
  onPreview(): void;
  onSend(): void;
}) {
  const setList = (key: "assumptions" | "openQuestions", index: number, value: string) =>
    onUpdate(
      key,
      report[key].map((item, i) => (i === index ? value : item)),
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
          <div key={index} className="rounded-xl border border-line p-4">
            <div className="flex justify-between">
              <strong>Oportunidad {index + 1}</strong>
              <button
                type="button"
                className="min-h-11 min-w-11 rounded-lg text-red-800 hover:bg-red-50"
                aria-label={`Eliminar oportunidad ${index + 1}`}
                onClick={() =>
                  onUpdate(
                    "opportunities",
                    report.opportunities.filter((_, i) => i !== index),
                  )
                }
              >
                <Trash2 className="mx-auto h-4 w-4" />
              </button>
            </div>
            <Field
              label="Título"
              value={opportunity.title}
              onChange={(value) =>
                onUpdate(
                  "opportunities",
                  report.opportunities.map((item, i) =>
                    i === index ? { ...item, title: value } : item,
                  ),
                )
              }
            />
            <Field
              label="Razonamiento"
              value={opportunity.rationale}
              onChange={(value) =>
                onUpdate(
                  "opportunities",
                  report.opportunities.map((item, i) =>
                    i === index ? { ...item, rationale: value } : item,
                  ),
                )
              }
              area
            />
            <Field
              label="Impacto"
              value={opportunity.impact}
              onChange={(value) =>
                onUpdate(
                  "opportunities",
                  report.opportunities.map((item, i) =>
                    i === index ? { ...item, impact: value } : item,
                  ),
                )
              }
            />
            <label className="block text-sm font-medium">
              <span className="mb-1 block">Confianza</span>
              <select
                value={opportunity.confidence}
                onChange={(event) =>
                  onUpdate(
                    "opportunities",
                    report.opportunities.map((item, i) =>
                      i === index
                        ? { ...item, confidence: event.target.value as "high" | "medium" | "low" }
                        : item,
                    ),
                  )
                }
                className="min-h-11 w-full rounded-lg border border-line px-3"
              >
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </label>
          </div>
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
          onChange={(i, value) => setList("assumptions", i, value)}
          onAdd={() => onUpdate("assumptions", [...report.assumptions, ""])}
          onDelete={(i) =>
            onUpdate(
              "assumptions",
              report.assumptions.filter((_, index) => index !== i),
            )
          }
        />
        <StringList
          label="Preguntas pendientes"
          values={report.openQuestions}
          onChange={(i, value) => setList("openQuestions", i, value)}
          onAdd={() => onUpdate("openQuestions", [...report.openQuestions, ""])}
          onDelete={(i) =>
            onUpdate(
              "openQuestions",
              report.openQuestions.filter((_, index) => index !== i),
            )
          }
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
  onAdd,
  onDelete,
}: {
  label: string;
  values: string[];
  onChange(index: number, value: string): void;
  onAdd(): void;
  onDelete(index: number): void;
}) {
  return (
    <fieldset className="rounded-xl border border-line p-4">
      <legend className="px-2 font-semibold">{label}</legend>
      {values.map((value, index) => (
        <div key={index} className="mb-2 flex gap-2">
          <input
            value={value}
            onChange={(event) => onChange(index, event.target.value)}
            className="min-h-11 flex-1 rounded-lg border border-line px-3"
          />
          <button
            type="button"
            className="min-h-11 min-w-11 rounded-lg text-red-800 hover:bg-red-50"
            aria-label={`Eliminar ${label.toLowerCase()} ${index + 1}`}
            onClick={() => onDelete(index)}
          >
            <Trash2 className="mx-auto h-4 w-4" />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Añadir
      </Button>
    </fieldset>
  );
}
function labelStatus(value: string) {
  return (
    (
      {
        collecting: "Recopilando",
        pending_draft: "Pendiente",
        review_pending: "En revisión",
        sending: "Enviando",
        send_failed: "Envío fallido",
        sent: "Enviado",
        completed: "Completada",
      } as Record<string, string>
    )[value] || value.replaceAll("_", " ")
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-mute">{label}</p>
      <p className="mt-1 font-semibold text-primary">{value}</p>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  area,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  area?: boolean;
}) {
  return (
    <label className="block text-sm font-medium">
      <span className="mb-1 block">{label}</span>
      {area ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-28 w-full rounded-lg border border-line p-3"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-line px-3"
        />
      )}
    </label>
  );
}
