"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  Clock3,
  FileText,
  Loader2,
  Mail,
  MessageSquareText,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/section";
import { adminRequest } from "@/lib/client/admin-response";
import { ReportEditor, type AssessmentReport } from "@/components/admin/assessment-report-editor";
import { parseAssessmentTranscript } from "@/lib/assessment/transcript";
import type {
  AssessmentDetail as Detail,
  AssessmentEvidenceField as EvidenceField,
  AssessmentFieldKey as FieldKey,
  AssessmentSummary as Summary,
  EvidenceStatus,
} from "@/components/admin/assessment-types";
type Tab = "summary" | "data" | "transcript" | "report" | "diagnostics";

const groups: { title: string; description: string; fields: { key: FieldKey; label: string }[] }[] =
  [
    {
      title: "Contacto",
      description: "Identidad y canales confirmados durante la conversación.",
      fields: [
        { key: "name", label: "Nombre" },
        { key: "company", label: "Empresa" },
        { key: "role", label: "Cargo" },
        { key: "email", label: "Correo" },
        { key: "phone", label: "Teléfono" },
      ],
    },
    {
      title: "Contexto del negocio",
      description: "Situación operativa y procesos considerados.",
      fields: [
        { key: "businessContext", label: "Contexto" },
        { key: "candidateProcesses", label: "Procesos candidatos" },
      ],
    },
    {
      title: "Proceso prioritario",
      description: "Proceso seleccionado y resultado actual.",
      fields: [
        { key: "priorityProcess", label: "Proceso" },
        { key: "trigger", label: "Disparador" },
        { key: "outcome", label: "Resultado" },
      ],
    },
    {
      title: "Flujo, herramientas y responsables",
      description: "Cómo se ejecuta el trabajo hoy.",
      fields: [
        { key: "owners", label: "Responsables" },
        { key: "tools", label: "Herramientas" },
        { key: "steps", label: "Pasos" },
        { key: "exceptions", label: "Excepciones" },
      ],
    },
    {
      title: "Dolor e impacto",
      description: "Carga operativa y consecuencias observadas.",
      fields: [
        { key: "volume", label: "Volumen" },
        { key: "manualWork", label: "Trabajo manual" },
        { key: "pain", label: "Dolor" },
        { key: "impact", label: "Impacto" },
      ],
    },
    {
      title: "Resultado deseado",
      description: "Éxito esperado y límites de la solución.",
      fields: [
        { key: "desiredOutcome", label: "Resultado deseado" },
        { key: "successMetric", label: "Métrica de éxito" },
        { key: "constraints", label: "Restricciones" },
        { key: "validators", label: "Validadores" },
      ],
    },
  ];

export function AssessmentDetailPage({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deleteRef = useRef<HTMLDialogElement>(null);
  const sendRef = useRef<HTMLDialogElement>(null);
  const requested = searchParams.get("seccion");
  const initialTab: Tab =
    requested === "datos"
      ? "data"
      : requested === "transcripcion"
        ? "transcript"
        : requested === "reporte"
          ? "report"
          : requested === "diagnostico"
            ? "diagnostics"
            : "summary";
  const [detail, setDetail] = useState<Detail | null>(null),
    [report, setReport] = useState<AssessmentReport | null>(null),
    [tab, setTabState] = useState<Tab>(initialTab);
  const [draftFields, setDraftFields] = useState<Partial<Record<FieldKey, EvidenceField>>>({}),
    [editing, setEditing] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [deleteText, setDeleteText] = useState(""),
    [previewHtml, setPreviewHtml] = useState(""),
    [message, setMessage] = useState<{ text: string; kind: "error" | "success" } | null>(null);
  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminRequest<Detail>(`/api/admin/v1/assessments/${assessmentId}`, {
        cache: "no-store",
      });
      setDetail(data);
      setReport(data.reportDraft || null);
      setDraftFields(data.snapshot?.fields || {});
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "No se pudo cargar la evaluación.",
        kind: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);
  useEffect(() => {
    queueMicrotask(() => void loadDetail());
  }, [loadDetail]);
  function setTab(next: Tab) {
    setTabState(next);
    const names: Record<Tab, string> = {
      summary: "resumen",
      data: "datos",
      transcript: "transcripcion",
      report: "reporte",
      diagnostics: "diagnostico",
    };
    const params = new URLSearchParams(window.location.search);
    params.set("seccion", names[next]);
    window.history.pushState({}, "", `${window.location.pathname}?${params}`);
  }
  async function saveFields() {
    if (!detail?.snapshot) return;
    setBusy(true);
    try {
      const fields = Object.values(draftFields).filter((field): field is EvidenceField =>
        Boolean(field?.value.trim()),
      );
      await adminRequest(`/api/admin/v1/assessments/${assessmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: detail.snapshot.revision, fields }),
      });
      setEditing(false);
      setMessage({ text: "Datos actualizados.", kind: "success" });
      await loadDetail();
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "No se pudieron guardar los datos.",
        kind: "error",
      });
    } finally {
      setBusy(false);
    }
  }
  async function review(action: "save" | "approve-and-send") {
    if (!detail || !report) return;
    setBusy(true);
    try {
      await adminRequest("/api/admin/v1/assessments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId,
          expectedRevision: detail.reportRevision,
          action,
          report,
        }),
      });
      sendRef.current?.close();
      setMessage({
        text: action === "save" ? "Borrador guardado." : "Reporte aprobado y enviado.",
        kind: "success",
      });
      await loadDetail();
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "No se pudo completar la revisión.",
        kind: "error",
      });
    } finally {
      setBusy(false);
    }
  }
  async function preview() {
    if (!detail || !report) return;
    try {
      const result = await adminRequest<{ html: string }>("/api/admin/v1/assessments/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: detail.lead?.locale || "es", report }),
      });
      setPreviewHtml(result.html);
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "No se pudo generar la vista previa.",
        kind: "error",
      });
    }
  }
  async function remove() {
    if (!detail || deleteText !== assessmentId) return;
    setBusy(true);
    try {
      await adminRequest(`/api/admin/v1/assessments/${assessmentId}`, { method: "DELETE" });
      const back = searchParams.get("volver");
      router.replace(`/admin/evaluaciones${back || ""}`);
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "No se pudo eliminar la evaluación.",
        kind: "error",
      });
    } finally {
      setBusy(false);
    }
  }
  if (loading && !detail)
    return (
      <Section className="min-h-screen bg-bg-2 py-8">
        <Container>
          <div className="h-80 animate-pulse rounded-2xl bg-white" />
        </Container>
      </Section>
    );
  if (!detail)
    return (
      <Section className="min-h-screen bg-bg-2 py-8">
        <Container>
          <p
            role="alert"
            className="rounded-xl border border-rose-300 bg-rose-50 p-5 text-rose-900"
          >
            {message?.text || "No se encontró la evaluación."}
          </p>
        </Container>
      </Section>
    );
  const back = searchParams.get("volver");
  return (
    <Section className="min-h-screen bg-bg-2 py-6">
      <Container className="max-w-[1600px]">
        <button
          onClick={() => router.push(`/admin/evaluaciones${back || ""}`)}
          className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-semibold text-primary hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a evaluaciones
        </button>
        {message ? (
          <p
            role={message.kind === "error" ? "alert" : "status"}
            className={`mb-4 rounded-xl border p-3 text-sm ${message.kind === "error" ? "border-rose-300 bg-rose-50 text-rose-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}
          >
            {message.text}
          </p>
        ) : null}
        <DetailPanel
          detail={detail}
          tab={tab}
          setTab={setTab}
          editing={editing}
          setEditing={setEditing}
          draftFields={draftFields}
          setDraftFields={setDraftFields}
          busy={busy}
          onSaveFields={saveFields}
          report={report}
          setReport={setReport}
          onReview={review}
          onPreview={preview}
          previewHtml={previewHtml}
          onDelete={() => deleteRef.current?.showModal()}
          onSend={() => sendRef.current?.showModal()}
        />
      </Container>
      <DeleteDialog
        dialogRef={deleteRef}
        detail={detail}
        value={deleteText}
        setValue={setDeleteText}
        busy={busy}
        onDelete={remove}
      />
      <SendDialog
        dialogRef={sendRef}
        detail={detail}
        report={report}
        busy={busy}
        onSend={() => void review("approve-and-send")}
      />
    </Section>
  );
}

function DetailPanel(props: {
  detail: Detail;
  tab: Tab;
  setTab(tab: Tab): void;
  editing: boolean;
  setEditing(value: boolean): void;
  draftFields: Partial<Record<FieldKey, EvidenceField>>;
  setDraftFields(value: Partial<Record<FieldKey, EvidenceField>>): void;
  busy: boolean;
  onSaveFields(): void;
  report: AssessmentReport | null;
  setReport(value: AssessmentReport | null): void;
  onReview(action: "save" | "approve-and-send"): void;
  onPreview(): void;
  previewHtml: string;
  onDelete(): void;
  onSend(): void;
}) {
  const { detail, tab, setTab } = props;
  const verifiedEmail = Boolean(
    detail.lead?.email &&
    detail.snapshot?.fields.email?.status === "confirmed" &&
    detail.snapshot.fields.email.value === detail.lead.email,
  );
  const tabs: [Tab, string, React.ReactNode][] = [
    ["summary", "Resumen", <FileText key="a" className="h-4 w-4" />],
    ["data", "Datos recopilados", <ShieldCheck key="b" className="h-4 w-4" />],
    ["transcript", "Transcripción", <MessageSquareText key="c" className="h-4 w-4" />],
    ["report", "Reporte", <Mail key="d" className="h-4 w-4" />],
    ["diagnostics", "Diagnóstico", <Clock3 key="e" className="h-4 w-4" />],
  ];
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="border-b border-line p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-mute">{detail.lead?.company || "Sin empresa"}</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-primary">
              {fullName(detail)}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge value={detail.status} kind="assessment" />
              <StatusBadge value={detail.reportStatus || "collecting"} kind="report" />
            </div>
          </div>
          <Button
            variant="outline"
            className="text-rose-800"
            disabled={detail.reportStatus === "sending"}
            onClick={props.onDelete}
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </div>
      <nav
        className="sticky top-0 z-20 flex overflow-x-auto border-b border-line bg-white/95 p-2 backdrop-blur"
        aria-label="Detalle de evaluación"
      >
        {tabs.map(([id, label, icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${tab === id ? "bg-primary text-white" : "text-text-2 hover:bg-bg-2"}`}
            aria-current={tab === id ? "page" : undefined}
          >
            {icon}
            {label}
          </button>
        ))}
      </nav>
      <div className="p-5 sm:p-6">
        {tab === "summary" ? <SummaryView detail={detail} setTab={setTab} /> : null}
        {tab === "data" ? <DataView {...props} /> : null}
        {tab === "transcript" ? <TranscriptView detail={detail} /> : null}
        {tab === "report" ? (
          props.report ? (
            <>
              <ReportEditor
                report={props.report}
                busy={props.busy}
                canSend={verifiedEmail && !["sent", "sending"].includes(detail.reportStatus || "")}
                sendReason={
                  !verifiedEmail
                    ? "Confirma el correo en los datos recopilados para habilitar el envío."
                    : detail.reportStatus === "sent"
                      ? "El reporte enviado es inmutable."
                      : detail.reportStatus === "sending"
                        ? "Hay un envío activo."
                        : ""
                }
                onUpdate={(key, value) => props.setReport({ ...props.report!, [key]: value })}
                onSave={() => props.onReview("save")}
                onPreview={props.onPreview}
                onSend={props.onSend}
              />
              {props.previewHtml ? (
                <iframe
                  title="Vista previa exacta del correo"
                  srcDoc={props.previewHtml}
                  className="mt-5 h-[650px] w-full rounded-2xl border border-line"
                />
              ) : null}
            </>
          ) : (
            <Empty text="El borrador se generará al terminar la evaluación." />
          )
        ) : null}
        {tab === "diagnostics" ? <Diagnostics detail={detail} /> : null}
      </div>
    </section>
  );
}

function SummaryView({ detail, setTab }: { detail: Detail; setTab(tab: Tab): void }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Cobertura" value={`${detail.coverageScore || 0}%`} />
        <Metric
          label="Duración"
          value={detail.durationSeconds ? `${Math.round(detail.durationSeconds / 60)} min` : "—"}
        />
        <Metric label="Proveedor" value={detail.provider || "—"} />
        <Metric
          label="Contacto"
          value={detail.snapshot?.fields.email?.status === "confirmed" ? "Verificado" : "Pendiente"}
        />
      </div>
      {detail.sendError ? (
        <div className="flex gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
          <XCircle className="h-5 w-5 shrink-0" />
          <div>
            <strong>El último envío falló</strong>
            <p className="mt-1">{detail.sendError}</p>
            <button className="mt-2 font-semibold underline" onClick={() => setTab("report")}>
              Revisar y reintentar
            </button>
          </div>
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard
          title="Contacto"
          icon={<UserRound className="h-5 w-5" />}
          rows={[
            ["Nombre", fullName(detail)],
            ["Empresa", detail.lead?.company || "Sin empresa"],
            ["Correo", detail.lead?.email || "Sin correo"],
          ]}
        />
        <InfoCard
          title="Progreso"
          icon={<CheckCircle2 className="h-5 w-5" />}
          rows={[
            ["Creada", formatDate(detail.createdAt)],
            ["Completada", detail.completedAt ? formatDate(detail.completedAt) : "Pendiente"],
            ["Motivo de cierre", detail.completionReason || "—"],
          ]}
        />
      </div>
    </div>
  );
}

function DataView({
  detail,
  editing,
  setEditing,
  draftFields,
  setDraftFields,
  busy,
  onSaveFields,
}: Parameters<typeof DetailPanel>[0]) {
  const base = detail.snapshot?.fields || {};
  function update(key: FieldKey, patch: Partial<EvidenceField>) {
    const current = draftFields[key] ||
      base[key] || {
        field: key,
        value: "",
        evidence: "Corrección administrativa",
        status: "pending",
        confidence: 0.5,
      };
    setDraftFields({ ...draftFields, [key]: { ...current, ...patch } });
  }
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-bold text-primary">Ficha estructurada</h3>
          <p className="mt-1 text-sm text-text-2">
            Los cambios recalculan la cobertura y conservan la transcripción original.
          </p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setDraftFields(base);
                  setEditing(false);
                }}
              >
                Cancelar
              </Button>
              <Button disabled={busy} onClick={onSaveFields}>
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Guardar cambios
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              Corregir datos
            </Button>
          )}
        </div>
      </div>
      {detail.snapshot?.alerts?.length ? (
        <ul className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          {detail.snapshot.alerts.map((alert, i) => (
            <li key={`${alert.occurredAt}-${i}`}>• {alert.message}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {groups.map((group) => (
          <section key={group.title} className="rounded-xl border border-line p-5">
            <h4 className="font-display text-lg font-bold text-primary">{group.title}</h4>
            <p className="mt-1 text-sm text-mute">{group.description}</p>
            <div className="mt-4 space-y-4">
              {group.fields.map(({ key, label }) => {
                const field = editing ? draftFields[key] : base[key];
                return (
                  <div key={key}>
                    {editing ? (
                      <div className="grid gap-2">
                        <label className="text-sm font-semibold">
                          {label}
                          <textarea
                            value={field?.value || ""}
                            onChange={(e) => update(key, { value: e.target.value })}
                            className="mt-1 min-h-20 w-full rounded-lg border border-line p-3 font-normal"
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="text-xs text-mute">
                            Procedencia
                            <select
                              value={field?.status || "pending"}
                              onChange={(e) =>
                                update(key, { status: e.target.value as EvidenceStatus })
                              }
                              className="mt-1 min-h-11 w-full rounded-lg border border-line bg-white px-2 text-sm text-text"
                            >
                              <option value="confirmed">Confirmado</option>
                              <option value="estimated">Estimado</option>
                              <option value="inferred">Inferido</option>
                              <option value="pending">Pendiente</option>
                            </select>
                          </label>
                          <label className="text-xs text-mute">
                            Confianza
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={Math.round((field?.confidence || 0) * 100)}
                              onChange={(e) =>
                                update(key, { confidence: Number(e.target.value) / 100 })
                              }
                              className="mt-1 min-h-11 w-full rounded-lg border border-line px-2 text-sm text-text"
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-mute">
                            {label}
                          </p>
                          <EvidenceBadge
                            status={field?.status || "pending"}
                            confidence={field?.confidence}
                          />
                        </div>
                        <p
                          className={`mt-1 whitespace-pre-wrap text-sm ${field?.value ? "text-text" : "italic text-mute"}`}
                        >
                          {field?.value || "Sin información"}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function TranscriptView({ detail }: { detail: Detail }) {
  const [search, setSearch] = useState("");
  const [viewedAt] = useState(() => Date.now());
  const turns = useMemo(() => parseAssessmentTranscript(detail.transcript), [detail.transcript]);
  const shown = turns.filter((turn) =>
    turn.text.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")),
  );
  if (!turns.length)
    return (
      <Empty
        icon={<MessageSquareText className="h-7 w-7" />}
        text={
          viewedAt > detail.transcriptExpiresAt
            ? "La transcripción expiró conforme a la política de retención de 90 días."
            : detail.status === "completed"
              ? "La evaluación terminó, pero el proveedor no entregó una transcripción."
              : "La transcripción estará disponible cuando finalice la conversación."
        }
      />
    );
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-bold text-primary">Conversación</h3>
          <p className="mt-1 text-sm text-text-2">
            Evidencia de solo lectura · {turns.length} turnos
          </p>
        </div>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Buscar en la transcripción</span>
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-mute" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en la conversación"
            className="min-h-11 w-full rounded-lg border border-line pl-10 pr-3"
          />
        </label>
      </div>
      <div className="mt-6 max-h-[700px] space-y-4 overflow-y-auto rounded-xl bg-bg-2 p-4 sm:p-6">
        {shown.map((turn, index) => (
          <article
            key={index}
            className={`flex ${turn.speaker === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[72%] ${turn.speaker === "user" ? "rounded-br-sm bg-primary text-white" : "rounded-bl-sm border border-line bg-white text-text"}`}
            >
              <p
                className={`text-xs font-semibold ${turn.speaker === "user" ? "text-sky-100" : "text-mute"}`}
              >
                {turn.speaker === "user" ? "Visitante" : "Asistente"}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{turn.text}</p>
            </div>
          </article>
        ))}
        {!shown.length ? (
          <p className="py-10 text-center text-text-2">No se encontraron coincidencias.</p>
        ) : null}
      </div>
    </div>
  );
}
function Diagnostics({ detail }: { detail: Detail }) {
  const summary = detail.telemetrySummary;
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Último estado" value={summary?.lastState || "—"} />
        <Metric label="Bloqueos" value={String(summary?.stalledTurns || 0)} />
        <Metric label="Recuperados" value={String(summary?.recoveredTurns || 0)} />
        <Metric
          label="Errores"
          value={String((summary?.toolErrors || 0) + (summary?.modelErrors || 0))}
        />
      </div>
      <div className="mt-5 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[650px] text-left text-xs">
          <thead className="bg-bg-2">
            <tr>
              <th className="p-3">Hora</th>
              <th className="p-3">Origen</th>
              <th className="p-3">Evento</th>
              <th className="p-3">Estado/código</th>
              <th className="p-3">Duración</th>
            </tr>
          </thead>
          <tbody>
            {detail.telemetry?.map((event) => (
              <tr key={event.eventId} className="border-t border-line">
                <td className="p-3">{new Date(event.createdAt).toLocaleTimeString("es-DO")}</td>
                <td className="p-3">{event.source}</td>
                <td className="p-3 font-medium">{event.event}</td>
                <td className="p-3">{event.code || event.state || "—"}</td>
                <td className="p-3">
                  {event.durationMs === undefined ? "—" : formatDurationMs(event.durationMs)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!detail.telemetry?.length ? (
          <p className="p-6 text-center text-text-2">Esta evaluación no tiene eventos técnicos.</p>
        ) : null}
      </div>
    </div>
  );
}

function DeleteDialog({
  dialogRef,
  detail,
  value,
  setValue,
  busy,
  onDelete,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  detail: Detail | null;
  value: string;
  setValue(value: string): void;
  busy: boolean;
  onDelete(): void;
}) {
  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-white p-6 shadow-xl backdrop:bg-primary/70"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-800">
        <Trash2 className="h-5 w-5" />
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold text-primary">
        Eliminar definitivamente
      </h2>
      <p className="mt-3 text-sm leading-6 text-text-2">
        Se eliminarán la evaluación, sesiones, telemetría, eventos y audio asociado.{" "}
        {detail?.reportStatus === "sent"
          ? "El correo ya enviado no puede recuperarse."
          : "Esta acción no se puede deshacer."}
      </p>
      <label className="mt-4 block text-sm font-medium">
        Escribe el identificador para confirmar
        <span className="mt-1 block break-all rounded-lg bg-bg-2 p-2 font-mono text-xs">
          {detail?.assessmentId}
        </span>
        <input
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-2 min-h-11 w-full rounded-lg border border-line px-3"
        />
      </label>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" disabled={busy} onClick={() => dialogRef.current?.close()}>
          Cancelar
        </Button>
        <Button
          disabled={busy || value !== detail?.assessmentId}
          className="bg-rose-700 text-white hover:bg-rose-800"
          onClick={onDelete}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Eliminar definitivamente
        </Button>
      </div>
    </dialog>
  );
}
function SendDialog({
  dialogRef,
  detail,
  report,
  busy,
  onSend,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  detail: Detail | null;
  report: AssessmentReport | null;
  busy: boolean;
  onSend(): void;
}) {
  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-white p-6 shadow-xl backdrop:bg-primary/70"
    >
      <h2 className="font-display text-2xl font-bold text-primary">Confirmar envío</h2>
      <dl className="mt-4 grid gap-3 rounded-xl bg-bg-2 p-4">
        <div>
          <dt className="text-xs font-semibold uppercase text-mute">Destinatario</dt>
          <dd className="mt-1 break-all">{detail?.lead?.email}</dd>
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
        <Button variant="outline" disabled={busy} onClick={() => dialogRef.current?.close()}>
          Cancelar
        </Button>
        <Button disabled={busy} onClick={onSend}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Confirmar y enviar
        </Button>
      </div>
    </dialog>
  );
}

function StatusBadge({ value, kind }: { value: string; kind: "assessment" | "report" }) {
  const failed = value.includes("failed");
  const done = value === "completed" || value === "sent";
  const active = ["in_progress", "finalizing", "sending"].includes(value);
  const Icon = failed ? AlertCircle : done ? CheckCircle2 : active ? Clock3 : CircleDashed;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${failed ? "border-rose-200 bg-rose-50 text-rose-800" : done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : active ? "border-sky-200 bg-sky-50 text-sky-800" : "border-slate-200 bg-slate-50 text-slate-700"}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {statusLabel(value, kind)}
    </span>
  );
}
function EvidenceBadge({ status, confidence }: { status: EvidenceStatus; confidence?: number }) {
  const labels = {
    confirmed: "Confirmado",
    estimated: "Estimado",
    inferred: "Inferido",
    pending: "Pendiente",
  };
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-bg-2 px-2 py-1 text-[11px] font-semibold text-text-2">
      {status === "confirmed" ? (
        <CheckCircle2 className="h-3 w-3 text-emerald-700" />
      ) : (
        <CircleDashed className="h-3 w-3 text-amber-700" />
      )}
      {labels[status]}
      {confidence !== undefined ? ` · ${Math.round(confidence * 100)}%` : ""}
    </span>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-bg-2 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-mute">{label}</p>
      <p className="mt-2 font-semibold text-primary">{value}</p>
    </div>
  );
}
function InfoCard({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: React.ReactNode;
  rows: string[][];
}) {
  return (
    <section className="rounded-xl border border-line p-5">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold text-primary">
        {icon}
        {title}
      </h3>
      <dl className="mt-4 space-y-3">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex justify-between gap-4 border-t border-line pt-3 first:border-0 first:pt-0"
          >
            <dt className="text-sm text-mute">{label}</dt>
            <dd className="text-right text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
function Empty({ text, icon }: { text: string; icon?: React.ReactNode }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-bg-2 p-6 text-center text-text-2">
      {icon}
      <p className="mt-3 max-w-lg">{text}</p>
    </div>
  );
}
function fullName(item: Summary) {
  return item.lead
    ? `${item.lead.firstName || "Visitante"} ${item.lead.lastName || ""}`.trim()
    : "Visitante";
}
function formatDate(value: number) {
  return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" }).format(
    value,
  );
}
function formatDurationMs(value: number) {
  const seconds = Math.round(value / 1000);
  return seconds >= 60 ? `${Math.floor(seconds / 60)} min ${seconds % 60} s` : `${seconds} s`;
}
function statusLabel(value: string, kind: "assessment" | "report") {
  const labels: Record<string, string> = {
    started: "Iniciada",
    in_progress: "En progreso",
    finalizing: "Finalizando",
    completed: "Completada",
    finalization_failed: "Finalización fallida",
    collecting: "Recopilando",
    pending_draft: "Borrador pendiente",
    review_pending: "En revisión",
    sending: "Enviando",
    send_failed: "Envío fallido",
    sent: "Enviado",
  };
  return labels[value] || (kind === "report" ? "Sin reporte" : value.replaceAll("_", " "));
}
