import { ArrowRight, CalendarClock, Mic2 } from "lucide-react";
import { Button } from "../ui/Button";

interface Props {
  locale: "es" | "en";
  nowPath: string;
  schedulePath: string;
}

export function AssessmentChoice({ locale, nowPath, schedulePath }: Props) {
  const isEn = locale === "en";
  const startLabel = isEn ? "Start assessment" : "Comenzar evaluación";
  const scheduleLabel = isEn ? "View availability" : "Ver disponibilidad";
  return (
    <div className="choice-grid-main motion-stagger">
      <article className="choice-card motion-item">
        <span className="choice-icon"><Mic2 aria-hidden="true" /></span>
        <h2>{isEn ? "Start now" : "Hacerla ahora"}</h2>
        <p>{isEn ? "Speak with the agent in your browser and receive the summary when finished." : "Habla con el agente desde tu navegador y recibe el resumen al terminar."}</p>
        <Button href={nowPath} analytics={{ event: "assessment_start", location: "assessment", label: startLabel, destination: nowPath, locale, action: "start_now" }}>{startLabel}<ArrowRight size={16} aria-hidden="true" /></Button>
      </article>
      <article className="choice-card motion-item">
        <span className="choice-icon"><CalendarClock aria-hidden="true" /></span>
        <h2>{isEn ? "Reserve a time" : "Reservar un horario"}</h2>
        <p>{isEn ? "Choose browser or phone and complete the same assessment when convenient." : "Elige navegador o llamada y realiza la misma evaluación cuando te convenga."}</p>
        <Button href={schedulePath} analytics={{ event: "assessment_schedule", location: "assessment", label: scheduleLabel, destination: schedulePath, locale, action: "schedule" }}>{scheduleLabel}<ArrowRight size={16} aria-hidden="true" /></Button>
      </article>
    </div>
  );
}
