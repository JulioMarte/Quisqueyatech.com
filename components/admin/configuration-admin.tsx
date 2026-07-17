"use client";

import { useEffect, useMemo, useState } from "react";
import { FlaskConical, KeyRound, Loader2, Plus, Save, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Eyebrow, Section } from "@/components/ui/section";
import { adminRequest } from "@/lib/client/admin-response";

type Day = { weekday: number; enabled: boolean; start: string; end: string };
type Exception = {
  _id?: string;
  date: string;
  available: boolean;
  start?: string;
  end?: string;
  reason?: string;
};
type Rules = {
  timezone: string;
  durationMinutes: number;
  bufferMinutes: number;
  minimumNoticeHours: number;
  horizonDays: number;
  weekly: Day[];
  exceptions?: Exception[];
};
type Masked = { configured: boolean; lastFour: string };
const names = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const secretFields = [
  ["ultravoxApiKey", "Ultravox API key"],
  ["ultravoxWebhookSecret", "Ultravox webhook secret"],
  ["livekitApiKey", "LiveKit API key"],
  ["livekitApiSecret", "LiveKit API secret"],
  ["geminiApiKey", "Gemini API key"],
  ["webhookSecret", "Secreto HMAC de salida"],
] as const;

export function ConfigurationAdmin() {
  const [rules, setRules] = useState<Rules | null>(null);
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [masked, setMasked] = useState<Record<string, Masked>>({});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [exception, setException] = useState<Exception>({ date: "", available: false, reason: "" });
  const [busy, setBusy] = useState(true);
  const [testing, setTesting] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setBusy(true);
    setError("");
    try {
      const [nextRules, nextConfig] = await Promise.all([
        adminRequest<Rules>("/api/admin/v1/agenda/rules"),
        adminRequest<{ config: Record<string, unknown>; secrets: Record<string, Masked> }>(
          "/api/admin/v1/configuration",
        ),
      ]);
      setRules(nextRules);
      setConfig(nextConfig.config);
      setMasked(nextConfig.secrets);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo cargar la configuración.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    queueMicrotask(() => void load());
  }, []);

  const validation = useMemo(() => validate(rules, config), [rules, config]);
  async function save() {
    if (!rules || validation) return setError(validation || "Configuración incompleta.");
    const changed = Object.values(secrets).some(Boolean);
    if (
      changed &&
      !window.confirm("Las credenciales escritas reemplazarán las existentes. ¿Continuar?")
    )
      return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const rulePayload = {
        timezone: rules.timezone,
        durationMinutes: rules.durationMinutes,
        bufferMinutes: rules.bufferMinutes,
        minimumNoticeHours: rules.minimumNoticeHours,
        horizonDays: rules.horizonDays,
        weekly: rules.weekly,
      };
      await Promise.all([
        adminRequest("/api/admin/v1/agenda/rules", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rulePayload),
        }),
        adminRequest("/api/admin/v1/configuration", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config, secrets }),
        }),
      ]);
      setSecrets({});
      setMessage("Configuración guardada de forma segura.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  async function addException() {
    if (!exception.date) return setError("Selecciona la fecha de la excepción.");
    if (exception.available && (!exception.start || !exception.end))
      return setError("Indica hora inicial y final para una apertura especial.");
    if (exception.available && exception.start! >= exception.end!)
      return setError("La hora final debe ser posterior a la inicial.");
    setBusy(true);
    setError("");
    try {
      await adminRequest("/api/admin/v1/agenda/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exception),
      });
      setException({ date: "", available: false, reason: "" });
      setMessage("Excepción guardada.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar la excepción.");
    } finally {
      setBusy(false);
    }
  }
  async function runTest(kind: string, provider?: string) {
    setTesting(provider || kind);
    setError("");
    setMessage("");
    try {
      await adminRequest(`/api/admin/v1/configuration/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: provider ? JSON.stringify({ provider }) : undefined,
      });
      setMessage(
        provider
          ? `Conexión con ${provider} verificada.`
          : "Webhook de prueba enviado correctamente.",
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La prueba no se pudo completar.");
    } finally {
      setTesting("");
    }
  }
  if (!rules)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="sr-only">Cargando configuración</span>
      </div>
    );

  return (
    <Section className="min-h-screen bg-bg-2 py-8">
      <Container className="max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Control central</Eyebrow>
            <h1 className="mt-3 font-display text-4xl font-bold text-primary">Configuración</h1>
            <p className="mt-2 text-text-2">
              Agenda, automatizaciones y proveedores. Los secretos nunca vuelven a mostrarse.
            </p>
          </div>
          <Button disabled={busy || Boolean(validation)} onClick={() => void save()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar cambios
          </Button>
        </div>
        {validation ? (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-amber/30 bg-amber-soft p-3 text-sm text-amber-deep"
          >
            {validation}
          </p>
        ) : null}
        {message ? (
          <p
            role="status"
            className="mt-5 rounded-lg border border-success/30 bg-success-soft p-3 text-sm text-success"
          >
            {message}
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card icon={<Settings2 />} title="Reglas de agenda">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Zona horaria"
                value={rules.timezone}
                onChange={(value) => setRules({ ...rules, timezone: value })}
              />
              <NumberField
                label="Duración (minutos)"
                value={rules.durationMinutes}
                onChange={(value) => setRules({ ...rules, durationMinutes: value })}
              />
              <NumberField
                label="Separación (minutos)"
                value={rules.bufferMinutes}
                onChange={(value) => setRules({ ...rules, bufferMinutes: value })}
              />
              <NumberField
                label="Anticipación mínima (horas)"
                value={rules.minimumNoticeHours}
                onChange={(value) => setRules({ ...rules, minimumNoticeHours: value })}
              />
              <NumberField
                label="Horizonte (días)"
                value={rules.horizonDays}
                onChange={(value) => setRules({ ...rules, horizonDays: value })}
              />
            </div>
            <div className="mt-5 space-y-2">
              {[0, 1, 2, 3, 4, 5, 6].map((weekday) => {
                const day = rules.weekly.find((value) => value.weekday === weekday) || {
                  weekday,
                  enabled: false,
                  start: "09:00",
                  end: "17:00",
                };
                const update = (next: Day) =>
                  setRules({
                    ...rules,
                    weekly: [
                      ...rules.weekly.filter((value) => value.weekday !== weekday),
                      next,
                    ].sort((a, b) => a.weekday - b.weekday),
                  });
                return (
                  <div
                    key={weekday}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg border border-line p-2"
                  >
                    <label className="flex min-h-11 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={day.enabled}
                        onChange={(event) => update({ ...day, enabled: event.target.checked })}
                      />
                      {names[weekday]}
                    </label>
                    <input
                      aria-label={`Inicio ${names[weekday]}`}
                      type="time"
                      disabled={!day.enabled}
                      value={day.start}
                      onChange={(event) => update({ ...day, start: event.target.value })}
                      className="min-h-11 rounded border border-line px-2"
                    />
                    <input
                      aria-label={`Fin ${names[weekday]}`}
                      type="time"
                      disabled={!day.enabled}
                      value={day.end}
                      onChange={(event) => update({ ...day, end: event.target.value })}
                      className="min-h-11 rounded border border-line px-2"
                    />
                  </div>
                );
              })}
            </div>
          </Card>
          <div className="space-y-5">
            <Card icon={<KeyRound />} title="Voz e inteligencia">
              <Select
                label="Proveedor activo"
                value={String(config.defaultProvider || "ultravox")}
                onChange={(value) => setConfig({ ...config, defaultProvider: value })}
                options={[
                  ["ultravox", "Ultravox"],
                  ["livekit", "LiveKit"],
                  ["gemini-live", "Gemini Live"],
                ]}
              />
              <Field
                label="Ultravox API URL"
                value={String(config.ultravoxApiUrl || "https://api.ultravox.ai/api/calls")}
                onChange={(value) => setConfig({ ...config, ultravoxApiUrl: value })}
              />
              <Field
                label="Modelo Ultravox"
                value={String(config.ultravoxModel || "")}
                onChange={(value) => setConfig({ ...config, ultravoxModel: value })}
              />
              <Field
                label="Voz Ultravox"
                value={String(config.ultravoxVoice || "")}
                onChange={(value) => setConfig({ ...config, ultravoxVoice: value })}
              />
              <Field
                label="LiveKit URL"
                value={String(config.livekitUrl || "")}
                onChange={(value) => setConfig({ ...config, livekitUrl: value })}
              />
              <Field
                label="Modelo Gemini Live"
                value={String(config.geminiLiveModel || "")}
                onChange={(value) => setConfig({ ...config, geminiLiveModel: value })}
              />
              <Field
                label="Voz Gemini Live"
                value={String(config.geminiLiveVoice || "")}
                onChange={(value) => setConfig({ ...config, geminiLiveVoice: value })}
              />
              {secretFields.slice(0, 5).map(([key, label]) => (
                <Secret
                  key={key}
                  label={label}
                  masked={masked[key]}
                  value={secrets[key] || ""}
                  onChange={(value) => setSecrets({ ...secrets, [key]: value })}
                />
              ))}
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  ["ultravox", "Ultravox"],
                  ["livekit", "LiveKit"],
                  ["gemini-live", "Gemini"],
                ].map(([value, label]) => (
                  <Button
                    key={value}
                    variant="outline"
                    disabled={Boolean(testing)}
                    onClick={() => void runTest("provider-test", value)}
                  >
                    {testing === value ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FlaskConical className="h-4 w-4" />
                    )}
                    Probar {label}
                  </Button>
                ))}
              </div>
            </Card>
            <Card icon={<KeyRound />} title="Webhook de citas">
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={Boolean(config.webhookEnabled)}
                  onChange={(event) =>
                    setConfig({ ...config, webhookEnabled: event.target.checked })
                  }
                />
                Activar entregas
              </label>
              <Field
                label="URL HTTPS de n8n"
                value={String(config.webhookUrl || "")}
                onChange={(value) => setConfig({ ...config, webhookUrl: value })}
              />
              <Secret
                label="Secreto HMAC de salida"
                masked={masked.webhookSecret}
                value={secrets.webhookSecret || ""}
                onChange={(value) => setSecrets({ ...secrets, webhookSecret: value })}
              />
              <Button
                className="mt-4"
                variant="outline"
                disabled={Boolean(testing) || !Boolean(config.webhookEnabled)}
                onClick={() => void runTest("webhook-test")}
              >
                {testing === "webhook-test" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FlaskConical className="h-4 w-4" />
                )}
                Enviar webhook de prueba
              </Button>
            </Card>
          </div>
        </div>
        <div className="mt-5">
          <Card icon={<Plus />} title="Excepciones y bloqueos">
            <div className="grid gap-3 md:grid-cols-[auto_auto_auto_auto_1fr_auto]">
              <label className="text-xs font-semibold">
                Fecha
                <input
                  type="date"
                  value={exception.date}
                  onChange={(event) => setException({ ...exception, date: event.target.value })}
                  className="mt-1 block min-h-11 rounded-lg border border-line px-3"
                />
              </label>
              <label className="flex min-h-11 items-end gap-2 pb-2">
                <input
                  type="checkbox"
                  checked={exception.available}
                  onChange={(event) =>
                    setException({
                      ...exception,
                      available: event.target.checked,
                      start: event.target.checked ? exception.start || "09:00" : undefined,
                      end: event.target.checked ? exception.end || "17:00" : undefined,
                    })
                  }
                />
                Apertura especial
              </label>
              <label className="text-xs font-semibold">
                Inicio
                <input
                  aria-label="Inicio excepción"
                  type="time"
                  disabled={!exception.available}
                  value={exception.start || ""}
                  onChange={(event) => setException({ ...exception, start: event.target.value })}
                  className="mt-1 block min-h-11 rounded-lg border border-line px-3"
                />
              </label>
              <label className="text-xs font-semibold">
                Fin
                <input
                  aria-label="Fin excepción"
                  type="time"
                  disabled={!exception.available}
                  value={exception.end || ""}
                  onChange={(event) => setException({ ...exception, end: event.target.value })}
                  className="mt-1 block min-h-11 rounded-lg border border-line px-3"
                />
              </label>
              <Field
                label="Motivo opcional"
                value={exception.reason || ""}
                onChange={(value) => setException({ ...exception, reason: value })}
              />
              <Button disabled={busy} className="self-end" onClick={() => void addException()}>
                Agregar
              </Button>
            </div>
            <div className="mt-4 divide-y divide-line rounded-xl border border-line">
              {rules.exceptions?.length ? (
                rules.exceptions.map((item) => (
                  <div
                    key={item._id || item.date}
                    className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
                  >
                    <strong>{item.date}</strong>
                    <span>{item.available ? `${item.start}–${item.end}` : "Día bloqueado"}</span>
                    <span className="text-mute">{item.reason || "Sin motivo"}</span>
                  </div>
                ))
              ) : (
                <p className="p-4 text-sm text-mute">No hay excepciones configuradas.</p>
              )}
            </div>
          </Card>
        </div>
      </Container>
    </Section>
  );
}

function validate(rules: Rules | null, config: Record<string, unknown>) {
  if (!rules) return "";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: rules.timezone });
  } catch {
    return "La zona horaria no es un identificador IANA válido.";
  }
  if (rules.durationMinutes < 5 || rules.durationMinutes > 480)
    return "La duración debe estar entre 5 y 480 minutos.";
  if (rules.horizonDays < 1 || rules.horizonDays > 365)
    return "El horizonte debe estar entre 1 y 365 días.";
  if (rules.weekly.some((day) => day.enabled && day.start >= day.end))
    return "Cada día activo debe terminar después de su hora inicial.";
  if (config.webhookEnabled && !String(config.webhookUrl || "").trim())
    return "La URL del webhook es obligatoria cuando está activo.";
  return "";
}
function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h2 className="mb-5 flex items-center gap-2 font-display text-xl font-bold text-primary">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}
function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-semibold text-text-2">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block min-h-11 w-full rounded-lg border border-line px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tech"
      />
    </label>
  );
}
function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-xs font-semibold text-text-2">
      {label}
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 block min-h-11 w-full rounded-lg border border-line px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tech"
      />
    </label>
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
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <label className="mb-4 block text-xs font-semibold text-text-2">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm"
      >
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
function Secret({
  label,
  masked,
  value,
  onChange,
}: {
  label: string;
  masked?: Masked;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-4 block text-xs font-semibold text-text-2">
      {label}{" "}
      <span className={masked?.configured ? "text-success" : "text-amber-deep"}>
        {masked?.configured ? `configurada ····${masked.lastFour}` : "sin configurar"}
      </span>
      <input
        type="password"
        autoComplete="new-password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Dejar vacío para conservar"
        className="mt-1 block min-h-11 w-full rounded-lg border border-line px-3 text-sm"
      />
    </label>
  );
}
