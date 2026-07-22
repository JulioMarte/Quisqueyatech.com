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
import type { ClientDiagnosticEvent, PlaybackState } from "@/lib/assessment/client-diagnostic";
import { describeClient } from "@/lib/assessment/client-diagnostic";
import {
  attemptAudioPlayback,
  playbackFailureStatus,
  prepareAudioElement,
} from "@/lib/livekit/audio-playback";

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

const activeStatuses = new Set(["audio-ready", "idle", "listening", "thinking", "speaking"]);

export function VoiceSession({ locale, session }: { locale: Locale; session: Session }) {
  const es = locale === "es";
  const [status, setStatus] = useState("connecting");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [muted, setMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [audioNotice, setAudioNotice] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [replacementSession, setReplacementSession] = useState<Session | null>(null);
  const [recovering, setRecovering] = useState(false);
  const started = useRef(0);
  const controller = useRef<{
    enableAudio: () => Promise<void>;
    disconnect: () => Promise<void>;
    muteMic: (value: boolean) => void;
    muteSpeaker: (value: boolean) => void;
  } | null>(null);
  const speakerMutedRef = useRef(false);
  const audioUnlockedRef = useRef(false);
  const audioPlayingRef = useRef(false);
  const lastThresholdSeconds = useRef(0);
  const finishing = useRef(false);
  const terminalState = useRef(false);
  const transportEndStarted = useRef(false);
  const recoveryKey = useRef(crypto.randomUUID());
  const clientTurnId = useRef<string | undefined>(undefined);
  const clientTurnStartedAt = useRef(0);
  const clientTurnTimer = useRef<number | undefined>(undefined);
  const clientRecoveryTimer = useRef<number | undefined>(undefined);
  const clientTurnStalled = useRef(false);
  const supportSuffix = es
    ? ` Código de soporte: ${session.supportId}`
    : ` Support code: ${session.supportId}`;

  const reportDiagnostic = useCallback(
    (
      event: ClientDiagnosticEvent,
      playbackState: PlaybackState,
      details: { turnId?: string; state?: string; code?: string; durationMs?: number } = {},
    ) => {
      const client = describeClient(navigator.userAgent);
      void fetch("/api/assessment/client-diagnostic", {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.progressToken}`,
        },
        body: JSON.stringify({
          supportId: session.supportId,
          event,
          roomName: session.roomName,
          playbackState,
          client,
          sessionKey: session.sessionKey,
          ...details,
        }),
      }).catch(() => undefined);
    },
    [session.progressToken, session.roomName, session.sessionKey, session.supportId],
  );

  const clearClientTurnTimers = useCallback(() => {
    if (clientTurnTimer.current) window.clearTimeout(clientTurnTimer.current);
    if (clientRecoveryTimer.current) window.clearTimeout(clientRecoveryTimer.current);
    clientTurnTimer.current = undefined;
    clientRecoveryTimer.current = undefined;
  }, []);

  const resolveClientTurn = useCallback(() => {
    if (!clientTurnId.current) return;
    const turnId = clientTurnId.current;
    const durationMs = Date.now() - clientTurnStartedAt.current;
    reportDiagnostic("turn_response", "ready", { turnId, durationMs });
    if (clientTurnStalled.current)
      reportDiagnostic("turn_recovered", "ready", { turnId, durationMs });
    clearClientTurnTimers();
    clientTurnId.current = undefined;
    clientTurnStalled.current = false;
  }, [clearClientTurnTimers, reportDiagnostic]);

  const armClientTurnWatchdog = useCallback(() => {
    clearClientTurnTimers();
    const turnId = crypto.randomUUID();
    clientTurnId.current = turnId;
    clientTurnStartedAt.current = Date.now();
    clientTurnStalled.current = false;
    reportDiagnostic("turn_user_final", "ready", { turnId });
    clientTurnTimer.current = window.setTimeout(() => {
      if (clientTurnId.current !== turnId || finishing.current) return;
      clientTurnStalled.current = true;
      setStatus("model-stalled");
      setAudioNotice(
        (es
          ? "El agente tardó demasiado. Di “continuar” o recupera la conexión."
          : "The agent is taking too long. Say “continue” or recover the connection.") +
          supportSuffix,
      );
      reportDiagnostic("turn_stalled", "ready", {
        turnId,
        state: "model-stalled",
        code: "model_stalled",
      });
      clientRecoveryTimer.current = window.setTimeout(() => {
        if (clientTurnId.current !== turnId || finishing.current) return;
        setStatus("recovery-required");
        reportDiagnostic("recovery_required", "ready", {
          turnId,
          state: "recovery-required",
          code: "recovery_required",
        });
      }, 18_000);
    }, 14_000);
  }, [clearClientTurnTimers, es, reportDiagnostic, supportSuffix]);

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

  const finalizationPayload = () => ({
    assessmentId: session.assessmentId,
    sessionKey: session.sessionKey,
    locale,
    transcript: JSON.stringify(transcript),
    provider: session.provider,
    durationSeconds: Math.min(900, Math.floor((Date.now() - started.current) / 1000)),
  });

  const querySessionStatus = async () => {
    const query = new URLSearchParams({
      assessmentId: session.assessmentId,
      sessionKey: session.sessionKey,
    });
    const response = await fetch(`/api/assessment/session-status?${query}`, {
      headers: { Authorization: `Bearer ${session.progressToken}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Session status is unavailable");
    return (await response.json()) as {
      status: "in_progress" | "finalizing" | "completed" | "interrupted" | "finalization_failed";
      reason: string | null;
      resultAvailable: boolean;
    };
  };

  const waitForFinalization = async (allowClientFallback: boolean) => {
    finishing.current = true;
    terminalState.current = true;
    clearClientTurnTimers();
    setError("");
    setAudioNotice("");
    setStatus("finishing");
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        const state = await querySessionStatus();
        if (state.status === "completed") {
          setResult({ reviewPending: true });
          setStatus("complete");
          return;
        }
        if (state.status === "interrupted") break;
        if (state.status === "finalization_failed") break;
      } catch {
        // Transient status failures do not preempt provider finalization.
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1_000));
    }
    if (allowClientFallback) {
      const response = await fetch("/api/assessment/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.progressToken}`,
        },
        body: JSON.stringify(finalizationPayload()),
      });
      if (response.ok) {
        setResult({ reviewPending: true });
        setStatus("complete");
        return;
      }
    }
    finishing.current = false;
    terminalState.current = false;
    setResumeUrl(resumeLink(session.resumeToken));
    setError(
      (es
        ? "La sesión terminó antes de confirmar el resultado. Puedes retomarla con tu enlace seguro."
        : "The session ended before the result was confirmed. You can resume it with your secure link.") +
        supportSuffix,
    );
    setStatus("recovery-required");
  };

  const handleTransportEnd = useEffectEvent(async () => {
    if (transportEndStarted.current) return;
    transportEndStarted.current = true;
    await new Promise((resolve) => window.setTimeout(resolve, terminalState.current ? 0 : 1_500));
    try {
      const state = await querySessionStatus();
      if (terminalState.current || state.status === "finalizing" || state.status === "completed") {
        await waitForFinalization(false);
        return;
      }
    } catch {
      // Durable success was not confirmed; use the recoverable path.
    }
    finishing.current = false;
    setResumeUrl(resumeLink(session.resumeToken));
    setError(
      (es
        ? "El agente se desconectó de la sala. Puedes retomar con tu enlace seguro."
        : "The agent disconnected from the room. You can resume with your secure link.") +
        supportSuffix,
    );
    setStatus("recovery-required");
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
    let agentAudioTimer: number | undefined;

    async function connect() {
      try {
        if (session.roomUrl && session.token) {
          const { Room, RoomEvent } = await import("livekit-client");
          const room = new Room({ adaptiveStream: true, dynacast: true });
          const audioElements = new Map<string, HTMLMediaElement>();
          const clearAgentAudioTimer = () => {
            if (agentAudioTimer) window.clearTimeout(agentAudioTimer);
            agentAudioTimer = undefined;
          };
          const markAudioBlocked = () => {
            if (disposed || finishing.current || audioUnlockedRef.current) return;
            setStatus("audio-unlock-required");
            setAudioNotice(
              es
                ? "Tu navegador bloqueó el audio. Toca el botón para activar el audio y el micrófono."
                : "Your browser blocked audio. Tap the button to enable audio and microphone.",
            );
          };
          const markAudioPlaying = () => {
            if (audioPlayingRef.current) return;
            audioPlayingRef.current = true;
            clearAgentAudioTimer();
            setAudioNotice("");
            reportDiagnostic("audio_playing", "playing");
          };
          room.on(RoomEvent.TrackSubscribed, (track) => {
            if (track.kind === "audio") {
              const element = track.attach();
              const trackKey = track.sid || track.mediaStreamTrack.id;
              prepareAudioElement(element, speakerMutedRef.current);
              element.hidden = true;
              document.body.appendChild(element);
              audioElements.set(trackKey, element);
              reportDiagnostic("track_subscribed", room.canPlaybackAudio ? "ready" : "blocked");
              element.addEventListener("playing", markAudioPlaying);
              element.addEventListener(
                "ended",
                () => {
                  audioElements.delete(trackKey);
                  element.remove();
                },
                { once: true },
              );
              void attemptAudioPlayback(element).then((outcome) => {
                if (outcome === "playing") return;
                reportDiagnostic("play_rejected", "blocked");
                markAudioBlocked();
              });
            }
          });
          room.on(RoomEvent.TrackUnsubscribed, (track) => {
            if (track.kind !== "audio") return;
            reportDiagnostic("track_unsubscribed", room.canPlaybackAudio ? "ready" : "blocked");
            const trackKey = track.sid || track.mediaStreamTrack.id;
            const element = audioElements.get(trackKey);
            if (!element) return;
            audioElements.delete(trackKey);
            element.removeEventListener("playing", markAudioPlaying);
            element.remove();
          });
          room.on(RoomEvent.AudioPlaybackStatusChanged, (canPlay) => {
            if (canPlay) {
              audioUnlockedRef.current = true;
              setAudioNotice("");
              reportDiagnostic("audio_unlocked", "ready");
            } else {
              audioUnlockedRef.current = false;
              reportDiagnostic("audio_blocked", "blocked");
              markAudioBlocked();
            }
          });
          room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
            if (speakers.some((speaker) => !speaker.isLocal)) resolveClientTurn();
            if (!disposed && audioUnlockedRef.current)
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
            setStatus(audioUnlockedRef.current ? "listening" : "audio-unlock-required");
          });
          room.on(RoomEvent.ParticipantDisconnected, () => {
            if (disposed) return;
            void handleTransportEnd();
          });
          room.on(RoomEvent.ParticipantMetadataChanged, (metadata, participant) => {
            if (participant.identity === room.localParticipant.identity) return;
            try {
              const parsed = JSON.parse(metadata || "{}") as {
                state?: string;
                turnId?: string;
                recoveryCode?: string;
                completionReason?: string;
              };
              reportDiagnostic("agent_metadata", "ready", {
                turnId: parsed.turnId,
                state: parsed.state,
                code: parsed.recoveryCode,
              });
              if (parsed.state === "finalizing") {
                terminalState.current = true;
                finishing.current = true;
                clearClientTurnTimers();
                setError("");
                setAudioNotice("");
                setStatus("finishing");
              } else if (
                parsed.state === "recovery_required" ||
                parsed.state === "recovery_available"
              ) {
                clientTurnStalled.current = true;
                setStatus(
                  parsed.state === "recovery_available" ? "recovery-required" : "model-stalled",
                );
                setAudioNotice(
                  (es
                    ? "El agente tardó demasiado. Di “continuar” o recupera la conexión."
                    : "The agent is taking too long. Say “continue” or recover the connection.") +
                    supportSuffix,
                );
              } else if (parsed.state === "speaking") {
                resolveClientTurn();
              } else if (parsed.state && activeStatuses.has(parsed.state)) {
                setStatus(parsed.state);
              }
            } catch {
              // Ignore metadata from participants that do not use the assessment contract.
            }
          });
          room.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
            const fromAgent =
              !participant || participant.identity !== room.localParticipant.identity;
            const final = segments
              .filter((segment) => segment.final)
              .map((segment) => ({
                speaker: fromAgent ? "agent" : participant?.identity || "visitor",
                text: segment.text,
              }));
            if (final.length) setTranscript((current) => [...current, ...final]);
            if (final.length && fromAgent) resolveClientTurn();
            if (final.length && !fromAgent) armClientTurnWatchdog();
            if (fromAgent && final.length && !audioPlayingRef.current && !agentAudioTimer) {
              agentAudioTimer = window.setTimeout(() => {
                agentAudioTimer = undefined;
                if (disposed || audioPlayingRef.current || finishing.current) return;
                setStatus(playbackFailureStatus(room.canPlaybackAudio));
                setAudioNotice(
                  (es
                    ? "Recibimos la respuesta del agente, pero no se confirmó la reproducción. Activa el audio e inténtalo otra vez."
                    : "The agent replied, but audio playback was not confirmed. Enable audio and try again.") +
                    supportSuffix,
                );
                reportDiagnostic("audio_failed", room.canPlaybackAudio ? "failed" : "blocked");
              }, 5_000);
            }
          });
          room.on(RoomEvent.Reconnecting, () => {
            setStatus("reconnecting");
            reportDiagnostic("room_reconnecting", "unknown");
          });
          room.on(RoomEvent.Reconnected, () => {
            setStatus("listening");
            reportDiagnostic("room_reconnected", room.canPlaybackAudio ? "ready" : "blocked");
          });
          room.on(RoomEvent.Disconnected, () => {
            if (!disposed) {
              reportDiagnostic("room_disconnected", "unknown");
              void handleTransportEnd();
            }
          });
          setStatus("waiting-agent");
          await room.connect(session.roomUrl, session.token);
          setStatus("audio-unlock-required");
          setAudioNotice(
            es
              ? "Toca el botón para activar el audio y permitir el micrófono."
              : "Tap the button to enable audio and allow microphone access.",
          );
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
            }, 90_000);
          }
          controller.current = {
            enableAudio: async () => {
              setStatus("requesting-microphone");
              setAudioNotice("");
              try {
                await room.startAudio();
                audioUnlockedRef.current = room.canPlaybackAudio;
                if (!room.canPlaybackAudio) throw new Error("audio-playback-blocked");
                reportDiagnostic("audio_unlocked", "ready");
                await Promise.all(
                  [...audioElements.values()].map((element) =>
                    attemptAudioPlayback(element).then((outcome) => {
                      if (outcome === "blocked") throw new Error("audio-playback-blocked");
                    }),
                  ),
                );
              } catch {
                audioUnlockedRef.current = false;
                setStatus("audio-unlock-required");
                setAudioNotice(
                  (es
                    ? "Firefox bloqueó la salida de audio. Toca nuevamente para permitirla."
                    : "Firefox blocked audio output. Tap again to allow it.") + supportSuffix,
                );
                reportDiagnostic("audio_blocked", "blocked");
                return;
              }
              try {
                await room.localParticipant.setMicrophoneEnabled(true);
                setMuted(false);
                setStatus(room.remoteParticipants.size ? "listening" : "waiting-agent");
              } catch {
                setStatus("audio-ready");
                setAudioNotice(
                  (es
                    ? "El audio está activo, pero el navegador negó el micrófono. Habilítalo en los permisos del sitio."
                    : "Audio is active, but the browser denied microphone access. Enable it in site permissions.") +
                    supportSuffix,
                );
              }
            },
            disconnect: async () => {
              clearAgentAudioTimer();
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

          const checkPlaybackAfterResume = () => {
            if (document.visibilityState === "visible" && !room.canPlaybackAudio) {
              audioUnlockedRef.current = false;
              markAudioBlocked();
            }
          };
          document.addEventListener("visibilitychange", checkPlaybackAfterResume);
          window.addEventListener("pageshow", checkPlaybackAfterResume);
          room.once(RoomEvent.Disconnected, () => {
            document.removeEventListener("visibilitychange", checkPlaybackAfterResume);
            window.removeEventListener("pageshow", checkPlaybackAfterResume);
          });
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
      clearClientTurnTimers();
      if (agentWaitTimer) window.clearTimeout(agentWaitTimer);
      if (agentAudioTimer) window.clearTimeout(agentAudioTimer);
      void controller.current?.disconnect();
    };
  }, [
    armClientTurnWatchdog,
    clearClientTurnTimers,
    es,
    reportDiagnostic,
    resolveClientTurn,
    saveProgress,
    session,
    supportSuffix,
  ]);

  async function finish() {
    if (finishing.current) return;
    finishing.current = true;
    transportEndStarted.current = true;
    setStatus("finishing");
    try {
      await saveProgress("close");
    } catch {
      /* completion still attempts to preserve the transcript */
    }
    await controller.current?.disconnect();
    try {
      await waitForFinalization(true);
    } catch (reason) {
      finishing.current = false;
      setError(reason instanceof Error ? reason.message : "Error");
      setResumeUrl(resumeLink(session.resumeToken));
      setStatus("error");
    }
  }

  async function recoverAgent() {
    if (recovering || finishing.current) return;
    setRecovering(true);
    setError("");
    reportDiagnostic("recovery_started", "ready", {
      turnId: clientTurnId.current,
      state: status,
    });
    try {
      const response = await fetch("/api/assessment/recover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.progressToken}`,
        },
        body: JSON.stringify({
          roomName: session.roomName,
          sessionKey: session.sessionKey,
          idempotencyKey: recoveryKey.current,
        }),
      });
      const payload = (await response.json()) as Partial<Session> & { error?: string };
      if (!response.ok || !payload.roomName || !payload.token || !payload.sessionKey)
        throw new Error(
          payload.error ||
            (es ? "No se pudo recuperar el agente." : "The agent could not be recovered."),
        );
      clearClientTurnTimers();
      await controller.current?.disconnect();
      setReplacementSession({ ...session, ...payload } as Session);
    } catch (reason) {
      setRecovering(false);
      setStatus("recovery-required");
      setError(
        `${reason instanceof Error ? reason.message : es ? "No se pudo recuperar el agente." : "The agent could not be recovered."}${supportSuffix}`,
      );
      reportDiagnostic("recovery_failed", "failed", {
        turnId: clientTurnId.current,
        state: "recovery-required",
        code: "recovery_failed",
      });
    }
  }

  if (replacementSession)
    return (
      <VoiceSession
        key={replacementSession.sessionKey}
        locale={locale}
        session={replacementSession}
      />
    );

  if (result) return <AssessmentResult locale={locale} result={result} />;

  const statusCopy: Record<string, string> = es
    ? {
        connecting: "Conectando…",
        "audio-unlock-required": "Activa audio y micrófono",
        "audio-ready": "Audio activo; revisa el micrófono",
        "audio-failed": "No se confirmó el audio",
        "requesting-microphone": "Solicitando micrófono…",
        "waiting-agent": "Esperando al agente…",
        idle: "Preparando el agente",
        listening: "Te está escuchando",
        thinking: "Analizando tu respuesta",
        "model-stalled": "El agente tardó demasiado",
        "recovery-required": "Recuperación disponible",
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
        "audio-unlock-required": "Enable audio and microphone",
        "audio-ready": "Audio ready; check microphone",
        "audio-failed": "Audio playback was not confirmed",
        "requesting-microphone": "Requesting microphone…",
        "waiting-agent": "Waiting for the agent…",
        idle: "Preparing the agent",
        listening: "Listening to you",
        thinking: "Considering your answer",
        "model-stalled": "The agent is taking too long",
        "recovery-required": "Recovery available",
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

              {status === "audio-unlock-required" || status === "audio-failed" ? (
                <Button
                  type="button"
                  onClick={() => void controller.current?.enableAudio()}
                  className="mt-6 min-h-12 bg-larimar text-ink hover:bg-sky-300"
                >
                  <Volume2 className="h-5 w-5" aria-hidden="true" />
                  {es ? "Activar audio y micrófono" : "Enable audio and microphone"}
                </Button>
              ) : null}

              {audioNotice ? (
                <p
                  role={status === "audio-failed" ? "alert" : "status"}
                  className="mt-4 max-w-lg rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-50"
                >
                  {audioNotice}
                </p>
              ) : null}

              {status === "model-stalled" || status === "recovery-required" ? (
                <Button
                  type="button"
                  onClick={() => void recoverAgent()}
                  disabled={recovering}
                  className="mt-4 min-h-12 bg-amber text-ink hover:bg-amber-300"
                >
                  {recovering ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Radio className="h-5 w-5" />
                  )}
                  {recovering
                    ? es
                      ? "Recuperando agente…"
                      : "Recovering agent…"
                    : es
                      ? "Recuperar agente"
                      : "Recover agent"}
                </Button>
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
                disabled={!audioUnlockedRef.current}
                aria-pressed={muted}
                className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/[.08] px-5 text-sm font-semibold transition-colors hover:bg-white/[.14] focus-visible:ring-2 focus-visible:ring-larimar disabled:cursor-not-allowed disabled:opacity-45"
              >
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                {muted ? (es ? "Activar" : "Unmute") : es ? "Silenciar" : "Mute"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !speakerMuted;
                  setSpeakerMuted(next);
                  speakerMutedRef.current = next;
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
