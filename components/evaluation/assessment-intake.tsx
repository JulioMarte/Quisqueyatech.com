"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Mic2, ShieldCheck } from "lucide-react";
import { VoiceSession } from "@/components/evaluation/voice-session";
import { TurnstileField } from "@/components/security/turnstile-field";
import { Button } from "@/components/ui/button";
import { Container, Eyebrow, Section } from "@/components/ui/section";
import type { Locale } from "@/lib/i18n";

type SessionData = {
  provider: "ultravox" | "livekit" | "demo";
  assessmentId: string;
  contactEmail: string;
  locale: Locale;
  joinUrl?: string;
  roomUrl?: string;
  token?: string;
  notice?: string;
};

export function AssessmentIntake({ locale }: { locale: Locale; mode: "now" }) {
  const es = locale === "es";
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/assessment/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          locale,
          turnstileToken,
          processingConsent: data.processingConsent === "on",
          recordingConsent: data.recordingConsent === "on",
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ||
            (es
              ? "No pudimos iniciar la evaluación."
              : "We could not start the assessment."),
        );
      setSession(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  if (session) return <VoiceSession locale={locale} session={session} />;
  return (
    <Section className="bg-bg-2">
      <Container className="grid items-start gap-10 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <Eyebrow>
            {es ? "Evaluación inmediata" : "Immediate assessment"}
          </Eyebrow>
          <h1 className="mt-4 font-display text-[clamp(36px,5vw,56px)] font-bold leading-tight text-primary">
            {es
              ? "Prepara tu micrófono. Empezamos con contexto, no con una venta."
              : "Prepare your microphone. We start with context, not a sales pitch."}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-text-2">
            {es
              ? "El agente realizará un levantamiento de 12–15 minutos y te entregará tres oportunidades preliminares. Necesitamos estos datos para personalizar la sesión y enviarte el resumen."
              : "The agent runs a 12–15 minute discovery and delivers three preliminary opportunities. We need this information to personalize the session and send your summary."}
          </p>
          <div className="mt-6 space-y-3 text-sm text-text-2">
            <p className="flex gap-2">
              <ShieldCheck className="h-5 w-5 shrink-0 text-success" />
              {es
                ? "Tus datos no se venden ni se usan para entrenar modelos públicos."
                : "Your data is not sold or used to train public models."}
            </p>
            <p className="flex gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
              {es
                ? "El audio se elimina automáticamente después de 30 días."
                : "Audio is automatically deleted after 30 days."}
            </p>
          </div>
        </div>
        <form
          onSubmit={submit}
          className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="firstName"
              label={es ? "Nombre" : "First name"}
              autoComplete="given-name"
            />
            <Field
              name="lastName"
              label={es ? "Apellido" : "Last name"}
              autoComplete="family-name"
            />
            <Field
              name="company"
              label={es ? "Empresa" : "Company"}
              autoComplete="organization"
            />
            <Field
              name="role"
              label={es ? "Cargo" : "Role"}
              autoComplete="organization-title"
            />
            <Field
              name="country"
              label={es ? "País" : "Country"}
              autoComplete="country-name"
            />
            <Field
              name="email"
              label={es ? "Correo" : "Email"}
              type="email"
              autoComplete="email"
            />
            <Field
              name="phone"
              label={
                es ? "Celular internacional" : "Mobile, international format"
              }
              type="tel"
              autoComplete="tel"
              placeholder="+18095551234"
            />
            <div className="hidden">
              <Field name="website" label="Website" required={false} />
            </div>
          </div>
          <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-text-2">
            <input
              required
              name="processingConsent"
              type="checkbox"
              className="mt-1 h-4 w-4 accent-blue-600"
            />
            <span>
              {es
                ? "Acepto el procesamiento de mis datos para realizar la evaluación y recibir el resultado."
                : "I consent to data processing for the assessment and delivery of my results."}
            </span>
          </label>
          <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm text-text-2">
            <input
              required
              name="recordingConsent"
              type="checkbox"
              className="mt-1 h-4 w-4 accent-blue-600"
            />
            <span>
              {es
                ? "Acepto que la conversación sea grabada y conservada hasta 30 días para control de calidad."
                : "I consent to recording and storage for up to 30 days for quality control."}
            </span>
          </label>
          <TurnstileField onToken={setTurnstileToken} />
          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-rose-soft p-3 text-sm text-rose"
            >
              {error}
            </p>
          ) : null}
          <Button disabled={loading} size="lg" className="mt-6 w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {es ? "Preparando…" : "Preparing…"}
              </>
            ) : (
              <>
                <Mic2 className="h-4 w-4" />
                {es ? "Iniciar evaluación" : "Start assessment"}
              </>
            )}
          </Button>
          <p className="mt-3 text-center text-xs text-mute">
            {es
              ? "Al continuar aceptas nuestra política de privacidad."
              : "By continuing, you accept our privacy policy."}
          </p>
        </form>
      </Container>
    </Section>
  );
}

function Field({
  name,
  label,
  type = "text",
  autoComplete,
  placeholder,
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-text">
      <span className="mb-1.5 block">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="min-h-11 w-full rounded-lg border border-line px-3 text-base outline-none transition focus:border-tech focus:ring-2 focus:ring-larimar/25"
      />
    </label>
  );
}
