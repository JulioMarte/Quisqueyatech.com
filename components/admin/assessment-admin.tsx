"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Copy, Loader2, Mail, RefreshCw, Save, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Eyebrow, Section } from "@/components/ui/section";
import type { AssessmentSnapshot, VoiceProviderId } from "@/lib/assessment/types";
import { requireAdminResponse } from "@/lib/client/admin-response";

type Report = {
  subject: string;
  executiveSummary: string;
  processSummary: string;
  opportunities: { title: string; rationale: string; impact: string; confidence: "high" | "medium" | "low" }[];
  assumptions: string[];
  openQuestions: string[];
  nextStep: string;
};

type Assessment = {
  assessmentId: string;
  provider?: string;
  providerModel?: string;
  providerVoice?: string;
  frameworkVersion?: string;
  status: string;
  reportStatus?: string;
  coverageScore?: number;
  createdAt: number;
  transcript?: string;
  snapshot?: AssessmentSnapshot;
  reportDraft?: Report;
  sendError?: string;
  lead?: { firstName: string; company: string; email: string; phone: string; locale: "es" | "en" };
};

const providers: VoiceProviderId[] = ["ultravox", "livekit", "gemini-live"];

export function AssessmentAdmin() {
  const [items, setItems] = useState<Assessment[]>([]);
  const [selected, setSelected] = useState<Assessment | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [provider, setProvider] = useState<VoiceProviderId>("ultravox");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/v1/assessments", { cache: "no-store" });
    requireAdminResponse(response);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setItems(payload.data || []);
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load().catch((error) => setMessage(error.message)));
    void fetch("/api/admin/v1/voice-settings")
      .then((response) => {
        requireAdminResponse(response);
        return response.json();
      })
      .then((payload) => setProvider(payload.data?.defaultProvider || "ultravox"));
  }, [load]);

  function selectAssessment(item: Assessment) {
    setSelected(item);
    setReport(item.reportDraft || null);
    setMessage("");
  }

  async function setDefaultProvider(next: VoiceProviderId) {
    setProvider(next);
    const response = await fetch("/api/admin/v1/voice-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: next }) });
    requireAdminResponse(response);
    if (!response.ok) setMessage("No se pudo actualizar el proveedor.");
  }

  async function copyTestLink() {
    const response = await fetch("/api/admin/v1/voice-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider }) });
    requireAdminResponse(response);
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error || "No se pudo generar el enlace.");
    await navigator.clipboard.writeText(payload.data.url);
    setMessage("Enlace firmado copiado. Vence en 24 horas.");
  }

  async function review(action: "save" | "approve-and-send") {
    if (!selected || !report) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/v1/assessments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assessmentId: selected.assessmentId, action, report }) });
      requireAdminResponse(response);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setMessage(action === "save" ? "Borrador guardado." : "Reporte aprobado y enviado.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  const update = <K extends keyof Report>(key: K, value: Report[K]) => setReport((current) => current ? { ...current, [key]: value } : current);

  return (
    <Section className="min-h-screen bg-bg-2 py-10">
      <Container className="max-w-[1600px]">
        <AdminHeader provider={provider} onProviderChange={setDefaultProvider} onCopyTestLink={copyTestLink} onRefresh={load} />
        <div className="mt-7 grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <AssessmentQueue items={items} selectedId={selected?.assessmentId} onSelect={selectAssessment} />
          <main>{selected ? <AssessmentDetail assessment={selected} report={report} busy={busy} onUpdate={update} onReview={review} /> : <EmptySelection />}</main>
        </div>
        {message ? <p role="status" className="mt-5 rounded-lg bg-white p-3 text-sm">{message}</p> : null}
      </Container>
    </Section>
  );
}

function AdminHeader({ provider, onProviderChange, onCopyTestLink, onRefresh }: { provider: VoiceProviderId; onProviderChange(value: VoiceProviderId): Promise<void>; onCopyTestLink(): Promise<void>; onRefresh(): Promise<void> }) {
  return <div className="flex flex-wrap items-end justify-between gap-4"><div><Eyebrow>Levantamiento conversacional</Eyebrow><h1 className="mt-3 font-display text-4xl font-bold text-primary">Evaluaciones y reportes</h1><p className="mt-2 text-text-2">Revisa evidencia, alertas y el correo exacto antes de aprobar.</p></div><div className="flex flex-wrap items-end gap-2"><label className="text-sm font-medium"><span className="mb-1 block">Proveedor predeterminado</span><select value={provider} onChange={(event) => void onProviderChange(event.target.value as VoiceProviderId)} className="min-h-11 cursor-pointer rounded-lg border border-line bg-white px-3">{providers.map((item) => <option key={item}>{item}</option>)}</select></label><Button type="button" variant="outline" onClick={() => void onCopyTestLink()}><Copy className="h-4 w-4" />Copiar enlace de prueba</Button><Button type="button" variant="outline" onClick={() => void onRefresh()}><RefreshCw className="h-4 w-4" />Actualizar</Button></div></div>;
}

function AssessmentQueue({ items, selectedId, onSelect }: { items: Assessment[]; selectedId?: string; onSelect(item: Assessment): void }) {
  return <aside className="max-h-[calc(100vh-12rem)] overflow-y-auto rounded-2xl border border-line bg-white p-3">{items.length ? items.map((item) => <button key={item.assessmentId} type="button" onClick={() => onSelect(item)} className={`mb-2 w-full cursor-pointer rounded-xl p-3 text-left ${selectedId === item.assessmentId ? "bg-primary text-white" : "hover:bg-bg-2"}`}><span className="block font-semibold">{item.lead?.firstName || "Visitante"} · {item.lead?.company || "Sin empresa"}</span><span className={`mt-1 block text-xs ${selectedId === item.assessmentId ? "text-white/70" : "text-mute"}`}>{item.provider || "sin proveedor"} · {item.coverageScore || 0}% · {item.reportStatus || item.status}</span></button>) : <p className="p-6 text-center text-text-2">Todavía no hay evaluaciones.</p>}</aside>;
}

function AssessmentDetail({ assessment, report, busy, onUpdate, onReview }: { assessment: Assessment; report: Report | null; busy: boolean; onUpdate<K extends keyof Report>(key: K, value: Report[K]): void; onReview(action: "save" | "approve-and-send"): Promise<void> }) {
  const verifiedEmail = assessment.snapshot?.fields.email?.status === "confirmed" && assessment.snapshot.fields.email.value === assessment.lead?.email;
  return <div className="space-y-5"><div className="grid gap-3 rounded-2xl border border-line bg-white p-5 sm:grid-cols-4"><Metric label="Cobertura" value={`${assessment.coverageScore || 0}%`} /><Metric label="Proveedor" value={assessment.provider || "—"} /><Metric label="Estado" value={assessment.status} /><Metric label="Contacto" value={verifiedEmail ? "Verificado" : "Pendiente"} /></div>{assessment.sendError ? <Alert message={`Último envío fallido: ${assessment.sendError}`} /> : null}<div className="grid gap-5 lg:grid-cols-2"><EvidencePanel assessment={assessment} /><div className="space-y-5">{report ? <ReportEditor report={report} busy={busy} canSend={Boolean(verifiedEmail)} onUpdate={onUpdate} onReview={onReview} /> : <div className="rounded-2xl border border-line bg-white p-5"><h2 className="font-display text-xl font-bold">Reporte revisable</h2><p className="mt-6 rounded-xl bg-amber-soft p-4 text-amber-deep">El borrador se generará cuando termine la evaluación.</p></div>}{report ? <EmailPreview report={report} /> : null}</div></div></div>;
}

function EvidencePanel({ assessment }: { assessment: Assessment }) {
  return <div className="rounded-2xl border border-line bg-white p-5"><h2 className="font-display text-xl font-bold">Ficha y evidencia</h2>{assessment.snapshot?.alerts?.length ? <div className="mt-4 rounded-xl border border-amber/30 bg-amber-soft p-4 text-sm text-amber-deep"><div className="flex items-center gap-2 font-semibold"><ShieldAlert className="h-4 w-4" />Alertas</div><ul className="mt-2 list-disc pl-5">{assessment.snapshot.alerts.map((alert, index) => <li key={`${alert.occurredAt}-${index}`}>{alert.message}{alert.field ? ` · ${alert.field}` : ""}</li>)}</ul></div> : null}<pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-bg-2 p-4 text-xs">{JSON.stringify(assessment.snapshot, null, 2)}</pre><h2 className="mt-6 font-display text-xl font-bold">Transcripción</h2><div className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl bg-bg-2 p-4 text-sm text-text-2">{assessment.transcript || "Pendiente de finalización"}</div></div>;
}

function ReportEditor({ report, busy, canSend, onUpdate, onReview }: { report: Report; busy: boolean; canSend: boolean; onUpdate<K extends keyof Report>(key: K, value: Report[K]): void; onReview(action: "save" | "approve-and-send"): Promise<void> }) {
  return <div className="rounded-2xl border border-line bg-white p-5"><h2 className="font-display text-xl font-bold">Reporte revisable</h2><div className="mt-4 space-y-4"><Field label="Asunto" value={report.subject} onChange={(value) => onUpdate("subject", value)} /><Field label="Resumen ejecutivo" value={report.executiveSummary} onChange={(value) => onUpdate("executiveSummary", value)} area /><Field label="Proceso" value={report.processSummary} onChange={(value) => onUpdate("processSummary", value)} area />{report.opportunities.map((opportunity, index) => <div key={`${opportunity.title}-${index}`} className="rounded-xl border border-line p-4"><Field label={`Oportunidad ${index + 1}`} value={opportunity.title} onChange={(value) => onUpdate("opportunities", report.opportunities.map((item, itemIndex) => itemIndex === index ? { ...item, title: value } : item))} /><Field label="Razonamiento" value={opportunity.rationale} onChange={(value) => onUpdate("opportunities", report.opportunities.map((item, itemIndex) => itemIndex === index ? { ...item, rationale: value } : item))} area /><Field label="Impacto" value={opportunity.impact} onChange={(value) => onUpdate("opportunities", report.opportunities.map((item, itemIndex) => itemIndex === index ? { ...item, impact: value } : item))} /></div>)}<Field label="Siguiente paso" value={report.nextStep} onChange={(value) => onUpdate("nextStep", value)} area /><div className="flex flex-wrap gap-2"><Button disabled={busy} type="button" variant="outline" onClick={() => void onReview("save")}><Save className="h-4 w-4" />Guardar borrador</Button><Button disabled={busy || !canSend} type="button" onClick={() => void onReview("approve-and-send")}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}Aprobar y enviar</Button></div></div></div>;
}

function EmailPreview({ report }: { report: Report }) {
  return <div className="rounded-2xl border border-line bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wider text-mute">Vista previa del correo</p><article className="mt-4 rounded-xl border border-line p-6"><h2 className="font-display text-2xl font-bold text-primary">{report.subject}</h2><p className="mt-4 leading-relaxed text-text-2">{report.executiveSummary}</p><h3 className="mt-6 font-semibold text-primary">Proceso analizado</h3><p className="mt-2 leading-relaxed text-text-2">{report.processSummary}</p>{report.opportunities.map((item) => <div key={item.title} className="mt-4 rounded-lg bg-bg-2 p-4"><strong>{item.title}</strong><p className="mt-2 text-sm text-text-2">{item.rationale}</p><p className="mt-2 text-xs text-mute">{item.impact} · {item.confidence}</p></div>)}</article></div>;
}

function EmptySelection() { return <div className="flex min-h-96 items-center justify-center rounded-2xl border border-dashed border-line-2 bg-white text-text-2"><CheckCircle2 className="mr-2 h-5 w-5" />Selecciona una evaluación</div>; }
function Alert({ message }: { message: string }) { return <p role="alert" className="rounded-xl border border-rose/20 bg-rose/10 p-4 text-sm text-rose">{message}</p>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><p className="text-xs uppercase tracking-wider text-mute">{label}</p><p className="mt-1 font-semibold text-primary">{value}</p></div>; }
function Field({ label, value, onChange, area }: { label: string; value: string; onChange(value: string): void; area?: boolean }) { return <label className="block text-sm font-medium"><span className="mb-1 block">{label}</span>{area ? <textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-28 w-full rounded-lg border border-line p-3" /> : <input value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-lg border border-line px-3" />}</label>; }
