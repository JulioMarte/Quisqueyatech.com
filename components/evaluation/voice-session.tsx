"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Headphones,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/section";
import type { Locale } from "@/lib/i18n";

type Session = {
  provider: "ultravox" | "livekit" | "demo";
  assessmentId: string;
  contactEmail?: string;
  locale: Locale;
  joinUrl?: string;
  roomUrl?: string;
  token?: string;
  notice?: string;
};

type TranscriptLine = { speaker: string; text: string };
type Result = {
  opportunities: {
    title: string;
    category: string;
    impact: string;
    effort: string;
    rationale: string;
  }[];
  nextStep: string;
};

const activeStatuses = new Set(["idle", "listening", "thinking", "speaking"]);

export function VoiceSession({ locale, session }: { locale: Locale; session: Session }) {
  const es = locale === "es";
  const [status, setStatus] = useState(session.provider === "demo" ? "demo" : "connecting");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [muted, setMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const started = useRef(0);
  const controller = useRef<{
    leave: () => Promise<void>;
    muteMic: (value: boolean) => void;
    muteSpeaker: (value: boolean) => void;
  } | null>(null);

  useEffect(() => {
    started.current = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - started.current) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (session.provider === "demo") return;
    let disposed = false;

    async function connect() {
      try {
        if (session.provider === "ultravox" && session.joinUrl) {
          const { UltravoxSession } = await import("ultravox-client");
          const voice = new UltravoxSession();
          voice.addEventListener("status", () => {
            if (!disposed) setStatus(voice.status);
          });
          voice.addEventListener("transcripts", () => {
            if (disposed) return;
            setTranscript(
              voice.transcripts
                .filter((item) => item.isFinal)
                .map((item) => ({ speaker: item.speaker, text: item.text })),
            );
          });
          voice.joinCall(session.joinUrl, "quisqueyatech-web");
          controller.current = {
            leave: () => voice.leaveCall(),
            muteMic: (value) => (value ? voice.muteMic() : voice.unmuteMic()),
            muteSpeaker: (value) => (value ? voice.muteSpeaker() : voice.unmuteSpeaker()),
          };
          return;
        }

        if (session.provider === "livekit" && session.roomUrl && session.token) {
          const { Room, RoomEvent } = await import("livekit-client");
          const room = new Room({ adaptiveStream: true, dynacast: true });
          room.on(RoomEvent.TrackSubscribed, (track) => {
            if (track.kind === "audio") track.attach();
          });
          room.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
            const final = segments
              .filter((segment) => segment.final)
              .map((segment) => ({
                speaker: participant?.identity || "agent",
                text: segment.text,
              }));
            if (final.length) setTranscript((current) => [...current, ...final]);
          });
          await room.connect(session.roomUrl, session.token);
          await room.localParticipant.setMicrophoneEnabled(true);
          setStatus("listening");
          controller.current = {
            leave: async () => room.disconnect(),
            muteMic: (value) => {
              void room.localParticipant.setMicrophoneEnabled(!value);
            },
            muteSpeaker: () => undefined,
          };
          return;
        }

        throw new Error(es ? "La sala no recibió credenciales válidas." : "The room did not receive valid credentials.");
      } catch (reason) {
        if (disposed) return;
        setError(reason instanceof Error ? reason.message : "Connection error");
        setStatus("error");
      }
    }

    void connect();
    return () => {
      disposed = true;
      void controller.current?.leave();
    };
  }, [es, session]);

  async function finish() {
    setStatus("finishing");
    await controller.current?.leave();
    try {
      const response = await fetch("/api/assessment/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: session.assessmentId,
          email: session.contactEmail,
          locale: session.locale,
          transcript: transcript.map((line) => `${line.speaker}: ${line.text}`).join("\n"),
          provider: session.provider,
          durationSeconds: started.current
            ? Math.round((Date.now() - started.current) / 1000)
            : 0,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not complete assessment");
      setResult(data.result);
      setStatus("complete");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error");
      setStatus("error");
    }
  }

  if (result) return <AssessmentResult locale={locale} result={result} />;

  const statusCopy: Record<string, string> = es
    ? {
        connecting: "Conectando…",
        idle: "Preparando el agente",
        listening: "Te está escuchando",
        thinking: "Analizando tu respuesta",
        speaking: "El agente está hablando",
        disconnected: "Conferencia finalizada",
        disconnecting: "Finalizando…",
        finishing: "Preparando tu resultado…",
        demo: "Demostración",
        error: "Error de conexión",
      }
    : {
        connecting: "Connecting…",
        idle: "Preparing the agent",
        listening: "Listening to you",
        thinking: "Considering your answer",
        speaking: "The agent is speaking",
        disconnected: "Conference ended",
        disconnecting: "Ending…",
        finishing: "Preparing your result…",
        demo: "Demo",
        error: "Connection error",
      };
  const isActive = activeStatuses.has(status);
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");

  return (
    <Section className="min-h-[calc(100dvh-68px)] overflow-hidden bg-bg-dark py-8 text-white sm:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(56,189,248,.12),transparent_38%),radial-gradient(circle_at_90%_90%,rgba(249,115,22,.09),transparent_28%)]" aria-hidden="true" />
      <Container className="relative max-w-[1180px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-larimar">
              {es ? "Conferencia privada" : "Private conference"}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold">
              {es ? "Evaluación de procesos" : "Process assessment"}
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/60">
            <span className="font-mono tabular-nums">{minutes}:{seconds}</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-3 py-2">
              <span className={`h-2 w-2 rounded-full ${isActive ? "bg-success" : "bg-amber"}`} aria-hidden="true" />
              {statusCopy[status] || status}
            </span>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="relative flex min-h-[550px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#102b47] to-[#071827] shadow-2xl shadow-black/25">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-7">
              <div className="flex items-center gap-2 text-sm text-white/65">
                <Radio className="h-4 w-4 text-success" aria-hidden="true" />
                {session.provider === "ultravox" ? "Ultravox" : session.provider === "demo" ? "Demo" : "LiveKit"}
              </div>
              <div className="flex items-center gap-2 text-xs text-white/50">
                <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
                {es ? "Audio protegido" : "Protected audio"}
              </div>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
              <div className="relative">
                {status === "speaking" ? (
                  <>
                    <span className="absolute inset-[-30px] animate-ping rounded-full border border-larimar/25" aria-hidden="true" />
                    <span className="absolute inset-[-16px] rounded-full border border-larimar/30" aria-hidden="true" />
                  </>
                ) : null}
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-larimar to-tech shadow-[0_0_55px_rgba(56,189,248,.3)]">
                  <Headphones className="h-12 w-12" aria-hidden="true" />
                </div>
              </div>
              <h2 className="mt-9 font-display text-2xl font-bold">
                {es ? "Agente QuisqueyaTech" : "QuisqueyaTech agent"}
              </h2>
              <p className="mt-2 min-h-6 text-white/60" aria-live="polite">
                {session.notice || statusCopy[status] || status}
              </p>

              {session.provider === "demo" ? (
                <div className="mt-6 max-w-lg rounded-xl border border-amber/20 bg-amber/10 p-4 text-left text-sm leading-relaxed text-amber-100">
                  {es
                    ? "La sala está funcionando en modo demostración. Configura ULTRAVOX_API_KEY para activar la conversación de voz real."
                    : "The room is running in demo mode. Configure ULTRAVOX_API_KEY to enable the live voice conversation."}
                </div>
              ) : null}
              {error ? (
                <p role="alert" className="mt-6 max-w-lg rounded-xl bg-rose/15 p-4 text-sm text-rose-100">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 bg-black/10 px-4 py-5">
              <button
                type="button"
                onClick={() => {
                  const next = !muted;
                  setMuted(next);
                  controller.current?.muteMic(next);
                }}
                aria-pressed={muted}
                className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/[.08] px-5 text-sm font-semibold transition-colors hover:bg-white/[.14] focus-visible:ring-2 focus-visible:ring-larimar"
              >
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                {muted ? (es ? "Activar" : "Unmute") : es ? "Silenciar" : "Mute"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !speakerMuted;
                  setSpeakerMuted(next);
                  controller.current?.muteSpeaker(next);
                }}
                aria-pressed={speakerMuted}
                className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/[.08] px-5 text-sm font-semibold transition-colors hover:bg-white/[.14] focus-visible:ring-2 focus-visible:ring-larimar"
              >
                {speakerMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                {speakerMuted ? (es ? "Activar audio" : "Enable audio") : es ? "Audio" : "Audio"}
              </button>
              <Button type="button" onClick={finish} disabled={status === "finishing"} className="min-h-12 bg-rose hover:bg-rose-600">
                {status === "finishing" ? <Loader2 className="h-5 w-5 animate-spin" /> : <PhoneOff className="h-5 w-5" />}
                {es ? "Finalizar" : "End call"}
              </Button>
            </div>
          </div>

          <aside className="flex min-h-[420px] flex-col rounded-3xl border border-white/10 bg-white/[.07] p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h2 className="font-display text-lg font-bold">{es ? "Transcripción" : "Transcript"}</h2>
                <p className="mt-1 text-xs text-white/45">{es ? "En tiempo real" : "Live"}</p>
              </div>
              <Sparkles className="h-5 w-5 text-larimar" aria-hidden="true" />
            </div>
            <div className="mt-4 flex-1 space-y-3 overflow-y-auto" aria-live="polite">
              {transcript.length ? (
                transcript.slice(-8).map((line, index) => {
                  const fromAgent = line.speaker === "agent";
                  return (
                    <div key={`${line.text}-${index}`} className={`rounded-xl p-3 text-sm leading-relaxed ${fromAgent ? "bg-larimar/10 text-white/80" : "bg-white/[.07] text-white/65"}`}>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-larimar">
                        {fromAgent ? (es ? "Agente" : "Agent") : es ? "Tú" : "You"}
                      </p>
                      {line.text}
                    </div>
                  );
                })
              ) : (
                <div className="flex h-full min-h-52 flex-col items-center justify-center text-center text-sm leading-relaxed text-white/40">
                  <Mic className="mb-3 h-6 w-6 text-white/25" aria-hidden="true" />
                  {es ? "La conversación aparecerá aquí." : "The conversation will appear here."}
                </div>
              )}
            </div>
          </aside>
        </div>
      </Container>
    </Section>
  );
}

function AssessmentResult({ locale, result }: { locale: Locale; result: Result }) {
  const es = locale === "es";
  return (
    <Section className="bg-bg-2">
      <Container className="max-w-4xl">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
          <h1 className="mt-4 font-display text-4xl font-bold text-primary">
            {es ? "Tu evaluación preliminar está lista" : "Your preliminary assessment is ready"}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-text-2">
            {es
              ? "Estas oportunidades orientan el próximo paso; no sustituyen un diagnóstico operativo formal."
              : "These opportunities guide the next step; they do not replace a formal operational diagnosis."}
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {result.opportunities.map((item) => (
            <article key={item.title} className="rounded-xl border border-line bg-white p-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-deep">{item.category}</span>
              <h2 className="mt-3 font-display text-xl font-bold">{item.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-text-2">{item.rationale}</p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-success-soft px-3 py-1 text-emerald-700">
                  {es ? "Impacto" : "Impact"}: {item.impact}
                </span>
                <span className="rounded-full bg-bg-3 px-3 py-1">
                  {es ? "Esfuerzo" : "Effort"}: {item.effort}
                </span>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-6 rounded-xl bg-primary p-6 text-white">
          <p className="text-sm text-white/60">{es ? "Próximo paso" : "Next step"}</p>
          <p className="mt-1 text-lg font-semibold">{result.nextStep}</p>
        </div>
      </Container>
    </Section>
  );
}
