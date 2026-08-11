import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  Code2,
  Globe2,
  MessageSquareText,
  Phone,
  Search,
  Workflow,
} from "lucide-react";
import { MarketingContactForm } from "@/components/forms/marketing-contact-form";
import { DawnSweep, KineticText } from "@/components/ui/hero-motion";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/ui/motion";
import { Container, Eyebrow, Section, SectionHead } from "@/components/ui/section";
import { brand } from "@/lib/brand";
import { getPublishedPosts } from "@/lib/server/content";
import type { Locale } from "@/lib/i18n";

const copy = {
  es: {
    eyebrow: "Consultoría tecnológica para empresas",
    titleA: "Tu negocio no necesita más software.",
    titleB: "Necesita menos problemas.",
    lede:
      "Entendemos cómo trabaja tu empresa, encontramos dónde se pierden tiempo, clientes o visibilidad y construimos la solución correcta: web, automatización, IA o software a medida.",
    primaryCta: "Cuéntanos qué está pasando",
    phoneFallback: "Hablar con QuisqueyaTech",
    heroNotes: ["Español e inglés", "Atención directa", "Soluciones diseñadas alrededor del proceso"],
    panelEyebrow: "Primero entendemos el negocio",
    panelTitle: "La tecnología viene después del problema.",
    panelRows: [
      ["01", "Encontrar la fricción", "Dónde se pierden leads, tiempo o información."],
      ["02", "Diseñar el sistema", "El flujo, las reglas y la experiencia que realmente necesita el equipo."],
      ["03", "Construir lo necesario", "Web, automatización, IA, integración o software específico."],
      ["04", "Medir el resultado", "Qué entra, qué convierte, qué se pierde y qué debe mejorar."],
    ],
    problemEyebrow: "Negocio primero",
    problemTitle: "No empezamos preguntando qué software quieres. Empezamos preguntando cómo funciona tu empresa.",
    problemLede:
      "Los mejores proyectos aparecen cuando vemos el proceso completo: cómo llega un cliente, quién responde, dónde se registra, qué pasa después y qué depende todavía de memoria o trabajo manual.",
    problems: [
      ["Leads que se enfrían", "Llamadas, formularios y mensajes entran, pero nadie puede ver claramente qué pasó con cada oportunidad."],
      ["Trabajo repetido", "El equipo copia datos, persigue aprobaciones o repite tareas que un sistema podría coordinar."],
      ["Herramientas desconectadas", "La información existe, pero está repartida entre hojas de cálculo, WhatsApp, correo y aplicaciones aisladas."],
    ],
    servicesEyebrow: "Servicios",
    servicesTitle: "Construimos la pieza que resuelve el problema, no un paquete inflado.",
    servicesLede:
      "Podemos empezar con una presencia digital más efectiva o llegar hasta un sistema operativo específico para tu negocio. La solución depende del cuello de botella.",
    services: [
      ["Sitios web y SEO", "Sitios rápidos, claros y orientados a convertir búsquedas y visitas en conversaciones reales con tu empresa.", "/soluciones", "Web + SEO"],
      ["Automatización de procesos", "Seguimientos, tareas, reportes y traspasos que dejan de depender de copiar, recordar y perseguir.", "/soluciones/automatizacion", "Automatización"],
      ["IA para atención y captación", "Agentes de voz o texto para responder, recopilar información y ejecutar acciones dentro de límites definidos.", "/soluciones/agentes-de-ia", "IA aplicada"],
      ["Software e integraciones", "Herramientas pequeñas o sistemas específicos que conectan el proceso cuando el software genérico no encaja.", "/soluciones/software-e-integraciones", "Software a medida"],
    ],
    casesEyebrow: "Casos y trabajo seleccionado",
    casesTitle: "El trabajo debe demostrar cómo pensamos, no solo cómo diseñamos.",
    casesLede:
      "Estamos organizando nuestros proyectos como case studies completos. Mientras publicamos métricas y contexto, estos ejemplos muestran el tipo de trabajo que ya hemos desarrollado.",
    cases: [
      {
        name: "Connections RD",
        category: "Experiencia web",
        headline: "Una presencia digital más clara para presentar el negocio y convertir interés en acción.",
        work: "Arquitectura de información, diseño responsive y desarrollo web.",
        href: "https://connectionsrd.com",
      },
      {
        name: "The Vocal Room Academy",
        category: "Web + flujo de inscripción",
        headline: "Una experiencia enfocada en explicar la oferta y reducir fricción desde interés hasta inscripción.",
        work: "Sitio web, flujo de registro y automatización operativa.",
        href: "https://thevocalroomacademy.com",
      },
      {
        name: "Consulado Dominicano en Boston",
        category: "Información pública",
        headline: "Una experiencia web para organizar información institucional y facilitar acceso a servicios y comunicaciones.",
        work: "WordPress, estructura de contenido y operación digital.",
        href: "",
      },
    ],
    measurementEyebrow: "Medir, no adivinar",
    measurementTitle: "Una web o automatización debería poder decirte si está ayudando al negocio.",
    measurementBody:
      "Nuestro estándar es instrumentar los puntos que importan para que el trabajo pueda evaluarse con datos y no con opiniones.",
    measurement: [
      ["Tráfico y origen", "De dónde llegan las visitas que realmente importan."],
      ["Llamadas y contactos", "Qué páginas y campañas generan intención de hablar."],
      ["Leads y solicitudes", "Cuántas oportunidades entran y qué pasa después."],
      ["Conversión y seguimiento", "Dónde se pierden oportunidades y qué parte del proceso merece atención."],
    ],
    processEyebrow: "Cómo trabajamos",
    processTitle: "Entender → priorizar → construir → medir.",
    processLede:
      "Un proyecto útil empieza con una conversación concreta sobre el trabajo diario, no con una lista de tecnologías.",
    steps: [
      ["01", "Entender", "Mapeamos cómo llega el trabajo, quién interviene, qué herramientas se usan y dónde aparece la fricción."],
      ["02", "Priorizar", "Separamos el problema importante de las ideas que pueden esperar. No todo merece automatización."],
      ["03", "Construir", "Diseñamos e implementamos la solución mínima que cambia el proceso de forma visible."],
      ["04", "Medir", "Seguimos tráfico, acciones y resultados para saber qué funciona y qué debe cambiar."],
    ],
    resourcesEyebrow: "Recursos",
    resourcesTitle: "Ideas prácticas para tomar mejores decisiones tecnológicas.",
    resourcesBody:
      "Publicamos guías sobre automatización, IA, sistemas y presencia digital sin convertir cada problema en una excusa para vender una herramienta.",
    read: "Leer guía",
    contactEyebrow: "Hablemos del negocio",
    contactTitle: "Muéstranos cómo funciona hoy. Ahí empieza el proyecto.",
    contactBody:
      "Cuéntanos qué parte de la operación te cuesta más tiempo, clientes o control. Podemos empezar por teléfono o con el formulario; no necesitas llegar con una solución definida.",
    callLabel: "Llamar ahora",
    emailLabel: "Escribir por correo",
  },
  en: {
    eyebrow: "Technology consulting for growing businesses",
    titleA: "Your business does not need more software.",
    titleB: "It needs fewer problems.",
    lede:
      "We learn how your business actually works, find where time, customers, or visibility are being lost, and build the right solution—web, automation, AI, or custom software.",
    primaryCta: "Tell us what is happening",
    phoneFallback: "Talk to QuisqueyaTech",
    heroNotes: ["English and Spanish", "Direct access", "Solutions built around your process"],
    panelEyebrow: "We start with the business",
    panelTitle: "Technology comes after the problem.",
    panelRows: [
      ["01", "Find the friction", "Where leads, time, or information are being lost."],
      ["02", "Design the system", "The workflow, rules, and experience the team actually needs."],
      ["03", "Build what matters", "Web, automation, AI, integration, or specific software."],
      ["04", "Measure the result", "What comes in, what converts, what gets lost, and what should improve."],
    ],
    problemEyebrow: "Business first",
    problemTitle: "We do not start by asking what software you want. We start by asking how your business works.",
    problemLede:
      "The best projects appear when we can see the whole process: how a customer arrives, who responds, where information lives, what happens next, and what still depends on memory or manual work.",
    problems: [
      ["Leads go cold", "Calls, forms, and messages arrive, but nobody can clearly see what happened to each opportunity."],
      ["Work gets repeated", "The team copies data, chases approvals, or repeats tasks that a system could coordinate."],
      ["Tools stay disconnected", "The information exists, but it is split across spreadsheets, WhatsApp, email, and isolated apps."],
    ],
    servicesEyebrow: "Services",
    servicesTitle: "We build the piece that solves the problem, not a bloated package.",
    servicesLede:
      "We can start with a stronger digital presence or go as far as a business-specific operating system. The bottleneck determines the solution.",
    services: [
      ["Websites and SEO", "Fast, clear websites designed to turn searches and visits into real conversations with your business.", "/en/solutions", "Web + SEO"],
      ["Process automation", "Follow-up, tasks, reports, and handoffs that stop depending on copying, remembering, and chasing.", "/en/solutions/automation", "Automation"],
      ["AI for customer operations", "Voice or text agents that respond, collect information, and execute actions within clear boundaries.", "/en/solutions/ai-agents", "Applied AI"],
      ["Custom software and integrations", "Small tools or specific systems that connect the process when generic software does not fit.", "/en/solutions/software-and-integrations", "Custom software"],
    ],
    casesEyebrow: "Case studies and selected work",
    casesTitle: "The work should show how we think, not only how we design.",
    casesLede:
      "We are turning our projects into complete case studies. While we publish deeper metrics and context, these examples show the kind of work already delivered.",
    cases: [
      {
        name: "Connections RD",
        category: "Web experience",
        headline: "A clearer digital presence designed to present the business and move interest toward action.",
        work: "Information architecture, responsive design, and web development.",
        href: "https://connectionsrd.com",
      },
      {
        name: "The Vocal Room Academy",
        category: "Web + enrollment flow",
        headline: "An experience focused on explaining the offer and reducing friction from interest to enrollment.",
        work: "Website, registration flow, and operational automation.",
        href: "https://thevocalroomacademy.com",
      },
      {
        name: "Dominican Consulate in Boston",
        category: "Public information",
        headline: "A web experience built to organize institutional information and make services and communications easier to access.",
        work: "WordPress, content structure, and digital operations.",
        href: "",
      },
    ],
    measurementEyebrow: "Measure, do not guess",
    measurementTitle: "A website or automation should be able to tell you whether it is helping the business.",
    measurementBody:
      "Our standard is to instrument the points that matter so the work can be evaluated with data instead of opinion.",
    measurement: [
      ["Traffic and source", "Where the visits that actually matter are coming from."],
      ["Calls and contacts", "Which pages and campaigns generate intent to talk."],
      ["Leads and requests", "How many opportunities enter and what happens next."],
      ["Conversion and follow-up", "Where opportunities disappear and which part of the process needs attention."],
    ],
    processEyebrow: "How we work",
    processTitle: "Understand → prioritize → build → measure.",
    processLde:
      "A useful project starts with a concrete conversation about daily work, not a list of technologies.",
    steps: [
      ["01", "Understand", "Map how work arrives, who touches it, which tools are involved, and where friction appears."],
      ["02", "Prioritize", "Separate the important problem from ideas that can wait. Not everything should be automated."],
      ["03", "Build", "Design and implement the smallest solution that creates a visible operational change."],
      ["04", "Measure", "Track traffic, actions, and outcomes so we know what works and what should change."],
    ],
    resourcesEyebrow: "Resources",
    resourcesTitle: "Practical ideas for better technology decisions.",
    resourcesBody:
      "We publish guides on automation, AI, systems, and digital presence without turning every problem into an excuse to sell another tool.",
    read: "Read guide",
    contactEyebrow: "Let's talk about the business",
    contactTitle: "Show us how it works today. That is where the project starts.",
    contactBody:
      "Tell us which part of the operation is costing you the most time, customers, or visibility. We can start by phone or with the form—you do not need to arrive with a solution already defined.",
    callLabel: "Call now",
    emailLabel: "Send an email",
  },
} as const;

const problemIcons = [MessageSquareText, Workflow, Search];
const serviceIcons = [Globe2, Workflow, Bot, Code2];
const measurementIcons = [Search, Phone, MessageSquareText, BarChart3];

export async function HomePageContent({ locale }: { locale: Locale }) {
  const c = copy[locale];
  const base = locale === "es" ? "" : "/en";
  const posts = (await getPublishedPosts(locale)).slice(0, 3);
  const callHref = brand.publicPhoneHref || `mailto:${brand.publicEmail}`;
  const callText = brand.publicPhoneDisplay || c.phoneFallback;

  return (
    <>
      <Section className="hero-orchestration overflow-hidden py-14 sm:py-20 lg:py-24">
        <DawnSweep />
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_.92fr] lg:gap-16">
            <div>
              <div className="hero-support [--hero-delay:.02s]">
                <Eyebrow>{c.eyebrow}</Eyebrow>
              </div>
              <KineticText
                titleA={c.titleA}
                titleB={c.titleB}
                className="mt-5 max-w-[13.5ch] font-display text-[clamp(42px,6vw,72px)] font-extrabold leading-[.98] tracking-[-.05em] text-primary"
              />
              <p className="hero-support mt-6 max-w-[61ch] text-[clamp(17px,1.6vw,20px)] leading-relaxed text-text-2 [--hero-delay:.58s]">
                {c.lede}
              </p>
              <div className="hero-support mt-8 flex flex-col gap-3 sm:flex-row [--hero-delay:.7s]">
                <a
                  href={callHref}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-amber px-6 text-[15.5px] font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-amber-deep hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep focus-visible:ring-offset-2"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {callText}
                </a>
                <a
                  href="#contacto"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-line-2 bg-white px-6 text-[15.5px] font-semibold text-text transition hover:-translate-y-px hover:border-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep"
                >
                  {c.primaryCta}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
              <div className="hero-support mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-2 [--hero-delay:.8s]">
                {c.heroNotes.map((note) => (
                  <span key={note} className="inline-flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-success" aria-hidden="true" />
                    {note}
                  </span>
                ))}
              </div>
            </div>

            <Reveal delay={0.12}>
              <div className="relative rounded-[28px] border border-line bg-white p-5 shadow-[0_36px_90px_-55px_rgba(8,47,73,.6)] sm:p-7">
                <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-larimar/15 blur-2xl" aria-hidden="true" />
                <p className="font-mono text-xs font-semibold uppercase tracking-[.14em] text-tech">{c.panelEyebrow}</p>
                <h2 className="mt-3 max-w-[18ch] font-display text-3xl font-bold leading-tight text-primary">{c.panelTitle}</h2>
                <div className="mt-7 space-y-3">
                  {c.panelRows.map(([number, title, body]) => (
                    <div key={number} className="grid grid-cols-[42px_1fr] gap-3 rounded-xl border border-line bg-bg-2/70 p-4">
                      <span className="font-mono text-xs font-bold text-amber-deep">{number}</span>
                      <div>
                        <p className="font-semibold text-text">{title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-text-2">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {["Web", "SEO", "Automation", "AI", "Custom systems"].map((item) => (
                    <span key={item} className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-primary">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHead eyebrow={c.problemEyebrow} title={c.problemTitle} lede={c.problemLede} />
          <StaggerGroup className="grid gap-4 md:grid-cols-3">
            {c.problems.map(([title, body], index) => {
              const Icon = problemIcons[index];
              return (
                <StaggerItem key={title} index={index}>
                  <article className="h-full rounded-2xl border border-line bg-white p-7 shadow-[0_18px_45px_-36px_rgba(8,47,73,.45)]">
                    <Icon className="h-10 w-10 rounded-xl bg-larimar-soft p-2 text-larimar-deep" />
                    <h2 className="mt-5 font-display text-xl font-bold text-text">{title}</h2>
                    <p className="mt-2 leading-relaxed text-text-2">{body}</p>
                  </article>
                </StaggerItem>
              );
            })}
          </StaggerGroup>
        </Container>
      </Section>

      <Section id="servicios" className="bg-bg-2">
        <Container>
          <SectionHead eyebrow={c.servicesEyebrow} title={c.servicesTitle} lede={c.servicesLede} />
          <div className="grid gap-4 md:grid-cols-2">
            {c.services.map(([title, body, href, tag], index) => {
              const Icon = serviceIcons[index];
              return (
                <Reveal key={title} delay={index * 0.04}>
                  <Link href={href} className="group block h-full rounded-2xl border border-line bg-white p-7 transition hover:-translate-y-1 hover:border-larimar-deep/30 hover:shadow-lg">
                    <div className="flex items-start justify-between gap-5">
                      <Icon className="h-11 w-11 rounded-xl bg-primary p-2.5 text-white" />
                      <span className="rounded-full bg-bg-2 px-3 py-1.5 text-xs font-semibold text-mute">{tag}</span>
                    </div>
                    <h2 className="mt-6 font-display text-2xl font-bold text-primary">{title}</h2>
                    <p className="mt-3 max-w-[58ch] leading-relaxed text-text-2">{body}</p>
                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-amber-deep">
                      {locale === "es" ? "Ver cómo lo abordamos" : "See how we approach it"}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </Section>

      <Section id={locale === "es" ? "casos" : "case-studies"}>
        <Container>
          <SectionHead eyebrow={c.casesEyebrow} title={c.casesTitle} lede={c.casesLede} />
          <div className="grid gap-5 lg:grid-cols-3">
            {c.cases.map((item) => {
              const content = (
                <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex min-h-40 items-end bg-gradient-to-br from-primary via-primary-2 to-tech p-6 text-white">
                    <div>
                      <p className="font-mono text-xs font-semibold uppercase tracking-[.14em] text-larimar">{item.category}</p>
                      <h2 className="mt-2 font-display text-2xl font-bold">{item.name}</h2>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <p className="font-semibold leading-relaxed text-text">{item.headline}</p>
                    <p className="mt-3 text-sm leading-relaxed text-text-2">{item.work}</p>
                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-amber-deep">
                      {item.href ? (locale === "es" ? "Ver proyecto" : "View project") : locale === "es" ? "Case study en preparación" : "Case study in progress"}
                      {item.href ? <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /> : null}
                    </span>
                  </div>
                </article>
              );
              return item.href ? (
                <a key={item.name} href={item.href} target="_blank" rel="noopener noreferrer" className="block h-full">
                  {content}
                </a>
              ) : (
                <div key={item.name} className="h-full">{content}</div>
              );
            })}
          </div>
        </Container>
      </Section>

      <Section className="overflow-hidden bg-primary text-white">
        <Container className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
          <Reveal>
            <div>
              <Eyebrow tone="dark">{c.measurementEyebrow}</Eyebrow>
              <h2 className="mt-4 max-w-[18ch] font-display text-[clamp(32px,4vw,48px)] font-bold leading-tight">{c.measurementTitle}</h2>
              <p className="mt-5 max-w-[54ch] text-lg leading-relaxed text-white/70">{c.measurementBody}</p>
            </div>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2">
            {c.measurement.map(([title, body], index) => {
              const Icon = measurementIcons[index];
              return (
                <Reveal key={title} delay={index * 0.04}>
                  <div className="h-full rounded-2xl border border-white/12 bg-white/[.07] p-5 backdrop-blur">
                    <Icon className="h-9 w-9 rounded-lg bg-white/10 p-2 text-larimar" />
                    <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/65">{body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHead eyebrow={c.processEyebrow} title={c.processTitle} lede={c.processLede} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {c.steps.map(([number, title, body], index) => (
              <Reveal key={number} delay={index * 0.04}>
                <article className="h-full rounded-2xl border border-line bg-white p-6">
                  <span className="font-mono text-sm font-bold text-amber-deep">{number}</span>
                  <h3 className="mt-4 font-display text-xl font-bold text-primary">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-2">{body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="bg-bg-2">
        <Container>
          <SectionHead eyebrow={c.resourcesEyebrow} title={c.resourcesTitle} lede={c.resourcesBody} />
          <StaggerGroup className="grid gap-4 md:grid-cols-3">
            {posts.map((post, index) => (
              <StaggerItem key={post.slug} index={index}>
                <article className="h-full rounded-2xl border border-line bg-white p-6">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-deep">{post.category}</span>
                  <h2 className="mt-3 font-display text-xl font-bold">{post.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-text-2">{post.excerpt}</p>
                  <Link href={`${base}/recursos/${post.slug}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-tech">
                    {c.read}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </article>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </Section>

      <Section id="contacto" className="py-20 sm:py-24">
        <Container className="grid gap-10 lg:grid-cols-[.82fr_1.18fr] lg:items-start">
          <Reveal>
            <div className="lg:sticky lg:top-28">
              <Eyebrow>{c.contactEyebrow}</Eyebrow>
              <h2 className="mt-4 max-w-[15ch] font-display text-[clamp(34px,4vw,50px)] font-bold leading-tight text-primary">{c.contactTitle}</h2>
              <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-text-2">{c.contactBody}</p>
              <div className="mt-7 space-y-3">
                <a href={callHref} className="flex items-center gap-3 rounded-xl border border-line bg-white p-4 transition hover:border-larimar-deep/40 hover:shadow-sm">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber text-white"><Phone className="h-5 w-5" aria-hidden="true" /></span>
                  <span>
                    <span className="block text-xs font-semibold uppercase tracking-wider text-mute">{c.callLabel}</span>
                    <span className="mt-0.5 block font-semibold text-primary">{callText}</span>
                  </span>
                </a>
                <a href={`mailto:${brand.publicEmail}`} className="flex items-center gap-3 rounded-xl border border-line bg-white p-4 transition hover:border-larimar-deep/40 hover:shadow-sm">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-larimar-soft text-tech"><MessageSquareText className="h-5 w-5" aria-hidden="true" /></span>
                  <span>
                    <span className="block text-xs font-semibold uppercase tracking-wider text-mute">{c.emailLabel}</span>
                    <span className="mt-0.5 block font-semibold text-primary">{brand.publicEmail}</span>
                  </span>
                </a>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <MarketingContactForm locale={locale} />
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
