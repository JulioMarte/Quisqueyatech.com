"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, Loader2, RefreshCw, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Eyebrow, Section } from "@/components/ui/section";
import { adminRequest, type AdminPage } from "@/lib/client/admin-response";

type Item = {
  bookingId: string;
  start: string;
  end?: string;
  startAt?: number;
  endAt?: number;
  timezone: string;
  channel: string;
  status: string;
  lead: {
    firstName: string;
    lastName: string;
    company?: string;
    email: string;
    phone: string;
  } | null;
};
type Delivery = {
  eventId: string;
  type: string;
  status: string;
  attempts: number;
  lastStatusCode?: number;
  lastError?: string;
};
type Detail = Item & {
  audit: { _id: string; action: string; actorEmail: string; createdAt: number }[];
  deliveries: Delivery[];
};
type Scope = "upcoming" | "past" | "all";
const statuses = ["", "confirmed", "rescheduled", "cancelled", "completed", "no_show"];

export function AgendaAdmin() {
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [status, setStatus] = useState("");
  const [scope, setScope] = useState<Scope>("upcoming");
  const [channel, setChannel] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [isDone, setIsDone] = useState(true);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const cursorRef = useRef("");
  const selectedBookingIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    selectedBookingIdRef.current = selected?.bookingId;
  }, [selected?.bookingId]);

  const detail = useCallback(async (id: string) => {
    const value = await adminRequest<Detail>(
      `/api/admin/v1/agenda?bookingId=${encodeURIComponent(id)}`,
      { cache: "no-store" },
    );
    setSelected(value);
  }, []);

  const load = useCallback(
    async (append = false) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ limit: "30" });
        if (status) params.set("status", status);
        if (channel) params.set("channel", channel);
        if (search.trim()) params.set("search", search.trim());
        let fromAt = from ? new Date(`${from}T00:00:00`).getTime() : undefined;
        let toAt = to ? new Date(`${to}T23:59:59.999`).getTime() : undefined;
        const now = Date.now();
        if (scope === "upcoming") fromAt = Math.max(fromAt ?? 0, now);
        if (scope === "past") toAt = Math.min(toAt ?? Number.MAX_SAFE_INTEGER, now);
        if (fromAt !== undefined) params.set("fromAt", String(fromAt));
        if (toAt !== undefined) params.set("toAt", String(toAt));
        if (append && cursorRef.current) params.set("cursor", cursorRef.current);
        const page = await adminRequest<AdminPage<Item>>(`/api/admin/v1/agenda?${params}`, {
          cache: "no-store",
        });
        setItems((current) => (append ? [...current, ...page.items] : page.items));
        const nextCursor = page.continueCursor || "";
        cursorRef.current = nextCursor;
        setIsDone(page.isDone);
        if (selectedBookingIdRef.current) await detail(selectedBookingIdRef.current);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "No se pudo cargar la agenda.");
      } finally {
        setLoading(false);
      }
    },
    [channel, detail, from, scope, search, status, to],
  );

  useEffect(() => {
    const run = () => void load(false);
    queueMicrotask(run);
    const timer = window.setInterval(run, 10_000);
    window.addEventListener("focus", run);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", run);
    };
  }, [load]);

  async function transition(next: string) {
    if (!selected || acting) return;
    const action = label(next).toLowerCase();
    if (!window.confirm(`¿Confirmas que deseas marcar esta cita como ${action}?`)) return;
    setActing(true);
    setError("");
    try {
      await adminRequest("/api/admin/v1/agenda", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: selected.bookingId, status: next }),
      });
      setMessage("Cita actualizada correctamente.");
      await Promise.all([load(false), detail(selected.bookingId)]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo actualizar la cita.");
    } finally {
      setActing(false);
    }
  }

  async function retryWebhook(eventId: string) {
    if (acting || !window.confirm("¿Reenviar este evento al webhook configurado?")) return;
    setActing(true);
    setError("");
    try {
      await adminRequest("/api/admin/v1/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      setMessage("Webhook puesto en cola para reenvío.");
      if (selected) await detail(selected.bookingId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo reenviar el webhook.");
    } finally {
      setActing(false);
    }
  }

  return (
    <Section className="min-h-screen bg-bg-2 py-8">
      <Container className="max-w-[1600px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Operación en vivo</Eyebrow>
            <h1 className="mt-3 font-display text-4xl font-bold text-primary">Agenda</h1>
            <p className="mt-2 text-text-2">
              Citas, historial administrativo y entregas de automatización.
            </p>
          </div>
          <Button variant="outline" disabled={loading} onClick={() => void load(false)}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualizar
          </Button>
        </div>
        {message ? (
          <p
            role="status"
            className="mt-4 rounded-lg border border-success/30 bg-success-soft p-3 text-sm text-success"
          >
            {message}
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_repeat(5,auto)]">
          <label className="relative">
            <span className="sr-only">Buscar contacto</span>
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-mute" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Contacto, empresa, correo o ID"
              className="min-h-11 w-full rounded-lg border border-line bg-white pl-10 pr-3"
            />
          </label>
          <Filter
            label="Período"
            value={scope}
            onChange={setScope}
            options={[
              ["upcoming", "Próximas"],
              ["past", "Pasadas"],
              ["all", "Todas"],
            ]}
          />
          <Filter
            label="Estado"
            value={status}
            onChange={setStatus}
            options={statuses.map((value) => [value, value ? label(value) : "Todos los estados"])}
          />
          <Filter
            label="Canal"
            value={channel}
            onChange={setChannel}
            options={[
              ["", "Todos los canales"],
              ["web", "Web"],
              ["phone", "Teléfono"],
            ]}
          />
          <label className="text-xs font-semibold text-text-2">
            Desde
            <input
              aria-label="Fecha inicial"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block min-h-11 rounded-lg border border-line bg-white px-3 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-text-2">
            Hasta
            <input
              aria-label="Fecha final"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block min-h-11 rounded-lg border border-line bg-white px-3 text-sm"
            />
          </label>
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
          <aside
            className="max-h-[70vh] overflow-y-auto rounded-2xl border border-line bg-white p-3"
            aria-label="Citas"
          >
            {items.length ? (
              items.map((item) => (
                <button
                  key={item.bookingId}
                  type="button"
                  onClick={() => void detail(item.bookingId)}
                  className={`mb-2 min-h-16 w-full cursor-pointer rounded-xl p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tech ${selected?.bookingId === item.bookingId ? "bg-primary text-white" : "hover:bg-bg-2"}`}
                >
                  <strong className="block">
                    {item.lead?.firstName} {item.lead?.lastName}
                  </strong>
                  <span className="mt-1 block text-xs opacity-80">
                    {format(item.startAt ?? item.start, item.timezone)} · {label(item.status)} ·{" "}
                    {item.channel}
                  </span>
                </button>
              ))
            ) : (
              <p className="p-8 text-center text-text-2">No hay citas con estos filtros.</p>
            )}
            {!isDone ? (
              <Button
                variant="outline"
                className="mt-2 w-full"
                disabled={loading}
                onClick={() => void load(true)}
              >
                Cargar más
              </Button>
            ) : null}
          </aside>
          <main>
            {selected ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-line bg-white p-5">
                  <div className="flex flex-wrap justify-between gap-4">
                    <div>
                      <h2 className="font-display text-2xl font-bold">
                        {selected.lead?.firstName} {selected.lead?.lastName}
                      </h2>
                      <p className="text-text-2">
                        {selected.lead?.company || "Sin empresa"} · {selected.lead?.email} ·{" "}
                        {selected.lead?.phone}
                      </p>
                      <p className="mt-2 font-semibold">
                        {format(selected.startAt ?? selected.start, selected.timezone)} ·{" "}
                        {label(selected.status)}
                      </p>
                    </div>
                    <CalendarDays className="h-7 w-7 text-tech" />
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button disabled={acting} onClick={() => void transition("completed")}>
                      Completar
                    </Button>
                    <Button
                      variant="outline"
                      disabled={acting}
                      onClick={() => void transition("no_show")}
                    >
                      No asistió
                    </Button>
                    <Button
                      variant="outline"
                      disabled={acting}
                      onClick={() => void transition("cancelled")}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Panel title="Historial">
                    {selected.audit.map((a) => (
                      <p key={a._id} className="border-b border-line py-2 text-sm">
                        {label(a.action)} · {a.actorEmail}
                        <br />
                        <span className="text-mute">
                          {new Date(a.createdAt).toLocaleString("es-DO")}
                        </span>
                      </p>
                    ))}
                  </Panel>
                  <Panel title="Webhooks">
                    {selected.deliveries.length ? (
                      selected.deliveries.map((d) => (
                        <div
                          key={d.eventId}
                          className="flex items-start justify-between gap-3 border-b border-line py-2 text-sm"
                        >
                          <p>
                            {d.type} · {d.status} · {d.attempts} intento(s)
                            {d.lastStatusCode ? <> · HTTP {d.lastStatusCode}</> : null}
                            {d.lastError ? (
                              <>
                                <br />
                                <span className="text-red-800">{d.lastError}</span>
                              </>
                            ) : null}
                          </p>
                          <button
                            type="button"
                            disabled={acting}
                            onClick={() => void retryWebhook(d.eventId)}
                            aria-label={`Reenviar ${d.type}`}
                            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-line hover:bg-bg-2 focus-visible:ring-2 focus-visible:ring-tech disabled:opacity-50"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-mute">Sin eventos.</p>
                    )}
                  </Panel>
                </div>
              </div>
            ) : (
              <div className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-line bg-white text-text-2">
                Selecciona una cita
              </div>
            )}
          </main>
        </div>
      </Container>
    </Section>
  );
}

function Filter<T extends string>({
  label: text,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: string[][];
}) {
  return (
    <label className="text-xs font-semibold text-text-2">
      {text}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="mt-1 block min-h-11 rounded-lg border border-line bg-white px-3 text-sm"
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h3 className="font-display text-xl font-bold">{title}</h3>
      <div className="mt-3 max-h-72 overflow-y-auto">{children}</div>
    </section>
  );
}
function label(value: string) {
  return (
    (
      {
        confirmed: "Confirmada",
        rescheduled: "Reprogramada",
        cancelled: "Cancelada",
        completed: "Completada",
        no_show: "No asistió",
        created: "Creada",
      } as Record<string, string>
    )[value] || value
  );
}
function format(value: string | number, timezone: string) {
  try {
    return new Intl.DateTimeFormat("es-DO", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString("es-DO");
  }
}
