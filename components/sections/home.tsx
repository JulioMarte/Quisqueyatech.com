import {
  Search,
  LayoutGrid,
  Map,
  Wrench,
  RefreshCw,
  MessageSquare,
  Users,
  Calendar,
  Bot,
  BarChart3,
  Link2,
  Zap,
  ClipboardList,
  Inbox,
  Settings2,
  BookOpen,
  GraduationCap,
  LifeBuoy,
  Check,
  X,
} from "lucide-react";
import { SystemDashboard } from "@/components/demo/system-dashboard";
import { LeadForm } from "@/components/forms/lead-form";
import { ButtonLink } from "@/components/ui/button";
import {
  Container,
  Eyebrow,
  Section,
  SectionHead,
} from "@/components/ui/section";
import { whatsappHref } from "@/lib/whatsapp";

export function HeroSection() {
  return (
    <Section className="bg-[radial-gradient(ellipse_at_80%_0%,rgba(56,189,248,0.08),transparent_50%),radial-gradient(ellipse_at_0%_100%,rgba(249,115,22,0.06),transparent_50%)] py-16 sm:py-[64px]">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <Eyebrow>Consultora operativa para PYMES dominicanas</Eyebrow>
            <h1 className="mt-4 font-display text-[clamp(38px,5vw,64px)] font-extrabold leading-[1.04] tracking-[-0.03em] text-primary">
              <span className="bg-gradient-to-r from-amber-deep to-larimar-deep bg-clip-text text-transparent">
                Del caos operativo
              </span>{" "}
              al control inteligente.
            </h1>
            <p className="mt-5 max-w-[48ch] text-[clamp(16.5px,1.35vw,19px)] leading-[1.55] text-text-2">
              Ayudamos a PYMES dominicanas a ordenar su atención, automatizar
              tareas repetitivas y convertir WhatsApp, agenda, CRM e IA en un
              sistema que realmente se usa.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <ButtonLink href="#evaluacion" size="lg">
                Quiero mi evaluación
              </ButtonLink>
              <ButtonLink href="#metodo" variant="ghost" size="lg">
                Ver cómo funciona
              </ButtonLink>
            </div>
            <div className="mt-5 flex flex-wrap gap-3.5 text-[13px] text-text-2">
              {[
                "Evaluación inicial gratis",
                "Diagnóstico humano",
                "Plan por fases",
                "Pensado para PYMES en RD",
              ].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 font-medium">
                  <span className="font-bold text-success">✓</span> {t}
                </span>
              ))}
            </div>
          </div>
          <SystemDashboard />
        </div>
      </Container>
    </Section>
  );
}

export function ProblemSection() {
  const pains = [
    {
      title: "Leads que se pierden en WhatsApp",
      body: "Llegan mensajes a las 10pm, nadie los responde, el lunes ya compraron a la competencia.",
    },
    {
      title: "Clientes sin seguimiento",
      body: "Se atiende, se olvida. No hay pipeline. No hay quién llame al día siguiente.",
    },
    {
      title: "Citas mal gestionadas",
      body: "Huecos de 90 minutos, no-shows, doble booking, secretarias improvisando.",
    },
    {
      title: "Personal saturado respondiendo lo mismo",
      body: "Las mismas 5 preguntas, 40 veces al día, a mano.",
    },
    {
      title: "Reportes que nadie ve en tiempo real",
      body: "El cierre de mes son 3 días copiando números.",
    },
    {
      title: "Datos regados entre celulares y Excel",
      body: "El conocimiento se va cuando se va el empleado.",
    },
  ];

  return (
    <Section id="problema">
      <Container>
        <SectionHead
          eyebrow="El problema real"
          title={
            <>
              Tu negocio no necesita más apps.{" "}
              <strong className="text-primary">Necesita un sistema.</strong>
            </>
          }
        />
        <div className="grid items-start gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-lg leading-relaxed text-text-2">
              Muchos negocios en RD ya tienen WhatsApp, Instagram, Excel,
              llamadas, libretas y Google Calendar. El problema no es falta de
              herramientas.{" "}
              <strong className="text-text">
                El problema es que nada está conectado.
              </strong>
            </p>
            <p className="mt-4 text-base text-text-2">
              Por eso se pierden clientes, el equipo se satura y el dueño no sabe
              qué pasa hasta que es tarde. En República Dominicana la mayoría de
              PYMES no va a comprar “IA”. Va a comprar{" "}
              <strong className="text-text">menos desorden y más control</strong>
              . Eso es lo que construimos.
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-line bg-bg-2 p-7">
            <h4 className="mb-4 font-mono text-xs font-medium uppercase tracking-[0.14em] text-mute">
              Lo que escuchamos en cada diagnóstico
            </h4>
            <ul className="flex flex-col gap-2.5">
              {pains.map((p) => (
                <li key={p.title} className="flex gap-3 text-[15px] text-text-2">
                  <span className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-red-100 text-sm font-bold text-red-600">
                    !
                  </span>
                  <div>
                    <b className="text-text">{p.title}.</b> {p.body}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </Section>
  );
}

export function BeforeAfterSection() {
  const before = [
    ["WhatsApp personal", "Dos personas respondiendo lo mismo, sin registro."],
    ["Excel sagrado", "Una sola persona lo entiende. Si falta, se cae."],
    ["Libretas y papel", "Citas anotadas a mano, se pierden, se doblan."],
    ["Llamadas sin registro", "Suena, no contestan, nadie devuelve."],
    ["Clientes sin seguimiento", "Se atiende, se olvida, no hay pipeline."],
    ["Dueño preguntando", "“¿Qué pasó con ese cliente?” sin respuesta."],
  ];
  const after = [
    ["Inbox centralizado", "WhatsApp, Instagram, email y forms en un lugar."],
    ["CRM operativo", "Cualquiera responde con contexto completo."],
    ["Agenda inteligente", "Confirmaciones y recordatorios automáticos."],
    ["IA asistiendo", "FAQ automático; lo complejo escala a humanos."],
    ["Pipeline visible", "Estado, próximo paso y responsable por lead."],
    ["Reportes en vivo", "El dueño ve el dashboard sin pedirlo."],
  ];

  return (
    <Section id="antes-despues" className="bg-bg-2">
      <Container>
        <SectionHead
          center
          eyebrow="Antes vs Después"
          title={
            <>
              De operación con parches a{" "}
              <strong className="text-primary">operación con sistema.</strong>
            </>
          }
          lede="Esto es lo que cambia cuando una PYME dominicana pasa por nuestro proceso."
        />
        <div className="grid overflow-hidden rounded-[var(--radius-xl)] border border-line bg-white md:grid-cols-2">
          <div className="border-b border-line p-8 md:border-b-0 md:border-r">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-red-700">
              <X className="h-3 w-3" /> Antes
            </span>
            <h3 className="mb-5 font-display text-[28px] font-bold text-red-900">
              Cómo se opera hoy
            </h3>
            <ul className="flex flex-col gap-3">
              {before.map(([t, d]) => (
                <li key={t} className="text-[15px] text-text-2">
                  <b className="block text-text">{t}</b>
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-8">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
              <Check className="h-3 w-3" /> Después
            </span>
            <h3 className="mb-5 font-display text-[28px] font-bold text-emerald-700">
              Cómo se opera con nosotros
            </h3>
            <ul className="flex flex-col gap-3">
              {after.map(([t, d]) => (
                <li key={t} className="text-[15px] text-text-2">
                  <b className="block text-text">{t}</b>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </Section>
  );
}

const methodSteps = [
  {
    n: "01",
    title: "Levantamiento",
    body: "Revisamos cómo entran clientes, cómo atiendes, vendes y agendas, y dónde se pierde tiempo o dinero.",
    icon: Search,
  },
  {
    n: "02",
    title: "Diagnóstico",
    body: "Identificamos cuellos de botella, tareas repetitivas, fugas y oportunidades reales de automatización.",
    icon: LayoutGrid,
  },
  {
    n: "03",
    title: "Blueprint",
    body: "Mapa del sistema recomendado: procesos, herramientas, integraciones, CRM, IA, dashboards y fases.",
    icon: Map,
  },
  {
    n: "04",
    title: "Implementación",
    body: "Construimos WhatsApp, CRM, agenda, automatizaciones, IA y reportes. Probado antes de entregar.",
    icon: Wrench,
  },
  {
    n: "05",
    title: "Optimización",
    body: "Medimos, corregimos y mejoramos. La automatización se itera; no se instala y se olvida.",
    icon: RefreshCw,
  },
];

export function MethodSection() {
  return (
    <Section
      id="metodo"
      className="overflow-hidden bg-bg-dark text-white before:pointer-events-none before:absolute before:-right-[200px] before:-top-[200px] before:h-[600px] before:w-[600px] before:bg-[radial-gradient(circle,rgba(56,189,248,0.25),transparent_60%)] before:content-[''] after:pointer-events-none after:absolute after:-bottom-[200px] after:-left-[200px] after:h-[400px] after:w-[400px] after:bg-[radial-gradient(circle,rgba(249,115,22,0.18),transparent_60%)] after:content-['']"
    >
      <Container className="relative z-10">
        <SectionHead
          dark
          eyebrow="Nuestro método"
          title={
            <>
              Primero entendemos tu operación.{" "}
              <span className="italic text-amber">Después implementamos tecnología.</span>
            </>
          }
          lede="No vendemos herramientas. Vendemos un proceso consultivo que termina en un sistema funcionando."
        />
        <div className="grid overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-white/[0.04] sm:grid-cols-2 lg:grid-cols-5">
          {methodSteps.map((s, i) => (
            <div
              key={s.n}
              className={`border-white/10 p-7 ${
                i < methodSteps.length - 1 ? "lg:border-r" : ""
              } ${i % 2 === 0 ? "sm:border-r lg:border-r" : ""} border-b lg:border-b-0`}
            >
              <s.icon className="mb-3.5 h-9 w-9 rounded-lg bg-larimar/15 p-2 text-larimar" />
              <div className="mb-3.5 font-mono text-xs font-semibold tracking-[0.18em] text-larimar">
                PASO {s.n}
              </div>
              <h4 className="mb-2 font-display text-lg font-bold text-white">
                {s.title}
              </h4>
              <p className="text-sm leading-relaxed text-white/70">{s.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

export function StartPathsSection() {
  const paths = [
    {
      tag: "Gratis",
      title: "Evaluación inicial",
      time: "15 minutos",
      body: "Conversación corta para entender tu operación, filtrar si hay fit y definir si conviene un diagnóstico formal.",
      items: ["WhatsApp o llamada", "Dolor principal", "Siguiente paso claro"],
      cta: { href: "#evaluacion", label: "Agendar evaluación", variant: "primary" as const },
    },
    {
      tag: "Producto de entrada",
      title: "Diagnóstico Operativo",
      time: "Pagado",
      body: "Análisis serio de procesos, fugas y oportunidades. Entregas un blueprint y plan por fases — sin comprar a ciegas.",
      items: [
        "Reunión de levantamiento",
        "Mapa as-is / to-be",
        "Plan por fases + cotización",
      ],
      cta: { href: "#evaluacion", label: "Quiero evaluar mi negocio", variant: "dark" as const },
      highlight: true,
    },
    {
      tag: "Rápido",
      title: "Sprint de automatización",
      time: "7–21 días",
      body: "Resuelve un dolor específico: bot, agenda, bandeja o un flujo concreto. Alcance fijo.",
      items: ["Un dolor, un resultado", "Precio cerrado", "Listo para usar"],
      cta: { href: "#evaluacion", label: "Hablar de un sprint", variant: "ghost" as const },
    },
    {
      tag: "Premium",
      title: "Sistema Operativo PYME",
      time: "Por fases",
      body: "CRM, agenda, WhatsApp, IA, reportes e integraciones. El sistema completo de control operativo.",
      items: ["Implementación por fases", "Capacitación", "Soporte y mejora"],
      cta: { href: "#evaluacion", label: "Diseñar mi sistema", variant: "ghost" as const },
    },
  ];

  return (
    <Section id="empezar">
      <Container>
        <SectionHead
          eyebrow="Formas de empezar"
          title={
            <>
              Elige el nivel de profundidad.{" "}
              <strong className="text-primary">No compras a ciegas.</strong>
            </>
          }
          lede="Primero una evaluación corta. Luego, si hay fit, un diagnóstico pagado. Después implementación por fases."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {paths.map((p) => (
            <article
              key={p.title}
              className={`flex flex-col rounded-[var(--radius-lg)] border p-6 ${
                p.highlight
                  ? "border-amber bg-amber-soft shadow-[0_14px_30px_-12px_rgba(249,115,22,0.2)]"
                  : "border-line bg-white"
              }`}
            >
              <span className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-amber-deep">
                {p.tag} · {p.time}
              </span>
              <h3 className="font-display text-xl font-bold text-text">{p.title}</h3>
              <p className="mt-2 flex-1 text-sm text-text-2">{p.body}</p>
              <ul className="my-4 space-y-1.5 text-sm text-text-2">
                {p.items.map((i) => (
                  <li key={i} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {i}
                  </li>
                ))}
              </ul>
              <ButtonLink href={p.cta.href} variant={p.cta.variant} className="w-full">
                {p.cta.label}
              </ButtonLink>
            </article>
          ))}
        </div>
      </Container>
    </Section>
  );
}

export function OfferSection() {
  const includes = [
    "Cuestionario operativo inicial",
    "Reunión de levantamiento (60 min)",
    "Mapa del proceso actual (as-is)",
    "Identificación de cuellos de botella",
    "Recomendaciones de automatización",
    "Blueprint del sistema ideal (to-be)",
    "Plan de implementación por fases",
    "Cotización cerrada de implementación",
  ];

  return (
    <Section id="diagnostico" className="bg-bg-2">
      <Container>
        <div className="relative grid items-center gap-10 overflow-hidden rounded-[var(--radius-xl)] border border-line bg-gradient-to-br from-amber-soft via-white to-white p-8 lg:grid-cols-[1.1fr_1fr] lg:p-12">
          <div>
            <Eyebrow>Producto de entrada</Eyebrow>
            <h2 className="mt-3.5 font-display text-[clamp(28px,3.2vw,42px)] font-bold text-primary">
              <span className="text-amber-deep">Diagnóstico Operativo Inteligente.</span>
            </h2>
            <p className="mt-3 text-base text-text-2">
              Empieza con información real, no con una compra a ciegas. Analizamos
              tu operación y te entregamos una ruta clara de qué conviene
              implementar primero y por qué.
            </p>
            <p className="mt-3 text-base text-text-2">
              La evaluación inicial de 15 minutos es gratuita. El diagnóstico
              formal es un producto pagado: filtra curiosos y te da un entregable
              serio que puedes usar aunque no implementes con nosotros.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <ButtonLink href="#evaluacion" size="lg">
                Quiero mi evaluación
              </ButtonLink>
              <ButtonLink
                href={whatsappHref("diagnostico")}
                variant="ghost"
                size="lg"
                target="_blank"
                rel="noopener noreferrer"
              >
                Enviar mi caso por WhatsApp
              </ButtonLink>
            </div>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-line bg-white p-6">
            <h4 className="mb-3.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.14em] text-amber-deep">
              Qué incluye el diagnóstico
            </h4>
            <ul className="flex flex-col gap-2">
              {includes.map((i) => (
                <li key={i} className="flex gap-2 text-sm text-text-2">
                  <span className="font-bold text-success">✓</span> {i}
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-dashed border-line pt-3.5 text-[12.5px] text-mute">
              Recibes una ruta clara antes de invertir en implementación. Sin
              presión y sin venderte herramientas que no necesitas.
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}

const solutions = [
  {
    icon: MessageSquare,
    title: "Atención y ventas omnicanal",
    body: "Centraliza WhatsApp, redes y formularios en una sola bandeja. Ningún cliente se pierde por canal.",
    tags: ["WhatsApp", "Instagram", "Formularios"],
    outcome: "Más seguimiento, menos oportunidades perdidas",
  },
  {
    icon: Users,
    title: "CRM y seguimiento",
    body: "Leads, clientes, estados y próximos pasos. Tu equipo sabe qué hacer con cada contacto.",
    tags: ["Pipeline", "Estados", "Tareas"],
    outcome: "Cada lead con próximo paso claro",
  },
  {
    icon: Calendar,
    title: "Agenda inteligente",
    body: "Citas, confirmaciones, recordatorios y reprogramaciones. Menos no-shows y menos improvisación.",
    tags: ["Google Cal.", "Confirmaciones"],
    outcome: "Menos no-shows, más cierres",
  },
  {
    icon: Zap,
    title: "Automatización operativa",
    body: "Reduce copiar datos, enviar mensajes, clasificar solicitudes y derivar al equipo correcto.",
    tags: ["n8n", "APIs", "Webhooks"],
    outcome: "Horas semanales recuperadas",
  },
  {
    icon: Bot,
    title: "Asistentes IA",
    body: "FAQ, calificación de clientes y asistencia al equipo bajo reglas claras. Con guardrails.",
    tags: ["GPT", "Claude", "WhatsApp"],
    outcome: "Atención 24/7 sin perder calidad",
  },
  {
    icon: BarChart3,
    title: "Dashboards y reportes",
    body: "Leads, citas, ventas, tiempos de respuesta y conversión. Lo que el dueño necesita ver.",
    tags: ["Metabase", "GA4"],
    outcome: "Decisiones con datos",
  },
  {
    icon: Link2,
    title: "Integraciones a medida",
    body: "Conectamos Chatwoot, Odoo, n8n, calendarios, WhatsApp y lo que ya usas.",
    tags: ["APIs", "Legacy"],
    outcome: "Sistemas que por fin se hablan",
  },
];

export function SolutionsSection() {
  return (
    <Section id="soluciones" className="bg-bg-2">
      <Container>
        <SectionHead
          eyebrow="Soluciones"
          title={
            <>
              Soluciones que convierten{" "}
              <strong className="text-primary">procesos manuales</strong> en
              sistemas medibles.
            </>
          }
          lede="No vendemos herramientas sueltas. Las organizamos en frentes que, combinados, son el sistema operativo de tu empresa."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {solutions.map((s) => (
            <article
              key={s.title}
              className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-white p-7 transition hover:-translate-y-0.5 hover:border-larimar hover:shadow-[0_14px_30px_-12px_rgba(8,47,73,0.15)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-gradient-to-br from-larimar-soft to-sky-100 text-larimar-deep">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-text">{s.title}</h3>
              <p className="text-sm text-text-2">{s.body}</p>
              <div className="flex flex-wrap gap-1.5">
                {s.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-bg-2 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-text-2"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-auto border-t border-dashed border-line pt-3.5 text-[13px] font-medium text-primary">
                <span className="text-amber">→</span> {s.outcome}
              </div>
            </article>
          ))}
        </div>
      </Container>
    </Section>
  );
}

export function SectorsSection() {
  const sectors = [
    {
      tag: "Nicho #1",
      title: "Clínicas y odontólogos",
      body: "Recepción digital, citas, recordatorios, pacientes nuevos y reportes por doctor.",
      href: "/clinicas",
      featured: true,
      items: [
        "Agenda con confirmación automática",
        "Recordatorio 24h y 2h antes",
        "Bot de FAQ (precios, ubicación)",
        "Reactivación de pacientes",
      ],
    },
    {
      tag: "Nicho #2",
      title: "Academias y centros educativos",
      body: "Inscripciones, pagos, seguimiento a interesados y comunicación con padres.",
      items: ["Pipeline por curso", "Recordatorio de pago", "Formularios digitales"],
    },
    {
      tag: "Nicho #3",
      title: "Ferreterías y comercios",
      body: "Cotizaciones, seguimiento, pedidos por WhatsApp e historial comercial.",
      items: ["Cotizador desde catálogo", "Seguimiento post-venta", "Alertas de stock"],
    },
    {
      tag: "Nicho #4",
      title: "Servicios profesionales",
      body: "Prospectos, reuniones, propuestas y automatización administrativa.",
      items: ["Pipeline con próxima acción", "Agenda de reuniones", "Seguimiento de cobro"],
    },
  ];

  return (
    <Section id="sectores">
      <Container>
        <SectionHead
          eyebrow="Sectores prioritarios"
          title={
            <>
              Diseñado para negocios donde{" "}
              <strong className="text-primary">
                la atención rápida y el seguimiento importan.
              </strong>
            </>
          }
          lede="Empezamos con sectores donde el dolor es evidente y el ROI se nota rápido."
        />
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {sectors.map((s) => (
            <article
              key={s.title}
              className={`flex flex-col gap-3.5 rounded-[var(--radius-lg)] border bg-white p-7 transition hover:-translate-y-1 ${
                s.featured
                  ? "border-amber shadow-[0_14px_30px_-12px_rgba(249,115,22,0.15)]"
                  : "border-line hover:border-amber"
              }`}
            >
              <span className="self-start rounded-full bg-amber-soft px-2.5 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-amber-deep">
                {s.tag}
              </span>
              <h3 className="font-display text-lg font-bold text-text">{s.title}</h3>
              <p className="text-sm text-text-2">{s.body}</p>
              <ul className="space-y-1.5 text-[13.5px] text-text-2">
                {s.items.map((i) => (
                  <li key={i}>
                    <span className="text-amber">→ </span>
                    {i}
                  </li>
                ))}
              </ul>
              {s.href ? (
                <ButtonLink href={s.href} variant="ghost" className="mt-auto">
                  Ver landing de clínicas →
                </ButtonLink>
              ) : null}
            </article>
          ))}
        </div>
      </Container>
    </Section>
  );
}

export function FitSection() {
  const yes = [
    "Tienes clientes por WhatsApp, Instagram o llamadas",
    "Tu equipo repite las mismas tareas todos los días",
    "No hay seguimiento claro de leads, citas o pacientes",
    "Quieres crecer sin depender de libretas y Excel",
    "Necesitas ver números sin perseguir empleados",
  ];
  const no = [
    "Buscas solo “un bot barato”",
    "No estás dispuesto a cambiar procesos internos",
    "Quieres automatizar sin ordenar primero",
    "Nadie dentro del negocio liderará la implementación",
  ];

  return (
    <Section className="bg-bg-2">
      <Container>
        <SectionHead
          center
          eyebrow="Filtro de fit"
          title="Para quién sí — y para quién no"
          lede="Preferimos clientes serios. Así el trabajo rinde y el sistema se usa."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[var(--radius-xl)] border border-emerald-200 bg-white p-8">
            <h3 className="mb-4 font-display text-xl font-bold text-emerald-700">
              Esto es para ti si…
            </h3>
            <ul className="space-y-2.5">
              {yes.map((i) => (
                <li key={i} className="flex gap-2 text-sm text-text-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {i}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[var(--radius-xl)] border border-red-200 bg-white p-8">
            <h3 className="mb-4 font-display text-xl font-bold text-red-700">
              Esto no es para ti si…
            </h3>
            <ul className="space-y-2.5">
              {no.map((i) => (
                <li key={i} className="flex gap-2 text-sm text-text-2">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-rose" />
                  {i}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </Section>
  );
}

export function DeliverablesSection() {
  const items = [
    { icon: ClipboardList, label: "Mapa de procesos" },
    { icon: Users, label: "CRM configurado" },
    { icon: Inbox, label: "Bandeja omnicanal" },
    { icon: Settings2, label: "Flujos automatizados" },
    { icon: Bot, label: "Asistente IA entrenado" },
    { icon: Calendar, label: "Agenda conectada" },
    { icon: BarChart3, label: "Reportes en tiempo real" },
    { icon: BookOpen, label: "Manual de uso" },
    { icon: GraduationCap, label: "Capacitación del equipo" },
    { icon: LifeBuoy, label: "Soporte y mejora continua" },
  ];

  return (
    <Section>
      <Container>
        <div className="rounded-[var(--radius-xl)] border border-line bg-bg-2 p-8 lg:p-12">
          <div className="mb-8 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <Eyebrow>Qué entregamos realmente</Eyebrow>
              <h2 className="mt-3.5 font-display text-[clamp(28px,3.2vw,42px)] font-bold text-text">
                No entregamos tecnología suelta.{" "}
                <strong className="text-primary">Entregamos control operativo.</strong>
              </h2>
            </div>
            <p className="text-[15.5px] text-text-2">
              Entregamos activos concretos que tu equipo puede usar: procesos
              documentados, CRM configurado, automatizaciones, reportes y
              capacitación.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {items.map((i) => (
              <div
                key={i.label}
                className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-line bg-white p-4 text-sm font-medium text-text transition hover:border-tech"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-larimar-soft text-larimar-deep">
                  <i.icon className="h-4 w-4" />
                </span>
                {i.label}
              </div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}

export function StackSection() {
  const groups = [
    { name: "Atención", tools: "WhatsApp · Chatwoot" },
    { name: "Operación", tools: "Odoo · CRM · Google Calendar" },
    { name: "Automatización", tools: "n8n · APIs · Webhooks" },
    { name: "Reportes", tools: "Metabase · GA4" },
    { name: "Infraestructura", tools: "Cloudflare · Docker · PostgreSQL" },
    { name: "IA", tools: "GPT · Claude" },
  ];

  return (
    <Section
      id="stack"
      className="overflow-hidden bg-bg-dark text-white before:pointer-events-none before:absolute before:right-0 before:top-0 before:h-[500px] before:w-[500px] before:bg-[radial-gradient(circle,rgba(56,189,248,0.18),transparent_60%)] before:content-['']"
    >
      <Container className="relative z-10">
        <SectionHead
          dark
          eyebrow="Stack tecnológico"
          title={
            <>
              Herramientas{" "}
              <strong className="text-white">abiertas, seguras y escalables.</strong>
            </>
          }
          lede="No usamos “tecnología del futuro” como slogan. Usamos herramientas probadas y auditables, agrupadas por función."
        />
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div
              key={g.name}
              className="rounded-[var(--radius-md)] border border-white/10 bg-white/[0.04] p-5 transition hover:border-larimar/40 hover:bg-white/[0.08]"
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-larimar">
                {g.name}
              </div>
              <div className="mt-2 text-[15px] font-medium text-white">{g.tools}</div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

const faqs = [
  {
    q: "¿Necesito cambiar mi sistema actual?",
    a: "No. Trabajamos con lo que ya tienes y lo conectamos. Solo reemplazamos algo cuando es claramente la causa del desorden.",
  },
  {
    q: "¿La IA reemplaza a mi personal?",
    a: "No. La IA se usa para tareas repetitivas. El equipo humano cierra ventas, atiende casos complejos y decide. Tu equipo deja de ahogarse en lo mecánico.",
  },
  {
    q: "¿La evaluación es gratis y el diagnóstico también?",
    a: "La evaluación inicial de 15 minutos es gratuita. El Diagnóstico Operativo Inteligente es un producto pagado con entregables formales (mapa, blueprint, plan y cotización).",
  },
  {
    q: "¿Cuánto tarda el proyecto?",
    a: "Un sprint (un dolor específico) se entrega en 7–21 días. Un sistema completo toma 4–12 semanas según alcance. Preferimos sistemas estables antes que promesas rápidas.",
  },
  {
    q: "¿Puedo empezar pequeño?",
    a: "Sí, y es lo que recomendamos. Evaluación → diagnóstico o sprint corto → escala cuando ves resultados.",
  },
  {
    q: "¿Funciona con WhatsApp?",
    a: "Sí. Trabajamos con la WhatsApp Business API oficial (no versiones no oficiales que Meta puede banear).",
  },
  {
    q: "¿Qué pasa si mi equipo no es técnico?",
    a: "Entregamos manual, capacitamos y damos soporte. La métrica es que operen el sistema sin nosotros después de 30 días.",
  },
  {
    q: "¿Cuánto cuesta?",
    a: "La evaluación es gratis. El diagnóstico y la implementación se cotizan según alcance. Después del diagnóstico siempre hay números claros; si no te convence, no avanzamos.",
  },
];

export function FaqSection() {
  return (
    <Section id="faq">
      <Container>
        <SectionHead
          center
          eyebrow="Preguntas frecuentes"
          title="Las dudas reales que tiene un dueño antes de empezar."
        />
        <div className="mx-auto grid max-w-[1100px] gap-3 md:grid-cols-2">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group rounded-[var(--radius-md)] border border-line bg-white p-5 open:border-tech"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-semibold text-text [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="font-mono text-xl font-normal text-amber group-open:hidden">
                  +
                </span>
                <span className="hidden font-mono text-xl font-normal text-amber group-open:inline">
                  −
                </span>
              </summary>
              <p className="mt-3 text-[14.5px] leading-relaxed text-text-2">{f.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
}

export function EvaluationSection() {
  return (
    <Section id="evaluacion" className="bg-bg-2">
      <Container>
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <Eyebrow>Próximo paso</Eyebrow>
            <h2 className="mt-3 font-display text-[clamp(28px,3.2vw,42px)] font-bold text-primary">
              Cuéntanos tu caso. Te respondemos con una evaluación clara.
            </h2>
            <p className="mt-4 text-base text-text-2">
              Completa el formulario o escríbenos por WhatsApp. En 24–48h
              hábiles te damos respuesta inicial y, si hay fit, agendamos la
              evaluación de 15 minutos.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-text-2">
              {[
                "Sin compromiso",
                "Sin venta forzada",
                "Diagnóstico formal solo si tiene sentido",
              ].map((i) => (
                <li key={i} className="flex gap-2">
                  <Check className="h-4 w-4 text-success" /> {i}
                </li>
              ))}
            </ul>
            <ButtonLink
              href={whatsappHref("evaluacion-aside")}
              variant="wa"
              size="lg"
              className="mt-6"
              target="_blank"
              rel="noopener noreferrer"
            >
              Enviar mi caso por WhatsApp
            </ButtonLink>
          </div>
          <LeadForm source="home" />
        </div>
      </Container>
    </Section>
  );
}

export function FinalCtaSection() {
  return (
    <Section className="overflow-hidden bg-gradient-to-br from-primary to-primary-2 py-[90px] text-white before:pointer-events-none before:absolute before:-right-[200px] before:-top-[200px] before:h-[600px] before:w-[600px] before:bg-[radial-gradient(circle,rgba(56,189,248,0.3),transparent_60%)] before:content-[''] after:pointer-events-none after:absolute after:-bottom-[200px] after:-left-[200px] after:h-[400px] after:w-[400px] after:bg-[radial-gradient(circle,rgba(249,115,22,0.22),transparent_60%)] after:content-['']">
      <Container className="relative z-10 max-w-[780px] text-center">
        <Eyebrow tone="dark">Próximo paso</Eyebrow>
        <h2 className="mx-auto mt-4 max-w-[20ch] font-display text-[clamp(32px,4vw,50px)] font-bold text-white">
          ¿Quieres saber qué parte de tu negocio{" "}
          <span className="italic text-amber">se puede ordenar primero?</span>
        </h2>
        <p className="mx-auto mt-4 max-w-[50ch] text-lg text-white/78">
          Agenda una evaluación inicial y recibe una ruta clara para mejorar
          atención, seguimiento y control operativo.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <ButtonLink href="#evaluacion" size="lg">
            Quiero mi evaluación →
          </ButtonLink>
          <ButtonLink
            href={whatsappHref("final-cta")}
            variant="wa"
            size="lg"
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </ButtonLink>
        </div>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/16 bg-white/8 px-4 py-1.5 text-[13px] font-medium text-white/90">
          Respuesta inicial en 24–48h · Sin compromiso
        </div>
      </Container>
    </Section>
  );
}
