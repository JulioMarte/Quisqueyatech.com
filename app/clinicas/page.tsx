import type { Metadata } from "next";
import {
  CalendarCheck,
  Clock,
  MessageCircle,
  Stethoscope,
  UserRound,
  Bell,
} from "lucide-react";
import { LeadForm } from "@/components/forms/lead-form";
import { ButtonLink } from "@/components/ui/button";
import {
  Container,
  Eyebrow,
  Section,
  SectionHead,
} from "@/components/ui/section";
import { brand } from "@/lib/brand";
import { whatsappHref } from "@/lib/whatsapp";
import { Check, X } from "lucide-react";

export const metadata: Metadata = {
  title: "Recepción inteligente para clínicas y odontólogos en RD",
  description:
    "Agenda, WhatsApp, recordatorios y seguimiento de pacientes para clínicas y odontólogos en República Dominicana. Evaluación inicial gratis.",
  alternates: { canonical: "/clinicas" },
  openGraph: {
    title: "Recepción inteligente para clínicas | QuisqueyaTech",
    description:
      "Menos no-shows, más pacientes con seguimiento. Sistema de recepción, agenda y WhatsApp para clínicas en RD.",
    url: `${brand.siteUrl}/clinicas`,
  },
};

export default function ClinicasPage() {
  return (
    <>
      <Section className="bg-[radial-gradient(ellipse_at_80%_0%,rgba(56,189,248,0.1),transparent_50%),radial-gradient(ellipse_at_0%_100%,rgba(249,115,22,0.07),transparent_50%)] py-16">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <Eyebrow>Clínicas y odontólogos · RD</Eyebrow>
              <h1 className="mt-4 font-display text-[clamp(36px,4.5vw,56px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-primary">
                Recepción inteligente para clínicas que pierden pacientes en
                WhatsApp.
              </h1>
              <p className="mt-5 max-w-[48ch] text-lg text-text-2">
                Ordenamos citas, confirmaciones, recordatorios y seguimiento
                post-consulta. Tu secretaria deja de improvisar; tú ves el
                tablero sin pedirlo.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <ButtonLink href="#evaluacion-clinicas" size="lg">
                  Quiero mi evaluación
                </ButtonLink>
                <ButtonLink
                  href={whatsappHref("clinicas-hero")}
                  variant="wa"
                  size="lg"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Enviar mi caso por WhatsApp
                </ButtonLink>
              </div>
              <div className="mt-5 flex flex-wrap gap-3 text-[13px] font-medium text-text-2">
                {["Menos no-shows", "Agenda conectada", "Seguimiento de pacientes"].map(
                  (t) => (
                    <span key={t} className="inline-flex items-center gap-1.5">
                      <span className="text-success">✓</span> {t}
                    </span>
                  ),
                )}
              </div>
            </div>
            <ClinicDemo />
          </div>
        </Container>
      </Section>

      <Section className="bg-bg-2">
        <Container>
          <SectionHead
            eyebrow="El dolor de la recepción"
            title="Si esto te suena familiar, el sistema te va a servir."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                t: "WhatsApp a las 10pm",
                d: "Pacientes escriben fuera de horario y el lunes ya agendaron en otra clínica.",
              },
              {
                t: "No-shows constantes",
                d: "Sin recordatorios automáticos, la agenda se llena de huecos y cancelaciones.",
              },
              {
                t: "Secretaria improvisando",
                d: "Libreta, Excel y memoria. Si falta una persona, se cae la recepción.",
              },
              {
                t: "Sin seguimiento post-consulta",
                d: "Pacientes que no vuelven y nadie los reactiva.",
              },
              {
                t: "Dueño sin visibilidad",
                d: "No sabes cuántos leads entraron, de dónde vinieron ni cuántas citas se confirmaron.",
              },
              {
                t: "FAQ manual todo el día",
                d: "Precios, ubicación, horarios y especialidades — las mismas 5 preguntas, 40 veces.",
              },
            ].map((p) => (
              <div
                key={p.t}
                className="rounded-[var(--radius-lg)] border border-line bg-white p-6"
              >
                <h3 className="font-display text-lg font-bold text-text">{p.t}</h3>
                <p className="mt-2 text-sm text-text-2">{p.d}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHead
            center
            eyebrow="Qué implementamos"
            title="Un sistema de recepción que tu equipo sí usa."
            lede="No un bot suelto. Un flujo completo: entrada → agenda → recordatorio → seguimiento."
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: MessageCircle,
                t: "Bandeja de pacientes",
                d: "WhatsApp e Instagram centralizados con estado y responsable.",
              },
              {
                icon: CalendarCheck,
                t: "Agenda conectada",
                d: "Confirmación automática y reprogramación sin caos.",
              },
              {
                icon: Bell,
                t: "Recordatorios 24h / 2h",
                d: "Menos no-shows con mensajes a tiempo por WhatsApp.",
              },
              {
                icon: Stethoscope,
                t: "Reporte al doctor",
                d: "Resumen diario: citas, nuevos, pendientes y fuente.",
              },
            ].map((i) => (
              <div
                key={i.t}
                className="rounded-[var(--radius-lg)] border border-line bg-white p-6"
              >
                <i.icon className="mb-3 h-9 w-9 rounded-lg bg-larimar-soft p-2 text-larimar-deep" />
                <h3 className="font-display text-lg font-bold">{i.t}</h3>
                <p className="mt-2 text-sm text-text-2">{i.d}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="bg-bg-2">
        <Container>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[var(--radius-xl)] border border-red-200 bg-white p-8">
              <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 font-mono text-[11px] font-semibold uppercase text-red-700">
                <X className="h-3 w-3" /> Antes
              </span>
              <ul className="mt-4 space-y-2 text-sm text-text-2">
                {[
                  "Citas en libreta o Excel",
                  "Recordatorios a mano (o ninguno)",
                  "Leads de Instagram sin seguimiento",
                  "Doctor pregunta “¿quién viene hoy?”",
                ].map((i) => (
                  <li key={i} className="flex gap-2">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-rose" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-emerald-200 bg-white p-8">
              <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-mono text-[11px] font-semibold uppercase text-emerald-700">
                <Check className="h-3 w-3" /> Después
              </span>
              <ul className="mt-4 space-y-2 text-sm text-text-2">
                {[
                  "Agenda viva con confirmaciones",
                  "Recordatorios automáticos por WA",
                  "Cada paciente con próxima acción",
                  "Dashboard y reporte diario al doctor",
                ].map((i) => (
                  <li key={i} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </Section>

      <Section id="evaluacion-clinicas">
        <Container>
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div>
              <Eyebrow>Empezar</Eyebrow>
              <h2 className="mt-3 font-display text-[clamp(28px,3.2vw,40px)] font-bold text-primary">
                Evaluación inicial gratis para tu clínica.
              </h2>
              <p className="mt-4 text-text-2">
                15 minutos para entender recepción, agenda y WhatsApp. Si hay
                fit, avanzamos a un Diagnóstico Operativo pagado y luego a un
                sprint de 7–21 días o un sistema completo.
              </p>
              <ButtonLink
                href={whatsappHref("clinicas-form")}
                variant="wa"
                size="lg"
                className="mt-6"
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp clínicas
              </ButtonLink>
            </div>
            <LeadForm source="clinicas" />
          </div>
        </Container>
      </Section>
    </>
  );
}

function ClinicDemo() {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-line bg-white p-5 shadow-[0_30px_60px_-20px_rgba(8,47,73,0.15)] sm:p-6">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber via-larimar to-tech" />
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
          Recepción · Demo clínica
        </span>
        <span className="rounded-full bg-success-soft px-2.5 py-1 font-mono text-[11px] font-semibold text-emerald-700">
          En vivo
        </span>
      </div>

      <div className="space-y-3">
        <div className="rounded-[var(--radius-md)] border border-line bg-bg-2 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-larimar-soft text-larimar-deep">
              <UserRound className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-text">Paciente: Ana Gómez</p>
                <span className="rounded-full bg-amber-soft px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-amber-deep">
                  Pendiente confirmar
                </span>
              </div>
              <p className="mt-1 text-sm text-text-2">Limpieza dental · Mañana 10:30 AM</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-mute">
                <span className="inline-flex items-center gap-1">
                  <Stethoscope className="h-3 w-3" /> Dra. Pérez
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" /> Fuente: Instagram
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Próxima acción: Llamar 9:00 AM
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[var(--radius-md)] border border-line p-3">
            <p className="font-mono text-[10px] uppercase text-mute">Citas hoy</p>
            <p className="font-display text-2xl font-bold text-primary">11</p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-line p-3">
            <p className="font-mono text-[10px] uppercase text-mute">Confirmadas</p>
            <p className="font-display text-2xl font-bold text-success">8</p>
          </div>
        </div>

        <div className="rounded-[var(--radius-md)] bg-primary p-4 text-white">
          <p className="text-sm font-semibold">Recordatorio enviado</p>
          <p className="mt-1 text-[13px] text-white/80">
            “Hola Ana, te esperamos mañana 10:30 con la Dra. Pérez. Responde SÍ
            para confirmar.”
          </p>
          <p className="mt-2 font-mono text-[11px] text-larimar">
            Enviado hace 2 min · WhatsApp Business API
          </p>
        </div>
      </div>
    </div>
  );
}
