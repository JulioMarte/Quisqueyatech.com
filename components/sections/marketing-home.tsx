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
import { DawnSweep } from "@/components/ui/hero-motion";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/ui/motion";
import { Container, Eyebrow, Section, SectionHead } from "@/components/ui/section";
import { brand } from "@/lib/brand";
import { caseStudies } from "@/lib/case-studies";
import { getPublishedPosts } from "@/lib/server/content";
import { caseStudyPath, resourcePath, routePath, type SiteLocale } from "@/lib/routes";

const copy = {
  es: {
    eyebrow: "Consultoría tecnológica para empresas",
    titleA: "Tu negocio no necesita más software.",
    titleB: "Necesita menos problemas.",
    lede: "Entendemos cómo trabaja tu empresa, encontramos dónde se pierden tiempo, clientes o visibilidad y construimos la solución correcta: web, automatización, IA o software a medida.",
    call: "Llamar ahora",
    contact: "Cuéntanos qué está pasando",
    notes: ["Español e inglés", "Atención directa", "Tecnología después del problema"],
    diagnosisEyebrow: "Primero entendemos el negocio",
    diagnosisTitle: "No empezamos preguntando qué software quieres.",
    diagnosisBody:
      "Queremos ver qué ocurre cuando llega un cliente, quién responde, dónde se registra la información, qué depende de memoria y cómo sabes si el proceso terminó bien.",
    diagnosisSteps: [
      ["01", "Observar", "Cómo entra el trabajo y quién participa."],
      ["02", "Encontrar fricción", "Dónde se pierde tiempo, contexto o una oportunidad."],
      ["03", "Diseñar", "La intervención más pequeña que puede cambiar el resultado."],
    ],
    problemEyebrow: "Problemas que sí valen la pena resolver",
    problemTitle: "La fricción suele aparecer entre herramientas, personas y próximos pasos.",
    problemBody:
      "Una página bonita o una nueva app no ayudan si el proceso sigue perdiendo información o dejando clientes sin seguimiento.",
    problems: [
      [
        "Leads que se enfrían",
        "Llamadas, mensajes o formularios entran, pero el siguiente paso no está definido o llega demasiado tarde.",
      ],
      [
        "Trabajo manual repetido",
        "El equipo copia datos, persigue respuestas y prepara reportes que podrían coordinarse mejor.",
      ],
      [
        "Poca visibilidad",
        "Hay actividad, pero nadie puede explicar con confianza qué fuente, página o flujo produjo una oportunidad.",
      ],
    ],
    servicesEyebrow: "Servicios",
    servicesTitle: "Usamos la herramienta que corresponde al cuello de botella.",
    servicesBody:
      "A veces la respuesta es una web más clara. Otras veces es automatización, un agente o una pequeña aplicación. No vendemos una solución única para todos.",
    selectedWork: "Trabajo seleccionado",
    selectedWorkTitle: "Casos con contexto, no estadísticas inventadas.",
    selectedWorkBody:
      "Mostramos qué problema se abordó, qué se construyó y qué decisiones tomamos. Los resultados cuantitativos solo se publican cuando pueden verificarse.",
    measureEyebrow: "Medir, no adivinar",
    measureTitle: "Cada sistema debería dejar evidencia suficiente para saber si está ayudando.",
    measureBody:
      "No nos interesa reportar solamente visitas. Diseñamos la medición para acercarnos a la cadena completa desde origen hasta una acción comercial verificable.",
    processEyebrow: "Cómo trabajamos",
    processTitle: "Entender → priorizar → construir → medir.",
    resourcesEyebrow: "Recursos",
    resourcesTitle: "Contenido para tomar mejores decisiones tecnológicas.",
    resourcesBody:
      "Publicamos guías sobre sistemas, automatización, IA, web y medición cuando tenemos algo útil que explicar.",
    read: "Leer recurso",
    contactEyebrow: "Contacto",
    contactTitle: "Muéstranos cómo funciona hoy tu negocio.",
    contactBody:
      "No necesitas llegar con una solución definida. Describe qué parte se está enredando y empezamos por entenderla.",
  },
  en: {
    eyebrow: "Technology consulting for businesses",
    titleA: "Your business does not need more software.",
    titleB: "It needs fewer problems.",
    lede: "We learn how your company works, find where time, customers, or visibility are being lost, and build the right solution: web, automation, AI, or focused software.",
    call: "Call now",
    contact: "Tell us what is happening",
    notes: ["English and Spanish", "Direct support", "Technology comes after the problem"],
    diagnosisEyebrow: "We start with the business",
    diagnosisTitle: "We do not begin by asking which software you want.",
    diagnosisBody:
      "We want to see what happens when a customer arrives, who responds, where information is recorded, what depends on memory, and how you know the process ended correctly.",
    diagnosisSteps: [
      ["01", "Observe", "How work enters and who participates."],
      ["02", "Find friction", "Where time, context, or an opportunity is being lost."],
      ["03", "Design", "The smallest intervention that can change the outcome."],
    ],
    problemEyebrow: "Problems worth solving",
    problemTitle: "Friction often lives between tools, people, and next steps.",
    problemBody:
      "A polished website or another application does not help if the process still loses information or leaves customers without follow-up.",
    problems: [
      [
        "Leads go cold",
        "Calls, messages, or forms arrive, but the next step is undefined or happens too late.",
      ],
      [
        "Manual work repeats",
        "The team copies data, chases responses, and prepares reports that could be coordinated better.",
      ],
      [
        "Visibility is weak",
        "There is activity, but nobody can confidently explain which source, page, or workflow produced an opportunity.",
      ],
    ],
    servicesEyebrow: "Services",
    servicesTitle: "We use the tool that fits the bottleneck.",
    servicesBody:
      "Sometimes the answer is a clearer website. Other times it is automation, an agent, or a small application. We do not sell one solution to everyone.",
    selectedWork: "Selected work",
    selectedWorkTitle: "Case studies with context, not invented statistics.",
    selectedWorkBody:
      "We show the problem we addressed, what was built, and the decisions behind it. Quantitative outcomes are published only when they can be verified.",
    measureEyebrow: "Measure, do not guess",
    measureTitle: "Every system should leave enough evidence to tell whether it is helping.",
    measureBody:
      "We are not interested in reporting traffic alone. Measurement should move toward the complete chain from source to a verifiable commercial action.",
    processEyebrow: "How we work",
    processTitle: "Understand → prioritize → build → measure.",
    resourcesEyebrow: "Resources",
    resourcesTitle: "Content for better technology decisions.",
    resourcesBody:
      "We publish guides about systems, automation, AI, web, and measurement when there is something useful to explain.",
    read: "Read resource",
    contactEyebrow: "Contact",
    contactTitle: "Show us how your business works today.",
    contactBody:
      "You do not need to arrive with a solution already defined. Describe what is getting tangled and we start by understanding it.",
  },
} as const;

const problemIcons = [MessageSquareText, Workflow, BarChart3];
const serviceCards = (locale: SiteLocale) => {
  const es = locale === "es";
  return [
    {
      icon: Globe2,
      title: es ? "Sitios web y SEO" : "Websites and SEO",
      body: es
        ? "Presencia digital orientada a búsquedas, claridad, conversión y medición."
        : "Digital presence built around search, clarity, conversion, and measurement.",
      href: routePath("webSeo", locale),
    },
    {
      icon: Workflow,
      title: es ? "Automatización" : "Automation",
      body: es
        ? "Seguimientos, traspasos y tareas repetitivas coordinadas por reglas claras."
        : "Follow-up, handoffs, and repetitive work coordinated by clear rules.",
      href: routePath("automation", locale),
    },
    {
      icon: Bot,
      title: es ? "Agentes de IA" : "AI agents",
      body: es
        ? "Voz y texto conectados a herramientas controladas y handoff humano."
        : "Voice and text connected to controlled tools and human handoff.",
      href: routePath("agents", locale),
    },
    {
      icon: Code2,
      title: es ? "Software e integraciones" : "Software and integrations",
      body: es
        ? "Aplicaciones y APIs enfocadas cuando la herramienta genérica deja una brecha real."
        : "Focused applications and APIs when generic software leaves a real gap.",
      href: routePath("software", locale),
    },
  ];
};

export async function MarketingHomePage({ locale }: { locale: SiteLocale }) {
  const c = copy[locale];
  const es = locale === "es";
  const posts = (await getPublishedPosts(locale)).slice(0, 3);
  const contactAnchor = es ? "contacto" : "contact";

  return (
    <div lang={locale}>
      <Section className="hero-orchestration overflow-hidden py-16 sm:py-20 lg:py-24">
        <DawnSweep />
        <Container className="relative max-w-[1120px] text-center">
          <Eyebrow>{c.eyebrow}</Eyebrow>
          <h1 className="mx-auto mt-5 max-w-[18ch] font-display text-[clamp(42px,6vw,72px)] font-extrabold leading-[1.02] tracking-[-.05em] text-primary">
            {c.titleA}{" "}
            <span className="bg-gradient-to-r from-amber-deep to-larimar-deep bg-clip-text text-transparent">
              {c.titleB}
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-[68ch] text-[clamp(17px,1.6vw,20px)] leading-relaxed text-text-2">
            {c.lede}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={brand.publicPhoneHref}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-amber px-6 font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-amber-deep hover:shadow-md"
            >
              <Phone className="h-4 w-4" /> {c.call} · {brand.publicPhoneDisplay}
            </a>
            <Link
              href={`#${contactAnchor}`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-line bg-white px-6 font-semibold text-primary transition hover:border-larimar-deep/30 hover:bg-bg-2"
            >
              {c.contact} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-text-2">
            {c.notes.map((note) => (
              <span key={note} className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-success" /> {note}
              </span>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="pt-8 sm:pt-10">
        <Container className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <Reveal>
            <div>
              <Eyebrow>{c.diagnosisEyebrow}</Eyebrow>
              <h2 className="mt-4 max-w-[18ch] font-display text-[clamp(32px,4vw,48px)] font-bold leading-tight text-primary">
                {c.diagnosisTitle}
              </h2>
              <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-text-2">
                {c.diagnosisBody}
              </p>
              <Link
                href={routePath("method", locale)}
                className="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-tech"
              >
                {es ? "Ver cómo trabajamos" : "See how we work"} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
          <StaggerGroup className="space-y-3">
            {c.diagnosisSteps.map(([number, title, body], index) => (
              <StaggerItem key={number} index={index}>
                <div className="grid grid-cols-[54px_1fr] gap-4 rounded-2xl border border-line bg-white p-5 shadow-[0_18px_45px_-38px_rgba(8,47,73,.45)]">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary font-mono text-sm font-bold text-white">
                    {number}
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-bold text-primary">{title}</h3>
                    <p className="mt-1.5 leading-relaxed text-text-2">{body}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </Section>

      <Section className="bg-bg-2">
        <Container>
          <SectionHead eyebrow={c.problemEyebrow} title={c.problemTitle} lede={c.problemBody} />
          <StaggerGroup className="grid gap-4 md:grid-cols-3">
            {c.problems.map(([title, body], index) => {
              const Icon = problemIcons[index];
              return (
                <StaggerItem key={title} index={index}>
                  <article className="h-full rounded-2xl border border-line bg-white p-7">
                    <Icon className="h-10 w-10 rounded-xl bg-larimar-soft p-2 text-larimar-deep" />
                    <h3 className="mt-5 font-display text-xl font-bold text-primary">{title}</h3>
                    <p className="mt-2 leading-relaxed text-text-2">{body}</p>
                  </article>
                </StaggerItem>
              );
            })}
          </StaggerGroup>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHead eyebrow={c.servicesEyebrow} title={c.servicesTitle} lede={c.servicesBody} />
          <div className="grid gap-4 md:grid-cols-2">
            {serviceCards(locale).map(({ icon: Icon, title, body, href }, index) => (
              <Reveal key={href} delay={index * 0.04}>
                <Link
                  href={href}
                  className="group block h-full rounded-2xl border border-line bg-white p-7 transition hover:-translate-y-1 hover:border-larimar-deep/30 hover:shadow-lg"
                >
                  <Icon className="h-11 w-11 rounded-xl bg-primary p-2.5 text-white" />
                  <h3 className="mt-5 font-display text-2xl font-bold text-primary">{title}</h3>
                  <p className="mt-2 leading-relaxed text-text-2">{body}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-amber-deep">
                    {es ? "Explorar" : "Explore"}{" "}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
          <Link
            href={routePath("solutions", locale)}
            className="mt-7 inline-flex min-h-11 items-center gap-2 font-semibold text-tech"
          >
            {es ? "Ver todos los servicios" : "View all services"}{" "}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Container>
      </Section>

      <Section className="bg-primary text-white">
        <Container>
          <SectionHead
            dark
            eyebrow={c.selectedWork}
            title={c.selectedWorkTitle}
            lede={c.selectedWorkBody}
          />
          <StaggerGroup className="grid gap-4 lg:grid-cols-3">
            {caseStudies.map((study, index) => {
              const item = study.locale[locale];
              return (
                <StaggerItem key={study.key} index={index}>
                  <Link
                    href={caseStudyPath(study.key, locale)}
                    className="group flex h-full flex-col rounded-2xl border border-white/15 bg-white/[.06] p-7 backdrop-blur transition hover:-translate-y-1 hover:bg-white/[.09]"
                  >
                    <span className="text-xs font-semibold uppercase tracking-[.16em] text-larimar">
                      {item.category}
                    </span>
                    <h3 className="mt-4 font-display text-2xl font-bold text-white">
                      {study.client}
                    </h3>
                    <p className="mt-3 flex-1 leading-relaxed text-white/70">{item.summary}</p>
                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-amber">
                      {es ? "Ver caso" : "View case"}{" "}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerGroup>
          <Link
            href={routePath("caseStudies", locale)}
            className="mt-7 inline-flex min-h-11 items-center gap-2 font-semibold text-larimar"
          >
            {es ? "Todos los casos" : "All case studies"} <ArrowRight className="h-4 w-4" />
          </Link>
        </Container>
      </Section>

      <Section>
        <Container className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <Reveal>
            <div>
              <Eyebrow>{c.measureEyebrow}</Eyebrow>
              <h2 className="mt-4 max-w-[18ch] font-display text-[clamp(32px,4vw,48px)] font-bold leading-tight text-primary">
                {c.measureTitle}
              </h2>
              <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-text-2">
                {c.measureBody}
              </p>
            </div>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [
                Search,
                es ? "Origen y tráfico" : "Source and traffic",
                es
                  ? "Cómo llegaron y qué páginas atrajeron intención."
                  : "How people arrived and which pages created intent.",
              ],
              [
                Phone,
                es ? "Llamadas y contactos" : "Calls and contacts",
                es
                  ? "Acciones que indican que una visita quiere avanzar."
                  : "Actions showing that a visit wants to move forward.",
              ],
              [
                MessageSquareText,
                es ? "Leads y solicitudes" : "Leads and requests",
                es
                  ? "Qué entró al proceso y cuál es su próximo paso."
                  : "What entered the process and what happens next.",
              ],
              [
                BarChart3,
                es ? "Conversión y seguimiento" : "Conversion and follow-up",
                es
                  ? "Qué terminó en una acción comercial verificable."
                  : "What ended in a verifiable commercial action.",
              ],
            ].map(([Icon, title, body], index) => {
              const CardIcon = Icon as typeof Search;
              return (
                <Reveal key={String(title)} delay={index * 0.04}>
                  <div className="h-full rounded-2xl border border-line bg-white p-6">
                    <CardIcon className="h-9 w-9 rounded-lg bg-larimar-soft p-2 text-tech" />
                    <h3 className="mt-4 font-display text-lg font-bold text-primary">
                      {String(title)}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-text-2">{String(body)}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </Section>

      <Section className="bg-bg-2">
        <Container>
          <SectionHead eyebrow={c.processEyebrow} title={c.processTitle} />
          <div className="grid gap-3 md:grid-cols-4">
            {(es
              ? [
                  ["01", "Entender", "Ver el proceso real y sus restricciones."],
                  ["02", "Priorizar", "Elegir la fricción que justifica inversión."],
                  ["03", "Construir", "Implementar una solución pequeña y controlable."],
                  ["04", "Medir", "Observar uso real y corregir con evidencia."],
                ]
              : [
                  ["01", "Understand", "See the real workflow and its constraints."],
                  ["02", "Prioritize", "Choose the friction worth investing in."],
                  ["03", "Build", "Implement a small, controllable solution."],
                  ["04", "Measure", "Observe real usage and correct with evidence."],
                ]
            ).map(([number, title, body]) => (
              <div key={number} className="rounded-2xl border border-line bg-white p-6">
                <span className="font-mono text-sm font-bold text-amber-deep">{number}</span>
                <h3 className="mt-4 font-display text-xl font-bold text-primary">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-2">{body}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {posts.length ? (
        <Section>
          <Container>
            <SectionHead
              eyebrow={c.resourcesEyebrow}
              title={c.resourcesTitle}
              lede={c.resourcesBody}
            />
            <div className="grid gap-4 md:grid-cols-3">
              {posts.map((post) => (
                <article key={post.slug} className="rounded-2xl border border-line bg-white p-6">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-deep">
                    {post.category}
                  </span>
                  <h3 className="mt-3 font-display text-xl font-bold text-primary">{post.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-text-2">{post.excerpt}</p>
                  <Link
                    href={resourcePath(locale, post.slug)}
                    className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-tech"
                  >
                    {c.read} <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              ))}
            </div>
            <Link
              href={routePath("resources", locale)}
              className="mt-7 inline-flex min-h-11 items-center gap-2 font-semibold text-tech"
            >
              {es ? "Todos los recursos" : "All resources"} <ArrowRight className="h-4 w-4" />
            </Link>
          </Container>
        </Section>
      ) : null}

      <Section id={contactAnchor} className="bg-bg-2">
        <Container className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <Reveal>
            <div>
              <Eyebrow>{c.contactEyebrow}</Eyebrow>
              <h2 className="mt-4 max-w-[18ch] font-display text-[clamp(32px,4vw,48px)] font-bold leading-tight text-primary">
                {c.contactTitle}
              </h2>
              <p className="mt-5 max-w-[56ch] text-lg leading-relaxed text-text-2">
                {c.contactBody}
              </p>
              <a
                href={brand.publicPhoneHref}
                className="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-primary hover:text-amber-deep"
              >
                <Phone className="h-4 w-4" /> {brand.publicPhoneDisplay}
              </a>
              <a
                href={`mailto:${brand.publicEmail}`}
                className="mt-2 block text-sm text-text-2 hover:text-tech"
              >
                {brand.publicEmail}
              </a>
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <MarketingContactForm locale={locale} />
          </Reveal>
        </Container>
      </Section>
    </div>
  );
}
