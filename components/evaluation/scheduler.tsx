"use client";

import { useEffect, useRef } from "react";
import { CalendarCheck2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Eyebrow, Section } from "@/components/ui/section";
import { useScheduleModal } from "@/components/evaluation/schedule-modal-context";
import type { Locale } from "@/lib/i18n";

/**
 * The dedicated scheduling page deliberately launches the same booking flow
 * used everywhere else. Keeping one implementation prevents validation,
 * timezone and outage behavior from drifting between entry points.
 */
export function Scheduler({ locale }: { locale: Locale }) {
  const es = locale === "es";
  const { open } = useScheduleModal();
  const openedRef = useRef(false);

  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    open("marketing-page");
  }, [open]);

  return (
    <Section className="bg-bg-2">
      <Container className="grid items-center gap-10 lg:grid-cols-[.9fr_1.1fr]">
        <div>
          <Eyebrow>{es ? "Agenda tu evaluación" : "Schedule your assessment"}</Eyebrow>
          <h1 className="mt-4 font-display text-[clamp(34px,5vw,50px)] font-bold leading-tight text-primary">
            {es
              ? "Elige un horario. Nosotros cuidamos el resto."
              : "Choose a time. We will handle the rest."}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-text-2">
            {es
              ? "Consulta la disponibilidad real, comparte tus datos y recibe la confirmación de tu cita."
              : "Check live availability, share your details, and receive your appointment confirmation."}
          </p>
          <Button type="button" size="lg" className="mt-7" onClick={() => open("marketing-page")}>
            <CalendarCheck2 className="h-4 w-4" aria-hidden="true" />
            {es ? "Abrir agenda" : "Open scheduler"}
          </Button>
        </div>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-[0_24px_60px_-44px_rgba(8,47,73,.55)] sm:p-8">
          <h2 className="font-display text-2xl font-bold text-primary">
            {es
              ? "Una sola experiencia, de principio a fin"
              : "One consistent experience, start to finish"}
          </h2>
          <div className="mt-5 space-y-4">
            {(es
              ? [
                  "Zona horaria detectada automáticamente",
                  "Horarios verificados en vivo",
                  "Confirmación clara antes de reservar",
                ]
              : [
                  "Timezone detected automatically",
                  "Live verified availability",
                  "Clear confirmation before booking",
                ]
            ).map((item) => (
              <p key={item} className="flex items-center gap-3 text-sm text-text-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
                {item}
              </p>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
