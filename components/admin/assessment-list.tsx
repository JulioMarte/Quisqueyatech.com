"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Eyebrow, Section } from "@/components/ui/section";
import { adminRequest, type AdminPage } from "@/lib/client/admin-response";

type Summary = {
  assessmentId: string;
  status: string;
  reportStatus?: string;
  coverageScore?: number;
  createdAt: number;
  completedAt?: number;
  lead: { firstName: string; lastName: string; company?: string; email: string } | null;
};

export function AssessmentList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const checkAllRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Summary[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [isDone, setIsDone] = useState(true),
    [pageCursor, setPageCursor] = useState<string | null>(null),
    [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);
  const [query, setQuery] = useState(searchParams.get("q") || ""),
    [assessmentFilter, setAssessmentFilter] = useState(searchParams.get("estado") || ""),
    [reportFilter, setReportFilter] = useState(searchParams.get("reporte") || "");
  const [selected, setSelected] = useState<Set<string>>(new Set()),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<{ text: string; kind: "error" | "success" } | null>(null);
  const load = useCallback(
    async (next: string | null = null) => {
      setLoading(true);
      try {
        const page = await adminRequest<AdminPage<Summary>>(
          `/api/admin/v1/assessments?limit=25${reportFilter ? `&status=${encodeURIComponent(reportFilter)}` : ""}${next ? `&cursor=${encodeURIComponent(next)}` : ""}`,
          { cache: "no-store" },
        );
        setItems(page.items);
        setCursor(page.continueCursor || null);
        setIsDone(page.isDone);
        setSelected(new Set());
      } catch (error) {
        setMessage({
          text: error instanceof Error ? error.message : "No se pudieron cargar las evaluaciones.",
          kind: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [reportFilter],
  );
  useEffect(() => {
    queueMicrotask(() => void load(pageCursor));
  }, [load, pageCursor]);
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (assessmentFilter) params.set("estado", assessmentFilter);
    if (reportFilter) params.set("reporte", reportFilter);
    window.history.replaceState({}, "", `/admin/evaluaciones${params.size ? `?${params}` : ""}`);
  }, [query, assessmentFilter, reportFilter]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    return items.filter(
      (item) =>
        (!assessmentFilter || item.status === assessmentFilter) &&
        (!needle ||
          [item.lead?.firstName, item.lead?.lastName, item.lead?.company, item.lead?.email]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase("es")
            .includes(needle)),
    );
  }, [items, query, assessmentFilter]);
  const selectable = filtered
    .filter((item) => item.reportStatus !== "sending")
    .map((item) => item.assessmentId);
  const selectedItems = items.filter((item) => selected.has(item.assessmentId));
  const allSelected = selectable.length > 0 && selectable.every((id) => selected.has(id));
  useEffect(() => {
    if (checkAllRef.current) checkAllRef.current.indeterminate = selected.size > 0 && !allSelected;
  }, [allSelected, selected.size]);
  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function navigate(item: Summary) {
    const back = window.location.search;
    router.push(
      `/admin/evaluaciones/${item.assessmentId}${back ? `?volver=${encodeURIComponent(back)}` : ""}`,
    );
  }
  async function deleteIds(ids: string[]) {
    setBusy(true);
    try {
      const result = await adminRequest<{
        deleted: string[];
        failed: { assessmentId: string; reason: string }[];
      }>("/api/admin/v1/assessments/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentIds: ids }),
      });
      const removed = new Set(result.deleted);
      setItems((current) => current.filter((item) => !removed.has(item.assessmentId)));
      setSelected(new Set(result.failed.map((failure) => failure.assessmentId)));
      dialogRef.current?.close();
      setConfirmation("");
      setMessage({
        text: result.failed.length
          ? `${result.deleted.length} eliminadas; ${result.failed.length} no pudieron eliminarse.`
          : `${result.deleted.length} evaluaciones eliminadas.`,
        kind: result.failed.length ? "error" : "success",
      });
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "No se pudieron eliminar las evaluaciones.",
        kind: "error",
      });
    } finally {
      setBusy(false);
    }
  }
  const phrase = `ELIMINAR ${selected.size} EVALUACIONES`;
  return (
    <Section className="min-h-screen bg-bg-2 py-8">
      <Container className="max-w-[1600px]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Levantamiento conversacional</Eyebrow>
            <h1 className="mt-3 font-display text-3xl font-bold text-primary sm:text-4xl">
              Evaluaciones y reportes
            </h1>
            <p className="mt-2 text-text-2">
              Todas las evaluaciones realizadas por la IA, ordenadas de la más reciente a la más
              antigua.
            </p>
          </div>
          <Button variant="outline" disabled={loading} onClick={() => void load()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualizar
          </Button>
        </header>
        {message ? (
          <p
            role={message.kind === "error" ? "alert" : "status"}
            className={`mt-5 rounded-xl border p-3 text-sm ${message.kind === "error" ? "border-rose-300 bg-rose-50 text-rose-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}
          >
            {message.text}
          </p>
        ) : null}
        <section
          className="mt-7 overflow-hidden rounded-2xl border border-line bg-white shadow-sm"
          aria-label="Evaluaciones"
        >
          {selected.size ? (
            <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 bg-primary px-4 py-2 text-white">
              <p className="font-semibold">{selected.size} seleccionadas</p>
              <div className="flex gap-2">
                <button
                  className="min-h-11 rounded-lg px-4 font-semibold hover:bg-white/10"
                  onClick={() => setSelected(new Set())}
                >
                  <X className="mr-2 inline h-4 w-4" />
                  Cancelar
                </button>
                <button
                  className="min-h-11 rounded-lg bg-rose-700 px-4 font-semibold hover:bg-rose-800"
                  onClick={() => dialogRef.current?.showModal()}
                >
                  <Trash2 className="mr-2 inline h-4 w-4" />
                  Eliminar seleccionadas
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 border-b border-line p-4 md:grid-cols-[minmax(220px,1fr)_200px_200px]">
              <label className="relative">
                <span className="sr-only">Buscar evaluaciones</span>
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-mute" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar nombre, empresa o correo"
                  className="min-h-11 w-full rounded-lg border border-line pl-10 pr-3"
                />
              </label>
              <Select
                label="Estado de evaluación"
                value={assessmentFilter}
                onChange={setAssessmentFilter}
                options={[
                  ["", "Todas"],
                  ["started", "Iniciada"],
                  ["in_progress", "En progreso"],
                  ["finalizing", "Finalizando"],
                  ["completed", "Completada"],
                  ["finalization_failed", "Fallida"],
                ]}
              />
              <Select
                label="Estado del reporte"
                value={reportFilter}
                onChange={(value) => {
                  setReportFilter(value);
                  setPageCursor(null);
                  setCursorHistory([]);
                }}
                options={[
                  ["", "Todos"],
                  ["collecting", "Recopilando"],
                  ["pending_draft", "Borrador pendiente"],
                  ["review_pending", "En revisión"],
                  ["sending", "Enviando"],
                  ["send_failed", "Envío fallido"],
                  ["sent", "Enviado"],
                ]}
              />
            </div>
          )}
          {loading && !items.length ? (
            <TableSkeleton />
          ) : filtered.length ? (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-bg-2 text-xs uppercase tracking-wide text-mute">
                    <tr>
                      <th className="w-12 px-4 py-3">
                        <input
                          ref={checkAllRef}
                          type="checkbox"
                          aria-label="Seleccionar página visible"
                          checked={allSelected}
                          onChange={() =>
                            setSelected(allSelected ? new Set() : new Set(selectable))
                          }
                        />
                      </th>
                      <th className="px-4 py-3">Contacto</th>
                      <th className="px-4 py-3">Fecha y duración</th>
                      <th className="px-4 py-3">Evaluación</th>
                      <th className="px-4 py-3">Reporte</th>
                      <th className="px-4 py-3">Completitud</th>
                      <th className="w-20 px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                      <tr
                        key={item.assessmentId}
                        tabIndex={0}
                        aria-label={`Abrir evaluación de ${name(item)}`}
                        onClick={() => navigate(item)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            navigate(item);
                          }
                        }}
                        className="cursor-pointer border-t border-line hover:bg-bg-2 focus-visible:bg-larimar-soft"
                      >
                        <td
                          className="px-4 py-4"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            aria-label={`Seleccionar evaluación de ${name(item)}`}
                            disabled={item.reportStatus === "sending"}
                            checked={selected.has(item.assessmentId)}
                            onChange={() => toggle(item.assessmentId)}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-primary">{name(item)}</p>
                          <p className="mt-1 text-xs text-mute">
                            {item.lead?.company || "Sin empresa"} ·{" "}
                            {item.lead?.email || "Sin correo"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          {date(item.createdAt)}
                          <p className="mt-1 text-xs text-mute">
                            {item.completedAt
                              ? duration(item.completedAt - item.createdAt)
                              : "En curso"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <Badge value={item.status} />
                        </td>
                        <td className="px-4 py-4">
                          <Badge value={item.reportStatus || "collecting"} />
                        </td>
                        <td className="px-4 py-4">
                          <Progress value={item.coverageScore ?? 0} />
                        </td>
                        <td
                          className="px-4 py-4 text-right"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            aria-label={`Eliminar evaluación de ${name(item)}`}
                            disabled={selected.size > 0 || item.reportStatus === "sending"}
                            className="min-h-11 min-w-11 rounded-lg text-rose-800 hover:bg-rose-50 disabled:opacity-40"
                            onClick={() => {
                              setSelected(new Set([item.assessmentId]));
                              dialogRef.current?.showModal();
                            }}
                          >
                            <Trash2 className="mx-auto h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-3 p-3 md:hidden">
                {filtered.map((item) => (
                  <article
                    key={item.assessmentId}
                    tabIndex={0}
                    onClick={() => navigate(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") navigate(item);
                    }}
                    className="cursor-pointer rounded-xl border border-line p-4"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar evaluación de ${name(item)}`}
                        disabled={item.reportStatus === "sending"}
                        checked={selected.has(item.assessmentId)}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => toggle(item.assessmentId)}
                      />
                      <div className="min-w-0 flex-1">
                        <h2 className="font-semibold text-primary">{name(item)}</h2>
                        <p className="truncate text-sm text-text-2">
                          {item.lead?.company || "Sin empresa"}
                        </p>
                      </div>
                      <Progress value={item.coverageScore ?? 0} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge value={item.status} />
                      <Badge value={item.reportStatus || "collecting"} />
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-mute">{date(item.createdAt)}</span>
                      <button
                        aria-label={`Eliminar evaluación de ${name(item)}`}
                        disabled={selected.size > 0 || item.reportStatus === "sending"}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelected(new Set([item.assessmentId]));
                          dialogRef.current?.showModal();
                        }}
                        className="min-h-11 min-w-11 rounded-lg text-rose-800"
                      >
                        <Trash2 className="mx-auto h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p className="p-10 text-center text-text-2">
              No hay evaluaciones que coincidan con los filtros.
            </p>
          )}
          {!isDone ? (
            <div className="border-t border-line p-4 text-center">
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  disabled={loading || !cursorHistory.length}
                  onClick={() => {
                    const previous = cursorHistory.at(-1) ?? null;
                    setCursorHistory((current) => current.slice(0, -1));
                    setPageCursor(previous);
                  }}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  disabled={loading || isDone || !cursor}
                  onClick={() => {
                    setCursorHistory((current) => [...current, pageCursor]);
                    setPageCursor(cursor);
                  }}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : cursorHistory.length ? (
            <div className="border-t border-line p-4">
              <Button
                variant="outline"
                disabled={loading}
                onClick={() => {
                  const previous = cursorHistory.at(-1) ?? null;
                  setCursorHistory((current) => current.slice(0, -1));
                  setPageCursor(previous);
                }}
              >
                Anterior
              </Button>
            </div>
          ) : null}
        </section>
      </Container>
      <dialog
        ref={dialogRef}
        className="fixed inset-0 z-50 m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-white p-6 shadow-xl backdrop:bg-primary/70"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-800">
          <Trash2 className="h-5 w-5" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-bold text-primary">
          Eliminar {selected.size === 1 ? "evaluación" : `${selected.size} evaluaciones`}
        </h2>
        <p className="mt-3 text-sm leading-6 text-text-2">
          Esta acción elimina permanentemente sesiones, transcripciones, telemetría y audio.{" "}
          {selectedItems.some((item) => item.reportStatus === "sent")
            ? "La selección incluye reportes cuyos correos ya fueron enviados."
            : "No se puede deshacer."}
        </p>
        <label className="mt-4 block text-sm font-medium">
          Escribe <strong>{phrase}</strong> para confirmar
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-lg border border-line px-3"
          />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              dialogRef.current?.close();
              setConfirmation("");
              if (selected.size === 1) setSelected(new Set());
            }}
          >
            Cancelar
          </Button>
          <Button
            disabled={busy || confirmation !== phrase}
            className="bg-rose-700 text-white hover:bg-rose-800"
            onClick={() => void deleteIds([...selected])}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Eliminar definitivamente
          </Button>
        </div>
      </dialog>
    </Section>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  options: string[][];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-11 rounded-lg border border-line bg-white px-3 text-sm font-medium"
    >
      {options.map(([key, text]) => (
        <option key={key} value={key}>
          {text}
        </option>
      ))}
    </select>
  );
}
function Badge({ value }: { value: string }) {
  const failed = value.includes("failed"),
    done = value === "completed" || value === "sent",
    active = ["in_progress", "finalizing", "sending"].includes(value);
  const Icon = failed ? AlertCircle : done ? CheckCircle2 : active ? Clock3 : CircleDashed;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${failed ? "border-rose-200 bg-rose-50 text-rose-800" : done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : active ? "border-sky-200 bg-sky-50 text-sky-800" : "border-slate-200 bg-slate-50 text-slate-700"}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {(
        {
          started: "Iniciada",
          in_progress: "En progreso",
          finalizing: "Finalizando",
          completed: "Completada",
          finalization_failed: "Fallida",
          collecting: "Recopilando",
          pending_draft: "Borrador pendiente",
          review_pending: "En revisión",
          sending: "Enviando",
          send_failed: "Envío fallido",
          sent: "Enviado",
        } as Record<string, string>
      )[value] || value}
    </span>
  );
}
function Progress({ value }: { value: number }) {
  return (
    <div className="min-w-20">
      <span className="text-xs font-bold text-primary">{value}%</span>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <span
          className="block h-full rounded-full bg-tech"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}
function TableSkeleton() {
  return (
    <div aria-label="Cargando evaluaciones" className="space-y-1 p-4">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-lg bg-bg-2" />
      ))}
    </div>
  );
}
function name(item: Summary) {
  return item.lead
    ? `${item.lead.firstName || "Visitante"} ${item.lead.lastName || ""}`.trim()
    : "Visitante";
}
function date(value: number) {
  return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" }).format(
    value,
  );
}
function duration(ms: number) {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}
