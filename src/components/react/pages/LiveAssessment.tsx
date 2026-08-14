import { CalendarClock, Check, Headphones, Mic2 } from "lucide-react";
import { Button } from "../ui/Button";

interface Props {
  locale: "es" | "en";
  livekitUrl?: string;
}

export function LiveAssessment({ locale, livekitUrl = "" }: Props) {
  const isEn = locale === "en";
  return (
    <section className="assessment-live">
      <div className="container">
        <div className="assessment-live-head">
          <div>
            <p className="assessment-live-kicker">{isEn ? "Voice assessment" : "Evaluación por voz"}</p>
            <h1>{isEn ? "Conference with your AI agent" : "Conferencia con tu agente de IA"}</h1>
          </div>
          <div className="assessment-status">{isEn ? "Private room ready" : "Sala privada lista"}</div>
        </div>
        <div className="assessment-live-grid">
          <div className="assessment-stage">
            <div className="assessment-stage-bar"><strong>{isEn ? "Initial discovery" : "Diagnóstico inicial"}</strong><span>LiveKit · Gemini Live</span></div>
            <div className="assessment-stage-main">
              <div className="assessment-orb"><Headphones aria-hidden="true" /></div>
              <h2>{isEn ? "QuisqueyaTech assessment agent" : "Agente de evaluación QuisqueyaTech"}</h2>
              <p>{isEn ? "When you join, say “hello” to begin. The agent guides a natural conversation to understand which process is worth improving first." : "Cuando entres, di “hola” para iniciar. El agente guiará una conversación natural para entender qué proceso conviene mejorar primero."}</p>
              <div className="assessment-wave" aria-hidden="true">
                {[12, 20, 28, 18, 32, 24, 14].map((height) => <span key={height} style={{ height }} />)}
              </div>
            </div>
            <div className="assessment-stage-foot">{isEn ? "Your browser will request microphone access when you join" : "El navegador solicitará acceso al micrófono al entrar"}</div>
          </div>
          <aside className="assessment-aside">
            <h2>{isEn ? "Before you join" : "Antes de entrar"}</h2>
            <p>{isEn ? "Find a quiet place and use headphones if available." : "Busca un lugar tranquilo y utiliza audífonos si los tienes."}</p>
            <div className="assessment-checks">
              <div><Mic2 size={16} aria-hidden="true" />{isEn ? "Microphone enabled" : "Micrófono habilitado"}</div>
              <div><CalendarClock size={16} aria-hidden="true" />{isEn ? "Duration: 12–15 minutes" : "Duración: 12–15 minutos"}</div>
              <div><Check size={16} aria-hidden="true" />{isEn ? "Summary when finished" : "Resumen al finalizar"}</div>
            </div>
            {livekitUrl ? (
              <Button href={livekitUrl} size="lg" target="_blank" rel="noopener noreferrer">{isEn ? "Open assessment" : "Abrir evaluación"}</Button>
            ) : <p className="external-note">PUBLIC_LIVEKIT_ASSESSMENT_URL</p>}
            <p className="external-note">{isEn ? "The voice backend remains outside this static website." : "El backend de voz permanece fuera de este sitio estático."}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
