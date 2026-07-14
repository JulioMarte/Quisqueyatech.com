"use client";
import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/section";
import { adminRequest } from "@/lib/client/admin-response";
type Agent = {
  keyId: string;
  name: string;
  prefix: string;
  status: "active" | "revoked";
  requestLimit: number;
  uploadLimit: number;
  createdAt: number;
  lastUsedAt?: number;
};
export function AgentManager() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [agents, setAgents] = useState<Agent[]>([]),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [secret, setSecret] = useState<string | null>(null),
    [copied, setCopied] = useState(false),
    [error, setError] = useState("");
  async function load() {
    try { setAgents(await adminRequest<Agent[]>("/api/admin/v1/agents", { cache: "no-store" })); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar los agentes."); }
  }
  useEffect(() => {
    queueMicrotask(() => void load());
  }, []);
  useEffect(() => {
    if (secret && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [secret]);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await adminRequest<{ keyId: string; token: string }>("/api/admin/v1/agents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, requestLimit: 120, uploadLimit: 10 }) });
      setName("");
      setSecret(data.token);
      setCopied(false);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear la credencial."); }
    finally { setBusy(false); }
  }
  async function act(keyId: string, method: "POST" | "DELETE") {
    if (
      method === "DELETE" &&
      !window.confirm("¿Revocar esta credencial inmediatamente?")
    )
      return;
    setError("");
    try { const data = await adminRequest<{ token?: string }>(`/api/admin/v1/agents/${keyId}`, { method }); if (data.token) { setSecret(data.token); setCopied(false); } await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo actualizar la credencial."); }
  }
  function closeSecret() {
    if (
      !copied &&
      !window.confirm(
        "La clave no volverá a mostrarse. ¿Cerrar sin confirmar que fue copiada?",
      )
    )
      return;
    setSecret(null);
  }
  return (
    <Section className="min-h-screen bg-bg-2 py-10">
      <Container className="max-w-5xl">
        <div className="flex items-center gap-3">
          <Bot className="h-7 w-7 text-tech" />
          <div>
            <h1 className="font-display text-3xl font-bold text-primary">
              Agentes de contenido
            </h1>
            <p className="mt-1 text-text-2">
              Credenciales limitadas a borradores y revisión editorial.
            </p>
          </div>
        </div>
        <form
          onSubmit={create}
          className="mt-8 flex flex-col gap-3 rounded-xl border border-line bg-white p-5 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label htmlFor="agent-name" className="text-sm font-semibold">
              Nombre del agente
            </label>
            <input
              id="agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={80}
              className="mt-2 min-h-11 w-full rounded-lg border border-line px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tech"
            />
          </div>
          <Button disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Crear credencial
          </Button>
        </form>
        {error ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
        <div className="mt-6 space-y-3">
          {agents.map((agent) => (
            <article
              key={agent.keyId}
              className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">{agent.name}</h2>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${agent.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}
                  >
                    {agent.status === "active" ? "Activa" : "Revocada"}
                  </span>
                </div>
                <p className="mt-1 font-mono text-sm text-text-2">
                  {agent.prefix}
                </p>
                <p className="mt-1 text-xs text-text-2">
                  Último uso:{" "}
                  {agent.lastUsedAt
                    ? new Date(agent.lastUsedAt).toLocaleString("es-DO")
                    : "Nunca"}{" "}
                  · {agent.requestLimit} solicitudes/h · {agent.uploadLimit}{" "}
                  subidas/h
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void act(agent.keyId, "POST")}
                >
                  <RefreshCw className="h-4 w-4" />
                  Rotar
                </Button>
                {agent.status === "active" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void act(agent.keyId, "DELETE")}
                  >
                    <ShieldOff className="h-4 w-4" />
                    Revocar
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      </Container>
      {secret && (
        <dialog
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="secret-title"
          onCancel={(event) => { event.preventDefault(); closeSecret(); }}
          className="fixed inset-0 z-50 m-auto w-full max-w-xl rounded-2xl bg-transparent p-4 backdrop:bg-primary/60"
        >
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <h2
              id="secret-title"
              className="font-display text-2xl font-bold text-primary"
            >
              Guarda esta clave ahora
            </h2>
            <p className="mt-2 text-sm text-text-2">
              Por seguridad solo se muestra una vez.
            </p>
            <code className="mt-4 block break-all rounded-lg bg-bg-2 p-4 text-sm">
              {secret}
            </code>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(secret);
                  setCopied(true);
                }}
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copiada" : "Copiar"}
              </Button>
              <Button type="button" onClick={closeSecret}>
                Ya la guardé
              </Button>
            </div>
          </div>
        </dialog>
      )}
    </Section>
  );
}
