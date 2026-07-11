import type { Metadata } from "next";
import {
  CalendarCheck,
  Clock,
  MessageCircle,
  Stethoscope,
  UserRound,
  Bell,
  Check,
  X,
} from "lucide-react";
import { LeadForm } from "@/components/forms/lead-form";
import { ButtonLink } from "@/components/ui/button";
import {
  Container,
  Eyebrow,
  Section,
  SectionHead,
} from "@/components/ui/section";
import { clinicServiceJsonLd, pageMetadata, seo } from "@/lib/seo";
import { whatsappHref } from "@/lib/whatsapp";

export const metadata: Metadata = pageMetadata(seo.clinicas);

export default function ClinicasPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(clinicServiceJsonLd) }}
      />
      <Section className="bg-[radial-gradient(ellipse_at_80%_0%,rgba(56,189,248,0.1),transparent_50%),radial-gradient(ellipse_at_0%_100%,rgba(249,115,22,0.07),transparent_50%)] py-16">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <Eyebrow>Clínicas y odontólogos · RD</Eyebrow>
              <h1 className="mt-4 font-display text-[clamp(36px,4.5vw,56px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-primary">
                Menos pacientes perdidos en WhatsApp. Menos huecos en la agenda.
              </h1>
              <p className="mt-5 max-w-[48ch] text-lg text-text-2">
                Ordenamos citas, confirmaciones, recordatorios y seguimiento
                después de la consulta. Recepción trabaja con más calma; tú ves
                lo importante sin pedirlo a cada rato.
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
                {["Menos pacientes ausentes", "Agenda conectada", "Seguimiento después de consulta"].map(
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
            title="Si esto pasa en tu clínica, no es falta de ganas. Es falta de sistema."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                t: "WhatsApp fuera de horario",
                d: "Pacientes escriben de noche y, si nadie responde rápido, agendan en otra clínica.",
              },
              {
                t: "Pacientes que no aparecen",
                d: "Sin recordatorios a tiempo, la agenda se llena de huecos que cuestan dinero.",
              },
              {
                t: "Recepción improvisando",
                d: "Libreta, Excel y memoria. Si falta una persona, todo se vuelve una búsqueda.",
              },
              {
                t: "Cero seguimiento después de consulta",
                d: "Pacientes que debían volver se enfrían porque nadie los contacta.",
              },
              {
                t: "Dueño sin visibilidad",
                d: "No sabes cuántas personas preguntaron, de dónde llegaron ni cuántas citas se confirmaron.",
              },
              {
                t: "Preguntas repetidas todo el día",
                d: "Precios, ubicación, horarios y especialidades. Las mismas dudas, una y otra vez.",
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
            title="Un sistema de recepción que el equipo entiende y usa."
            lede="No es un asistente automático suelto. Es un flujo completo: entra el paciente, se agenda, se confirma, se recuerda y se le da seguimiento."
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: MessageCircle,
                t: "Bandeja de pacientes",
                d: "WhatsApp e Instagram en un solo lugar, con responsable y estado.",
              },
              {
                icon: CalendarCheck,
                t: "Agenda conectada",
                d: "Confirmaciones y cambios sin depender de papelitos ni memoria.",
              },
              {
                icon: Bell,
                t: "Recordatorios 24h / 2h",
                d: "Mensajes a tiempo para reducir ausencias y huecos.",
              },
              {
                icon: Stethoscope,
                t: "Resumen para el doctor",
                d: "Citas, pacientes nuevos, pendientes y origen de cada solicitud.",
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
                  "Recordatorios a mano, cuando da tiempo",
                  "Mensajes de Instagram sin seguimiento",
                  "Doctor preguntando “¿quién viene hoy?”",
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
                  "Recordatorios automáticos por WhatsApp",
                  "Cada paciente con próxima acción",
                  "Panel de control y resumen diario",
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
                En 15 minutos entendemos cómo manejan recepción, agenda y
                WhatsApp. Si tiene sentido, pasamos a un diagnóstico operativo
                pagado y luego a una implementación corta de 7-21 días o a un sistema más
                completo por fases.
              </p>
              <ButtonLink
                href={whatsappHref("clinicas-form")}
                variant="wa"
                size="lg"
                className="mt-6"
                target="_blank"
                rel="noopener noreferrer"
              >
                Escribir por WhatsApp
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
                  <MessageCircle className="h-3 w-3" /> Llegó por Instagram
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Próxima acción: llamar 9:00 AM
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
            Enviado hace 2 min · WhatsApp
          </p>
        </div>
      </div>
    </div>
  );
}
