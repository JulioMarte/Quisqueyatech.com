"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Copy, KeyRound, Loader2, RefreshCw, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/section";
import { adminRequest } from "@/lib/client/admin-response";

type Agent = { keyId: string; name: string; prefix: string; status: "pending" | "active" | "revoked"; requestLimit: number; uploadLimit: number; createdAt: number; lastUsedAt?: number; pendingRotation?: boolean; pendingExpiresAt?: number };
type PendingCredential = { keyId: string; token: string; activationId: string; expiresInSeconds: number };

export function AgentManager() {
  const secretDialog = useRef<HTMLDialogElement>(null), revokeDialog = useRef<HTMLDialogElement>(null);
  const [agents, setAgents] = useState<Agent[]>([]), [name, setName] = useState(""), [requestLimit, setRequestLimit] = useState(120), [uploadLimit, setUploadLimit] = useState(10);
  const [busyRows, setBusyRows] = useState<Record<string, boolean>>({}), [creating, setCreating] = useState(false), [pending, setPending] = useState<PendingCredential | null>(null), [revokeKey, setRevokeKey] = useState<string | null>(null), [copied, setCopied] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");

  async function load() { try { setAgents(await adminRequest<Agent[]>("/api/admin/v1/agents", { cache: "no-store" })); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar los agentes."); } }
  useEffect(() => { queueMicrotask(() => void load()); }, []);
  useEffect(() => { if (pending && secretDialog.current && !secretDialog.current.open) secretDialog.current.showModal(); }, [pending]);
  useEffect(() => { if (revokeKey && revokeDialog.current && !revokeDialog.current.open) revokeDialog.current.showModal(); }, [revokeKey]);

  async function create(event: React.FormEvent) {
    event.preventDefault(); setCreating(true); setError(""); setNotice("");
    try { const data = await adminRequest<PendingCredential>("/api/admin/v1/agents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, requestLimit, uploadLimit }) }); setName(""); setPending(data); setCopied(false); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo preparar la credencial."); }
    finally { setCreating(false); }
  }

  async function rowAction(keyId: string, action: "rotate" | "revoke" | "limits", limits?: { requestLimit: number; uploadLimit: number }) {
    if (busyRows[keyId]) return; setBusyRows(current => ({ ...current, [keyId]: true })); setError(""); setNotice("");
    try {
      if (action === "rotate") { const data = await adminRequest<PendingCredential>(`/api/admin/v1/agents/${keyId}`, { method: "POST" }); setPending(data); setCopied(false); }
      else if (action === "revoke") { await adminRequest(`/api/admin/v1/agents/${keyId}`, { method: "DELETE" }); setRevokeKey(null); revokeDialog.current?.close(); setNotice("Credencial revocada."); }
      else if (limits) { await adminRequest(`/api/admin/v1/agents/${keyId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "limits", ...limits }) }); setNotice("Límites actualizados."); }
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo actualizar la credencial."); }
    finally { setBusyRows(current => ({ ...current, [keyId]: false })); }
  }

  async function activate() {
    if (!pending || busyRows[pending.keyId]) return; setBusyRows(current => ({ ...current, [pending.keyId]: true })); setError("");
    try { await adminRequest(`/api/admin/v1/agents/${pending.keyId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "activate", activationId: pending.activationId }) }); setNotice("Credencial activada. La clave anterior ya no funciona."); setPending(null); secretDialog.current?.close(); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo activar la credencial."); }
    finally { setBusyRows(current => ({ ...current, [pending?.keyId || ""]: false })); }
  }

  async function copySecret() { if (!pending) return; try { await navigator.clipboard.writeText(pending.token); setCopied(true); setNotice("Clave copiada. Actívala cuando confirmes que está guardada."); } catch { setError("No se pudo copiar. Selecciona la clave y cópiala manualmente."); } }
  function closePending() { setPending(null); secretDialog.current?.close(); setNotice("La credencial pendiente no fue activada; la anterior sigue funcionando. La pendiente expirará automáticamente."); }

  return <Section className="min-h-screen bg-bg-2 py-10"><Container className="max-w-5xl">
    <div className="flex items-center gap-3"><Bot className="h-7 w-7 text-tech" /><div><h1 className="font-display text-3xl font-bold text-primary">Agentes de contenido</h1><p className="mt-1 text-text-2">Las claves nuevas no funcionan hasta que confirmes su activación.</p></div></div>
    <form onSubmit={create} className="mt-8 grid gap-3 rounded-xl border border-line bg-white p-5 sm:grid-cols-[1fr_150px_150px_auto] sm:items-end">
      <Field label="Nombre" value={name} onChange={setName} min={2} max={80} />
      <NumberField label="Solicitudes/h" value={requestLimit} min={10} max={1000} onChange={setRequestLimit} />
      <NumberField label="Subidas/h" value={uploadLimit} min={1} max={100} onChange={setUploadLimit} />
      <Button disabled={creating}>{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}Preparar</Button>
    </form>
    {error ? <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}</p> : null}
    {notice ? <p role="status" className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p> : null}
    <div className="mt-6 space-y-3">{agents.length ? agents.map(agent => <AgentRow key={`${agent.keyId}-${agent.requestLimit}-${agent.uploadLimit}`} agent={agent} busy={Boolean(busyRows[agent.keyId])} onRotate={() => void rowAction(agent.keyId, "rotate")} onRevoke={() => setRevokeKey(agent.keyId)} onLimits={(limits) => void rowAction(agent.keyId, "limits", limits)} />) : <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-text-2">No hay agentes configurados.</p>}</div>
  </Container>
  <dialog ref={secretDialog} onCancel={event => { event.preventDefault(); closePending(); }} className="fixed inset-0 z-50 m-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl backdrop:bg-primary/70">
    <h2 className="font-display text-2xl font-bold text-primary">Guarda y activa esta clave</h2><p className="mt-2 text-sm text-text-2">La clave pendiente vence en 30 minutos. La clave anterior seguirá funcionando hasta activar esta.</p><code className="mt-4 block select-all break-all rounded-lg bg-bg-2 p-4 text-sm">{pending?.token}</code>
    <div className="mt-5 flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => void copySecret()}><Copy className="h-4 w-4" />{copied ? "Copiada" : "Copiar"}</Button><Button type="button" variant="outline" onClick={closePending}>Cerrar sin activar</Button><Button type="button" disabled={!copied || Boolean(pending && busyRows[pending.keyId])} onClick={() => void activate()}>{pending && busyRows[pending.keyId] ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}Activar clave</Button></div>
  </dialog>
  <dialog ref={revokeDialog} onCancel={() => setRevokeKey(null)} className="fixed inset-0 z-50 m-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-xl backdrop:bg-primary/70"><h2 className="font-display text-xl font-bold text-primary">Revocar credencial</h2><p className="mt-3 text-text-2">La revocación es inmediata y también elimina cualquier rotación pendiente.</p><div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setRevokeKey(null); revokeDialog.current?.close(); }}>Cancelar</Button><Button type="button" onClick={() => revokeKey && void rowAction(revokeKey, "revoke")}><ShieldOff className="h-4 w-4" />Revocar</Button></div></dialog>
  </Section>;
}

function AgentRow({ agent, busy, onRotate, onRevoke, onLimits }: { agent: Agent; busy: boolean; onRotate(): void; onRevoke(): void; onLimits(value: { requestLimit: number; uploadLimit: number }): void }) {
  const [requestLimit, setRequestLimit] = useState(agent.requestLimit), [uploadLimit, setUploadLimit] = useState(agent.uploadLimit);
  return <article className="rounded-xl border border-line bg-white p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><h2 className="font-semibold">{agent.name}</h2><span className={`rounded-full px-2 py-1 text-xs font-semibold ${agent.status === "active" ? "bg-emerald-100 text-emerald-900" : agent.status === "pending" ? "bg-amber-100 text-amber-900" : "bg-slate-200 text-slate-800"}`}>{agent.status === "active" ? "Activa" : agent.status === "pending" ? "Pendiente" : "Revocada"}</span>{agent.pendingRotation ? <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">Rotación pendiente</span> : null}</div><p className="mt-1 font-mono text-sm text-text-2">{agent.prefix}</p><p className="mt-1 text-xs text-text-2">Último uso: {agent.lastUsedAt ? new Date(agent.lastUsedAt).toLocaleString("es-DO") : "Nunca"}{agent.pendingExpiresAt ? ` · Pendiente vence ${new Date(agent.pendingExpiresAt).toLocaleTimeString("es-DO")}` : ""}</p></div><div className="flex gap-2"><Button type="button" variant="outline" disabled={busy || agent.status !== "active" || agent.pendingRotation} onClick={onRotate}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Rotar</Button>{agent.status !== "revoked" ? <Button type="button" variant="outline" disabled={busy} onClick={onRevoke}><ShieldOff className="h-4 w-4" />Revocar</Button> : null}</div></div>
    <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-[150px_150px_auto]"><NumberField label="Solicitudes/h" value={requestLimit} min={10} max={1000} onChange={setRequestLimit} /><NumberField label="Subidas/h" value={uploadLimit} min={1} max={100} onChange={setUploadLimit} /><Button type="button" variant="outline" disabled={busy || agent.status === "revoked" || (requestLimit === agent.requestLimit && uploadLimit === agent.uploadLimit)} onClick={() => onLimits({ requestLimit, uploadLimit })}>Guardar límites</Button></div>
  </article>;
}

function Field({ label, value, onChange, min, max }: { label: string; value: string; onChange(value: string): void; min: number; max: number }) { return <label className="text-sm font-semibold"><span className="mb-2 block">{label}</span><input value={value} onChange={event => onChange(event.target.value)} required minLength={min} maxLength={max} className="min-h-11 w-full rounded-lg border border-line px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tech" /></label>; }
function NumberField({ label, value, onChange, min, max }: { label: string; value: number; onChange(value: number): void; min: number; max: number }) { return <label className="text-sm font-semibold"><span className="mb-2 block">{label}</span><input type="number" value={value} onChange={event => onChange(Number(event.target.value))} required min={min} max={max} className="min-h-11 w-full rounded-lg border border-line px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tech" /></label>; }
