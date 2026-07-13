"use client";

import { useCallback, useState } from "react";
import {
  Check,
  Clock3,
  Headphones,
  Loader2,
  Mic2,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { VoiceSession } from "@/components/evaluation/voice-session";
import { TurnstileField } from "@/components/security/turnstile-field";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/section";
import type { Locale } from "@/lib/i18n";

type SessionData = {
  provider: "ultravox" | "livekit" | "demo";
  assessmentId: string;
  contactEmail?: string;
  locale: Locale;
  joinUrl?: string;
  roomUrl?: string;
  token?: string;
  notice?: string;
};

export function AssessmentIntake({ locale }: { locale: Locale; mode: "now" }) {
  const es = locale === "es";
  const [session, setSession] = useState<SessionData | null>(null);
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleTurnstileToken = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  async function startConference() {
    if (!consent) return;
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/assessment/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "conference",
          locale,
          turnstileToken,
          processingConsent: true,
          recordingConsent: true,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error ||
            (es
              ? "No pudimos abrir la sala de conferencia."
              : "We could not open the conference room."),
        );
      }
      setSession(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  if (session) return <VoiceSession locale={locale} session={session} />;

  const checklist = [
    { icon: Mic2, label: es ? "Micrófono habilitado" : "Microphone enabled" },
    { icon: Clock3, label: es ? "Duración: 12–15 minutos" : "Duration: 12–15 minutes" },
    { icon: Check, label: es ? "Resumen al finalizar" : "Summary when finished" },
  ];

  return (
    <Section className="min-h-[calc(100dvh-68px)] overflow-hidden bg-bg-dark py-8 text-white sm:py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(56,189,248,.16),transparent_32%),radial-gradient(circle_at_86%_76%,rgba(249,115,22,.12),transparent_30%)]"
        aria-hidden="true"
      />
      <Container className="relative max-w-[1180px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-larimar">
              {es ? "Evaluación por voz" : "Voice assessment"}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
              {es ? "Conferencia con tu agente de IA" : "Conference with your AI agent"}
            </h1>
          </div>
          <div className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-4 text-sm text-white/70">
            <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
            {es ? "Sala privada lista" : "Private room ready"}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="order-2 relative flex min-h-[540px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#102b47] to-[#071827] shadow-2xl shadow-black/25 lg:order-1">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-7">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-larimar/15 text-larimar">
                  <Radio className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold">
                    {es ? "Diagnóstico inicial" : "Initial discovery"}
                  </p>
                  <p className="text-xs text-white/50">Ultravox · WebRTC</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/50">
                <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
                {es ? "Cifrada" : "Encrypted"}
              </div>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="relative">
                <div className="absolute inset-[-28px] rounded-full border border-larimar/10" aria-hidden="true" />
                <div className="absolute inset-[-14px] rounded-full border border-larimar/20" aria-hidden="true" />
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-larimar to-tech shadow-[0_0_55px_rgba(56,189,248,.28)]">
                  <Headphones className="h-12 w-12 text-white" aria-hidden="true" />
                </div>
              </div>
              <h2 className="mt-10 font-display text-2xl font-bold sm:text-3xl">
                {es ? "Agente de evaluación QuisqueyaTech" : "QuisqueyaTech assessment agent"}
              </h2>
              <p className="mt-3 max-w-lg text-base leading-relaxed text-white/65">
                {es
                  ? "Cuando entres, el agente te saludará y guiará una conversación natural para entender qué proceso conviene mejorar primero."
                  : "Once you join, the agent will greet you and guide a natural conversation to understand which process is worth improving first."}
              </p>
              <div className="mt-7 flex h-8 items-center gap-1" aria-hidden="true">
                {[12, 20, 28, 18, 32, 24, 14].map((height, index) => (
                  <span
                    key={`${height}-${index}`}
                    className="w-1 rounded-full bg-larimar/55"
                    style={{ height }}
                  />
                ))}
              </div>
            </div>

            <div className="border-t border-white/10 bg-black/10 px-5 py-4 text-center text-xs text-white/45">
              {es
                ? "El navegador solicitará acceso al micrófono al entrar"
                : "Your browser will request microphone access when you join"}
            </div>
          </div>

          <aside className="order-1 rounded-3xl border border-white/10 bg-white/[.07] p-6 backdrop-blur-sm lg:order-2">
            <h2 className="font-display text-xl font-bold">
              {es ? "Antes de entrar" : "Before you join"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              {es
                ? "Busca un lugar tranquilo y utiliza audífonos si los tienes."
                : "Find a quiet place and use headphones if available."}
            </p>

            <div className="mt-6 space-y-3">
              {checklist.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl bg-white/[.06] px-4 py-3 text-sm text-white/80">
                  <Icon className="h-4 w-4 shrink-0 text-larimar" aria-hidden="true" />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/10 p-4 text-sm leading-relaxed text-white/70">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-sky-500"
              />
              <span>
                {es
                  ? "Acepto el procesamiento de la conversación y su grabación por un máximo de 30 días."
                  : "I consent to processing the conversation and recording it for up to 30 days."}
              </span>
            </label>

            <TurnstileField onToken={handleTurnstileToken} />

            {error ? (
              <p role="alert" className="mt-4 rounded-xl bg-rose/15 p-3 text-sm text-rose-200">
                {error}
              </p>
            ) : null}

            <Button
              type="button"
              size="lg"
              disabled={!consent || loading}
              onClick={startConference}
              className="mt-6 w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic2 className="h-4 w-4" />}
              {loading
                ? es
                  ? "Abriendo sala…"
                  : "Opening room…"
                : es
                  ? "Entrar a la conferencia"
                  : "Join conference"}
            </Button>
            <p className="mt-3 text-center text-xs leading-relaxed text-white/40">
              {es
                ? "No necesitas crear una cuenta ni completar un formulario."
                : "No account or intake form is required."}
            </p>
          </aside>
        </div>
      </Container>
    </Section>
  );
}
