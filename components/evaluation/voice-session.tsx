"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/section";
import type { Locale } from "@/lib/i18n";

type Session = {
  provider: "ultravox" | "livekit" | "demo";
  assessmentId: string;
  contactEmail: string;
  locale: Locale;
  joinUrl?: string;
  roomUrl?: string;
  token?: string;
  notice?: string;
};
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

export function VoiceSession({
  locale,
  session,
}: {
  locale: Locale;
  session: Session;
}) {
  const es = locale === "es";
  const [status, setStatus] = useState(
    session.provider === "demo" ? "demo" : "connecting",
  );
  const [transcript, setTranscript] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const started = useRef(0);
  const controller = useRef<{
    leave: () => Promise<void>;
    mute: (value: boolean) => void;
  } | null>(null);

  useEffect(() => {
    started.current = Date.now();
    if (session.provider === "demo") return;
    let disposed = false;
    async function connect() {
      try {
        if (session.provider === "ultravox" && session.joinUrl) {
          const { UltravoxSession } = await import("ultravox-client");
          const voice = new UltravoxSession();
          voice.addEventListener(
            "status",
            () => !disposed && setStatus(voice.status),
          );
          voice.addEventListener(
            "transcripts",
            () =>
              !disposed &&
              setTranscript(
                voice.transcripts
                  .filter((item) => item.isFinal)
                  .map((item) => `${item.speaker}: ${item.text}`),
              ),
          );
          voice.joinCall(session.joinUrl);
          controller.current = {
            leave: () => voice.leaveCall(),
            mute: (value) => (value ? voice.muteMic() : voice.unmuteMic()),
          };
        } else if (
          session.provider === "livekit" &&
          session.roomUrl &&
          session.token
        ) {
          const { Room, RoomEvent } = await import("livekit-client");
          const room = new Room({ adaptiveStream: true, dynacast: true });
          room.on(RoomEvent.TrackSubscribed, (track) => {
            if (track.kind === "audio") track.attach();
          });
          room.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
            const final = segments
              .filter((segment) => segment.final)
              .map(
                (segment) =>
                  `${participant?.identity || "agent"}: ${segment.text}`,
              );
            if (final.length)
              setTranscript((current) => [...current, ...final]);
          });
          await room.connect(session.roomUrl, session.token);
          await room.localParticipant.setMicrophoneEnabled(true);
          setStatus("listening");
          controller.current = {
            leave: async () => room.disconnect(),
            mute: (value) => {
              void room.localParticipant.setMicrophoneEnabled(!value);
            },
          };
        }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Connection error");
        setStatus("error");
      }
    }
    void connect();
    return () => {
      disposed = true;
      void controller.current?.leave();
    };
  }, [session]);

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
          transcript: transcript.join("\n"),
          provider: session.provider,
          durationSeconds: Math.round((Date.now() - started.current) / 1000),
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not complete assessment");
      setResult(data.result);
      setStatus("complete");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error");
      setStatus("error");
    }
  }

  if (result)
    return (
      <Section className="bg-bg-2">
        <Container className="max-w-4xl">
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h1 className="mt-4 font-display text-4xl font-bold text-primary">
              {es
                ? "Tu evaluación preliminar está lista"
                : "Your preliminary assessment is ready"}
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-text-2">
              {es
                ? "Estas oportunidades orientan el próximo paso; no sustituyen un diagnóstico operativo formal."
                : "These opportunities guide the next step; they do not replace a formal operational diagnosis."}
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {result.opportunities.map((item) => (
              <article
                key={item.title}
                className="rounded-xl border border-line bg-white p-6"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-deep">
                  {item.category}
                </span>
                <h2 className="mt-3 font-display text-xl font-bold">
                  {item.title}
                </h2>
                <p className="mt-3 text-sm text-text-2">{item.rationale}</p>
                <div className="mt-5 flex gap-3 text-xs">
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
            <p className="text-sm text-white/60">
              {es ? "Próximo paso" : "Next step"}
            </p>
            <p className="mt-1 text-lg font-semibold">{result.nextStep}</p>
          </div>
        </Container>
      </Section>
    );

  return (
    <Section className="bg-bg-2">
      <Container className="max-w-3xl">
        <div className="rounded-2xl border border-line bg-white p-7 text-center shadow-sm sm:p-10">
          <span
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${status === "speaking" ? "bg-amber-soft text-amber-deep" : "bg-larimar-soft text-larimar-deep"}`}
          >
            <Mic className="h-9 w-9" />
          </span>
          <h1 className="mt-6 font-display text-3xl font-bold text-primary">
            {session.provider === "demo"
              ? es
                ? "Modo de demostración técnica"
                : "Technical demo mode"
              : es
                ? "Evaluación en curso"
                : "Assessment in progress"}
          </h1>
          <p className="mt-3 text-text-2">
            {session.notice || (es ? `Estado: ${status}` : `Status: ${status}`)}
          </p>
          {session.provider === "demo" ? (
            <div className="mt-6 rounded-xl bg-bg-2 p-5 text-left text-sm text-text-2">
              <p className="font-semibold text-text">
                {es
                  ? "La experiencia está lista para credenciales."
                  : "The experience is ready for credentials."}
              </p>
              <p className="mt-2">
                {es
                  ? "Al conectar Ultravox o LiveKit, este mismo espacio manejará audio, interrupciones y transcripción en tiempo real. Puedes finalizar para comprobar el flujo de resultados."
                  : "Once Ultravox or LiveKit is connected, this area handles real-time audio, interruptions, and transcription. Finish now to test the result flow."}
              </p>
            </div>
          ) : null}
          {transcript.length ? (
            <div
              className="mt-6 max-h-44 overflow-y-auto rounded-xl bg-bg-2 p-4 text-left text-sm text-text-2"
              aria-live="polite"
            >
              {transcript.slice(-5).map((line, index) => (
                <p key={`${line}-${index}`} className="py-1">
                  {line}
                </p>
              ))}
            </div>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="mt-5 rounded-lg bg-rose-soft p-3 text-sm text-rose"
            >
              {error}
            </p>
          ) : null}
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const next = !muted;
                setMuted(next);
                controller.current?.mute(next);
              }}
            >
              {muted ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              {muted
                ? es
                  ? "Activar micrófono"
                  : "Unmute"
                : es
                  ? "Silenciar"
                  : "Mute"}
            </Button>
            <Button
              type="button"
              onClick={finish}
              disabled={status === "finishing"}
            >
              {status === "finishing" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PhoneOff className="h-4 w-4" />
              )}
              {es ? "Finalizar y ver resultado" : "Finish and view result"}
            </Button>
          </div>
          <p className="mt-5 inline-flex items-center gap-2 text-xs text-mute">
            <Sparkles className="h-3.5 w-3.5" />
            {es
              ? "Resultado preliminar generado a partir de la conversación"
              : "Preliminary result generated from the conversation"}
          </p>
        </div>
      </Container>
    </Section>
  );
}
