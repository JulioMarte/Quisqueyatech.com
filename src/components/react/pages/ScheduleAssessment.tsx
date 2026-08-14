import { CalendarCheck2, Check } from "lucide-react";
import { Button } from "../ui/Button";

interface Props {
  locale: "es" | "en";
  scheduleUrl?: string;
}

export function ScheduleAssessment({ locale, scheduleUrl = "" }: Props) {
  const isEn = locale === "en";
  const items = isEn
    ? ["Timezone detected automatically", "Live verified availability", "Clear confirmation before booking"]
    : ["Zona horaria detectada automáticamente", "Horarios verificados en vivo", "Confirmación clara antes de reservar"];
  const label = isEn ? "Open scheduler" : "Abrir agenda";

  return (
    <section className="section schedule-main">
      <div className="container schedule-grid">
        <div className="motion-reveal">
          <span className="eyebrow">{isEn ? "Schedule your assessment" : "Agenda tu evaluación"}</span>
          <h1>{isEn ? "Choose a time. We will handle the rest." : "Elige un horario. Nosotros cuidamos el resto."}</h1>
          <p className="lede">{isEn ? "Check live availability, share your details, and receive your appointment confirmation." : "Consulta la disponibilidad real, comparte tus datos y recibe la confirmación de tu cita."}</p>
          {scheduleUrl ? (
            <Button href={scheduleUrl} size="lg" target="_blank" rel="noopener noreferrer" analytics={{ event: "assessment_schedule", location: "assessment", label, destination: scheduleUrl, locale, action: "scheduler_handoff", channel: "scheduler" }}><CalendarCheck2 size={16} aria-hidden="true" />{label}</Button>
          ) : <p className="config-note">PUBLIC_ASSESSMENT_SCHEDULE_URL</p>}
        </div>
        <div className="schedule-panel motion-reveal">
          <h2>{isEn ? "One consistent experience, start to finish" : "Una sola experiencia, de principio a fin"}</h2>
          <div className="schedule-list">
            {items.map((item) => <p key={item}><span className="schedule-check"><Check aria-hidden="true" /></span>{item}</p>)}
          </div>
        </div>
      </div>
    </section>
  );
}
