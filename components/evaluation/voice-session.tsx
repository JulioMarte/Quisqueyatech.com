"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
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
import type { AssessmentEvidence } from "@/lib/assessment/types";
import { crossedThresholds } from "@/lib/assessment/scheduler";

type Session = {
  provider: "livekit";
  assessmentId: string;
  roomUrl: string;
  token: string;
  roomName: string;
  progressToken: string;
  resumeToken: string;
  sessionKey: string;
  supportId: string;
};

type TranscriptLine = { speaker: string; text: string };
type Result = { reviewPending: true };

const activeStatuses = new Set(["idle", "listening", "thinking", "speaking"]);

export function VoiceSession({ locale, session }: { locale: Locale; session: Session }) {
  const es = locale === "es";
  const [status, setStatus] = useState("connecting");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [muted, setMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const started = useRef(0);
  const controller = useRef<{
    leave: () => Promise<void>;
    muteMic: (value: boolean) => void;
    muteSpeaker: (value: boolean) => void;
  } | null>(null);
  const lastThresholdSeconds = useRef(0);
  const finishing = useRef(false);
  const supportSuffix = es
    ? ` Código de soporte: ${session.supportId}`
    : ` Support code: ${session.supportId}`;

  const saveProgress = useCallback(
    async (
      reason: "answer" | "correction" | "time-threshold" | "interruption" | "close",
      updates?: AssessmentEvidence[],
    ) => {
      const response = await fetch("/api/assessment/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.progressToken}`,
        },
        body: JSON.stringify({
          assessmentId: session.assessmentId,
          sessionKey: session.sessionKey,
          eventId: crypto.randomUUID(),
          locale,
          reason,
          elapsedSeconds: Math.min(900, Math.floor((Date.now() - started.current) / 1000)),
          updates,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Progress could not be saved");
      return payload as { nextInstruction: string };
    },
    [locale, session.assessmentId, session.progressToken, session.sessionKey],
  );

  const onHardStop = useEffectEvent(() => {
    void finish();
  });

  useEffect(() => {
    started.current = Date.now();
    const timer = window.setInterval(() => {
      const current = Math.floor((Date.now() - started.current) / 1000);
      setElapsed(current);
      const crossed = crossedThresholds(lastThresholdSeconds.current, current);
      lastThresholdSeconds.current = current;
      for (const threshold of crossed) {
        void saveProgress(threshold.key === "hard-stop" ? "close" : "time-threshold");
        if (threshold.key === "hard-stop") onHardStop();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [locale, saveProgress]);

  useEffect(() => {
    const persistInterruption = () => {
      if (finishing.current) return;
      void fetch("/api/assessment/progress", {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.progressToken}`,
        },
        body: JSON.stringify({
          assessmentId: session.assessmentId,
          sessionKey: session.sessionKey,
          eventId: crypto.randomUUID(),
          locale,
          reason: "interruption",
          elapsedSeconds: Math.min(900, Math.floor((Date.now() - started.current) / 1000)),
        }),
      });
    };
    window.addEventListener("pagehide", persistInterruption);
    return () => window.removeEventListener("pagehide", persistInterruption);
  }, [locale, session.assessmentId, session.progressToken, session.sessionKey]);

  useEffect(() => {
    let disposed = false;
    let agentWaitTimer: number | undefined;

    async function connect() {
      try {
        if (session.roomUrl && session.token) {
          const { Room, RoomEvent } = await import("livekit-client");
          const room = new Room({ adaptiveStream: true, dynacast: true });
          const audioElements = new Set<HTMLMediaElement>();
          room.on(RoomEvent.TrackSubscribed, (track) => {
            if (track.kind === "audio") {
              const element = track.attach();
              element.hidden = true;
              document.body.appendChild(element);
              audioElements.add(element);
              element.addEventListener(
                "ended",
                () => {
                  audioElements.delete(element);
                  element.remove();
                },
                { once: true },
              );
            }
          });
          room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
            if (!disposed)
              setStatus(
                speakers.some((speaker) => speaker.isLocal)
                  ? "listening"
                  : speakers.length
                    ? "speaking"
                    : "listening",
              );
          });
          room.on(RoomEvent.ParticipantConnected, () => {
            if (agentWaitTimer) window.clearTimeout(agentWaitTimer);
            setStatus("listening");
          });
          room.on(RoomEvent.ParticipantDisconnected, () => {
            if (disposed || finishing.current) return;
            setError(
              (es
                ? "El agente se desconectó de la sala. Puedes retomar con tu enlace seguro."
                : "The agent disconnected from the room. You can resume with your secure link.") +
                supportSuffix,
            );
            setResumeUrl(resumeLink(session.resumeToken));
            setStatus("error");
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
          room.on(RoomEvent.Reconnecting, () => setStatus("reconnecting"));
          room.on(RoomEvent.Reconnected, () => setStatus("listening"));
          room.on(RoomEvent.Disconnected, () => {
            if (!disposed && !finishing.current) {
              setStatus("ended");
              setResumeUrl(resumeLink(session.resumeToken));
              void saveProgress("interruption");
            }
          });
          setStatus("waiting-agent");
          await room.connect(session.roomUrl, session.token);
          setStatus("requesting-microphone");
          await room.localParticipant.setMicrophoneEnabled(true);
          setStatus(room.remoteParticipants.size ? "listening" : "waiting-agent");
          if (!room.remoteParticipants.size) {
            agentWaitTimer = window.setTimeout(() => {
              if (disposed || room.remoteParticipants.size) return;
              setError(
                (es
                  ? "El agente no pudo entrar a la sala. Puedes retomar con tu enlace seguro."
                  : "The agent could not join the room. You can resume with your secure link.") +
                  supportSuffix,
              );
              setResumeUrl(resumeLink(session.resumeToken));
              setStatus("error");
              room.disconnect();
            }, 20_000);
          }
          controller.current = {
            leave: async () => {
              audioElements.forEach((element) => element.remove());
              audioElements.clear();
              return room.disconnect();
            },
            muteMic: (value) => {
              void room.localParticipant.setMicrophoneEnabled(!value);
            },
            muteSpeaker: (value) =>
              audioElements.forEach((element) => {
                element.muted = value;
              }),
          };
          return;
        }
        throw new Error(
          es
            ? "La sala no recibió credenciales válidas."
            : "The room did not receive valid credentials.",
        );
      } catch (reason) {
        if (disposed) return;
        setError(
          `${reason instanceof Error ? reason.message : "Connection error"}${supportSuffix}`,
        );
        setResumeUrl(resumeLink(session.resumeToken));
        setStatus("error");
      }
    }

    void connect();
    return () => {
      disposed = true;
      if (agentWaitTimer) window.clearTimeout(agentWaitTimer);
      void controller.current?.leave();
    };
  }, [es, saveProgress, session, supportSuffix]);

  async function finish() {
    if (finishing.current) return;
    finishing.current = true;
    setStatus("finishing");
    await controller.current?.leave();
    try {
      await saveProgress("close");
    } catch {
      /* completion still attempts to preserve the transcript */
    }
    try {
      setResult({ reviewPending: true });
      setStatus("complete");
    } catch (reason) {
      finishing.current = false;
      setError(reason instanceof Error ? reason.message : "Error");
      setResumeUrl(resumeLink(session.resumeToken));
      setStatus("error");
    }
  }

  if (result) return <AssessmentResult locale={locale} result={result} />;

  const statusCopy: Record<string, string> = es
    ? {
        connecting: "Conectando…",
        "requesting-microphone": "Solicitando micrófono…",
        "waiting-agent": "Esperando al agente…",
        idle: "Preparando el agente",
        listening: "Te está escuchando",
        thinking: "Analizando tu respuesta",
        speaking: "El agente está hablando",
        reconnecting: "Reconectando…",
        ended: "Conferencia finalizada",
        disconnected: "Conferencia finalizada",
        disconnecting: "Finalizando…",
        finishing: "Preparando tu resultado…",
        demo: "Demostración",
        error: "Error de conexión",
      }
    : {
        connecting: "Connecting…",
        "requesting-microphone": "Requesting microphone…",
        "waiting-agent": "Waiting for the agent…",
        idle: "Preparing the agent",
        listening: "Listening to you",
        thinking: "Considering your answer",
        speaking: "The agent is speaking",
        reconnecting: "Reconnecting…",
        ended: "Conference ended",
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
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(56,189,248,.12),transparent_38%),radial-gradient(circle_at_90%_90%,rgba(249,115,22,.09),transparent_28%)]"
        aria-hidden="true"
      />
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
            <span className="font-mono tabular-nums">
              {minutes}:{seconds}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-3 py-2">
              <span
                className={`h-2 w-2 rounded-full ${isActive ? "bg-success" : "bg-amber"}`}
                aria-hidden="true"
              />
              {statusCopy[status] || status}
            </span>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="relative flex min-h-[550px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#102b47] to-[#071827] shadow-2xl shadow-black/25">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-7">
              <div className="flex items-center gap-2 text-sm text-white/65">
                <Radio className="h-4 w-4 text-success" aria-hidden="true" />
                LiveKit · Gemini 3.1 Live
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
                    <span
                      className="absolute inset-[-30px] animate-ping rounded-full border border-larimar/25"
                      aria-hidden="true"
                    />
                    <span
                      className="absolute inset-[-16px] rounded-full border border-larimar/30"
                      aria-hidden="true"
                    />
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
                {statusCopy[status] || status}
              </p>
              {status === "listening" && transcript.length === 0 ? (
                <p className="mt-3 text-sm font-medium text-larimar">
                  {es
                    ? "Di “hola” para iniciar la conversación."
                    : "Say “hello” to begin the conversation."}
                </p>
              ) : null}

              {error ? (
                <p
                  role="alert"
                  className="mt-6 max-w-lg rounded-xl bg-rose/15 p-4 text-sm text-rose-100"
                >
                  {error}
                </p>
              ) : null}
              {resumeUrl ? (
                <a
                  className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-white/20 px-4 text-sm font-semibold text-white hover:bg-white/10"
                  href={resumeUrl}
                >
                  {es ? "Retomar con un enlace seguro" : "Resume with a secure link"}
                </a>
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
              <Button
                type="button"
                onClick={finish}
                disabled={status === "finishing"}
                className="min-h-12 bg-rose hover:bg-rose-600"
              >
                {status === "finishing" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <PhoneOff className="h-5 w-5" />
                )}
                {es ? "Finalizar" : "End call"}
              </Button>
            </div>
          </div>

          <aside className="flex min-h-[420px] flex-col rounded-3xl border border-white/10 bg-white/[.07] p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h2 className="font-display text-lg font-bold">
                  {es ? "Transcripción" : "Transcript"}
                </h2>
                <p className="mt-1 text-xs text-white/45">{es ? "En tiempo real" : "Live"}</p>
              </div>
              <Sparkles className="h-5 w-5 text-larimar" aria-hidden="true" />
            </div>
            <div className="mt-4 flex-1 space-y-3 overflow-y-auto" aria-live="polite">
              {transcript.length ? (
                transcript.slice(-8).map((line, index) => {
                  const fromAgent = line.speaker === "agent";
                  return (
                    <div
                      key={`${line.text}-${index}`}
                      className={`rounded-xl p-3 text-sm leading-relaxed ${fromAgent ? "bg-larimar/10 text-white/80" : "bg-white/[.07] text-white/65"}`}
                    >
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

function resumeLink(token: string) {
  const base = window.location.pathname;
  return `${base}#resume=${encodeURIComponent(token)}`;
}

function AssessmentResult({ locale }: { locale: Locale; result: Result }) {
  const es = locale === "es";
  return (
    <Section className="bg-bg-2">
      <Container className="max-w-4xl">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
          <h1 className="mt-4 font-display text-4xl font-bold text-primary">
            {es ? "Recibimos tu levantamiento" : "We received your discovery session"}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-text-2">
            {es
              ? "Nuestro equipo revisará la conversación y preparará un reporte detallado de oportunidades. Lo recibirás por correo dentro de un día laborable."
              : "Our team will review the conversation and prepare a detailed opportunity report. You will receive it by email within one business day."}
          </p>
        </div>
        <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-line bg-white p-6 text-center">
          <p className="font-semibold text-primary">{es ? "Siguiente paso" : "Next step"}</p>
          <p className="mt-2 text-text-2">
            {es
              ? "Validaremos los datos confirmados, separaremos los supuestos y te enviaremos el reporte cuando esté aprobado."
              : "We will validate confirmed facts, separate assumptions, and send the report once it is approved."}
          </p>
        </div>
      </Container>
    </Section>
  );
}
