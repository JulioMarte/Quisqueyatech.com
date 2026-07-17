import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Bot,
  Check,
  Clock3,
  Code2,
  Headphones,
  Layers3,
  Mic2,
  Route,
  Sparkles,
  Workflow,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ScheduleModalTrigger } from "@/components/evaluation/schedule-modal-trigger";
import { DawnSweep, KineticText, SystemFlow } from "@/components/ui/hero-motion";
import {
  MotionCard,
  Reveal,
  ScrollProgressSteps,
  StaggerGroup,
  StaggerItem,
} from "@/components/ui/motion";
import { Container, Eyebrow, Section, SectionHead } from "@/components/ui/section";
import { brand } from "@/lib/brand";
import { getPublishedPosts } from "@/lib/server/content";
import type { Locale } from "@/lib/i18n";

const copy = {
  es: {
    eyebrow: "Automatización, IA y software para empresas",
    titleA: "Tu empresa no necesita más herramientas.",
    titleB: "Necesita que trabajen juntas.",
    lede: "Evaluamos cómo opera tu equipo, detectamos dónde se pierde tiempo y diseñamos automatizaciones, agentes de IA y software que mejoran la productividad sin complicar la operación.",
    now: "Quiero mi evaluación ahora",
    schedule: "Agendar mi evaluación",
    notes: [
      "Evaluación inicial sin costo",
      "Disponible en español e inglés",
      "Resumen preliminar inmediato",
    ],
    problemEyebrow: "El problema no es la falta de tecnología",
    problemTitle:
      "El trabajo se frena cuando procesos, personas y herramientas operan por separado.",
    problemLede:
      "No recomendamos software por moda. Buscamos dónde se repite trabajo, se pierde información o una decisión llega demasiado tarde.",
    problems: [
      [
        "Trabajo manual que se multiplica",
        "Datos copiados entre formularios, hojas de cálculo y sistemas que nunca se sincronizan.",
      ],
      [
        "Seguimientos que dependen de memoria",
        "Solicitudes, clientes y tareas importantes quedan sin un próximo paso visible.",
      ],
      [
        "Información difícil de convertir en decisiones",
        "Los reportes llegan tarde o requieren horas de preparación manual.",
      ],
    ],
    solutionsEyebrow: "Soluciones",
    solutionsTitle: "Tecnología aplicada a un resultado operativo claro.",
    solutionsLede:
      "Podemos empezar con una mejora puntual o diseñar un sistema por fases. La herramienta se elige después de entender el proceso.",
    solutionCards: [
      [
        "Automatización de procesos",
        "Conecta tareas repetitivas, aprobaciones, seguimiento y reportes para que el trabajo avance sin persecución constante.",
        "/soluciones/automatizacion",
      ],
      [
        "Agentes de IA",
        "Agentes de voz o texto que recopilan información, atienden solicitudes y ejecutan tareas con límites definidos.",
        "/soluciones/agentes-de-ia",
      ],
      [
        "Software e integraciones",
        "Aplicaciones e integraciones que unen los datos y herramientas que tu empresa ya utiliza.",
        "/soluciones/software-e-integraciones",
      ],
    ],
    assessmentEyebrow: "Empieza con claridad",
    assessmentTitle: "Una evaluación que también demuestra lo que podemos construir.",
    assessmentBody:
      "Nuestro agente de voz realiza un levantamiento estructurado de 12–15 minutos. Al terminar recibes tres oportunidades preliminares, su impacto esperado y un próximo paso claro.",
    methodEyebrow: "Cómo trabajamos",
    methodTitle: "Primero entendemos. Después diseñamos. Finalmente implementamos.",
    steps: [
      ["01", "Evaluar", "Identificamos procesos, fricción, herramientas y prioridades."],
      [
        "02",
        "Priorizar",
        "Separamos oportunidades reales de ideas que todavía no justifican inversión.",
      ],
      ["03", "Diseñar", "Definimos el flujo, los controles y la tecnología necesaria."],
      ["04", "Implementar", "Construimos, probamos, capacitamos y medimos con uso real."],
    ],
    founderEyebrow: "Responsabilidad directa",
    founderTitle: "Una firma tecnológica con atención de fundador.",
    founderBody:
      "Julio lidera las evaluaciones, el diseño de soluciones y la relación con cada empresa. QuisqueyaTech trabaja desde República Dominicana con empresas dentro y fuera del país.",
    resources: "Recursos para tomar mejores decisiones tecnológicas",
    resourcesBody:
      "Guías honestas sobre automatización, agentes de IA e integración de sistemas. Sin tendencias vacías ni promesas infladas.",
    read: "Leer guía",
    finalTitle: "Descubre dónde la tecnología puede producir el mayor impacto.",
    finalBody: "Completa la evaluación ahora o reserva el horario que te resulte más cómodo.",
  },
  en: {
    eyebrow: "Automation, AI, and software for modern companies",
    titleA: "Your business does not need more tools.",
    titleB: "It needs the right ones working together.",
    lede: "We examine how your team operates, find where time is lost, and design automation, AI agents, and software that improve productivity without adding operational complexity.",
    now: "Start my assessment now",
    schedule: "Schedule my assessment",
    notes: [
      "Free initial assessment",
      "Available in English and Spanish",
      "Immediate preliminary summary",
    ],
    problemEyebrow: "Technology is rarely the real problem",
    problemTitle: "Work slows down when processes, people, and tools operate separately.",
    problemLede:
      "We do not recommend software because it is trending. We look for repeated work, missing information, and decisions that arrive too late.",
    problems: [
      [
        "Manual work keeps multiplying",
        "Data is copied between forms, spreadsheets, and systems that never stay in sync.",
      ],
      [
        "Follow-up depends on memory",
        "Requests, customers, and important tasks have no visible next step.",
      ],
      [
        "Information is hard to turn into decisions",
        "Reports arrive late or take hours of manual preparation.",
      ],
    ],
    solutionsEyebrow: "Solutions",
    solutionsTitle: "Technology tied to a clear operational outcome.",
    solutionsLede:
      "Start with one targeted improvement or build a system in phases. We choose the technology after understanding the process.",
    solutionCards: [
      [
        "Process automation",
        "Connect recurring tasks, approvals, follow-up, and reporting so work keeps moving.",
        "/en/solutions/automation",
      ],
      [
        "AI agents",
        "Voice and text agents that collect information, handle requests, and perform tasks within defined boundaries.",
        "/en/solutions/ai-agents",
      ],
      [
        "Software and integrations",
        "Applications and integrations that connect the data and tools your company already uses.",
        "/en/solutions/software-and-integrations",
      ],
    ],
    assessmentEyebrow: "Start with clarity",
    assessmentTitle: "An assessment that also demonstrates what we can build.",
    assessmentBody:
      "Our voice agent runs a structured 12–15 minute discovery session. You receive three preliminary opportunities, expected impact, and a clear next step.",
    methodEyebrow: "How we work",
    methodTitle: "Understand first. Design second. Then implement.",
    steps: [
      ["01", "Assess", "Map processes, friction, tools, and priorities."],
      [
        "02",
        "Prioritize",
        "Separate real opportunities from ideas that do not justify investment yet.",
      ],
      ["03", "Design", "Define the workflow, controls, and technology required."],
      ["04", "Implement", "Build, test, train, and measure with real usage."],
    ],
    founderEyebrow: "Direct accountability",
    founderTitle: "A technology firm with founder-level attention.",
    founderBody:
      "Julio leads assessments, solution design, and each client relationship. QuisqueyaTech works from the Dominican Republic with companies at home and abroad.",
    resources: "Resources for better technology decisions",
    resourcesBody:
      "Practical guidance on automation, AI agents, and systems integration—without empty trends or inflated promises.",
    read: "Read guide",
    finalTitle: "Find where technology can create the greatest impact.",
    finalBody: "Complete the assessment now or reserve a time that works for you.",
  },
} as const;

export async function HomePageContent({ locale }: { locale: Locale }) {
  const c = copy[locale];
  const base = locale === "es" ? "" : "/en";
  const posts = (await getPublishedPosts(locale)).slice(0, 3);
  const problemIcons = [Workflow, Route, Layers3];
  const solutionIcons = [Workflow, Bot, Code2];
  return (
    <>
      <Section className="hero-orchestration overflow-hidden py-16 sm:py-20">
        <DawnSweep />
        <Container className="max-w-[1080px] text-center">
          <div className="hero-support [--hero-delay:.02s]">
            <Eyebrow>{c.eyebrow}</Eyebrow>
          </div>
          <KineticText
            titleA={c.titleA}
            titleB={c.titleB}
            className="mx-auto mt-5 max-w-[18ch] font-display text-[clamp(40px,6vw,68px)] font-extrabold leading-[1.03] tracking-[-.045em] text-primary"
          />
          <p className="hero-support mx-auto mt-6 max-w-[65ch] text-[clamp(17px,1.6vw,20px)] leading-relaxed text-text-2 [--hero-delay:.6s]">
            {c.lede}
          </p>
          <div className="hero-support mt-8 flex flex-col justify-center gap-3 sm:flex-row [--hero-delay:.72s]">
            <ButtonLink
              href={`${base}/${locale === "es" ? "evaluacion/ahora" : "assessment/now"}`}
              size="lg"
            >
              <Mic2 className="h-4 w-4" />
              {c.now}
            </ButtonLink>
            <ScheduleModalTrigger source="hero-secondary" size="lg" variant="outline">
              <Clock3 className="h-4 w-4" />
              {c.schedule}
            </ScheduleModalTrigger>
          </div>
          <div className="hero-support mt-7 flex flex-col justify-center gap-2 text-sm text-text-2 sm:flex-row sm:flex-wrap sm:gap-x-6 [--hero-delay:.82s]">
            {c.notes.map((note) => (
              <span key={note} className="inline-flex items-center justify-center gap-1.5">
                <Check className="h-4 w-4 text-success" />
                {note}
              </span>
            ))}
          </div>
          <SystemFlow
            labels={
              locale === "es"
                ? ["Automatización", "Agentes de IA", "Software"]
                : ["Automation", "AI agents", "Software"]
            }
            output={locale === "es" ? "Un solo sistema" : "One connected system"}
          />
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
                  <article className="interactive-card h-full rounded-xl border border-line bg-white p-7 shadow-[0_12px_30px_-24px_rgba(8,47,73,.4)]">
                    <Icon className="h-10 w-10 rounded-lg bg-larimar-soft p-2 text-larimar-deep" />
                    <h2 className="mt-5 font-display text-xl font-bold text-text">{title}</h2>
                    <p className="mt-2 leading-relaxed text-text-2">{body}</p>
                  </article>
                </StaggerItem>
              );
            })}
          </StaggerGroup>
        </Container>
      </Section>

      <Section className="bg-bg-2">
        <Container>
          <SectionHead
            eyebrow={c.solutionsEyebrow}
            title={c.solutionsTitle}
            lede={c.solutionsLede}
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {c.solutionCards.map(([title, body, href], index) => {
              const Icon = solutionIcons[index];
              return (
                <MotionCard key={title} index={index}>
                  <Link
                    href={href}
                    className="interactive-card group block h-full rounded-xl border border-line bg-white p-7"
                  >
                    <Icon className="h-10 w-10 rounded-lg bg-primary p-2 text-white transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-3 group-hover:scale-105" />
                    <h2 className="mt-5 font-display text-xl font-bold">{title}</h2>
                    <p className="mt-2 min-h-24 leading-relaxed text-text-2">{body}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-amber-deep">
                      {locale === "es" ? "Explorar solución" : "Explore solution"}
                      <ArrowRight className="motion-arrow h-4 w-4" />
                    </span>
                  </Link>
                </MotionCard>
              );
            })}
          </div>
        </Container>
      </Section>

      <Section className="overflow-hidden bg-primary text-white">
        <Container className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
          <Reveal>
            <div>
              <Eyebrow tone="dark">{c.assessmentEyebrow}</Eyebrow>
              <h2 className="mt-4 max-w-[18ch] font-display text-[clamp(32px,4vw,48px)] font-bold leading-tight">
                {c.assessmentTitle}
              </h2>
              <p className="mt-5 max-w-[56ch] text-lg leading-relaxed text-white/75">
                {c.assessmentBody}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <ButtonLink
                  href={`${base}/${locale === "es" ? "evaluacion/ahora" : "assessment/now"}`}
                  size="lg"
                >
                  <Mic2 className="h-4 w-4" />
                  {c.now}
                </ButtonLink>
                <ScheduleModalTrigger source="hero" size="lg" variant="on-dark-outline">
                  <Clock3 className="h-4 w-4" />
                  {c.schedule}
                </ScheduleModalTrigger>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="rounded-2xl border border-white/15 bg-white/[.07] p-7 backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-larimar/20">
                  <Headphones className="h-6 w-6 text-larimar" />
                </span>
                <div>
                  <p className="font-semibold">
                    {locale === "es" ? "Evaluación guiada por voz" : "Voice-guided assessment"}
                  </p>
                  <p className="text-sm text-white/60">12–15 min · ES / EN</p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {(locale === "es"
                  ? [
                      "Entiende tu proceso actual",
                      "Detecta trabajo repetitivo",
                      "Prioriza oportunidades",
                      "Entrega un resumen inmediato",
                    ]
                  : [
                      "Understands your current process",
                      "Finds repetitive work",
                      "Prioritizes opportunities",
                      "Delivers an immediate summary",
                    ]
                ).map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-lg bg-white/[.06] px-4 py-3 text-sm text-white/85"
                  >
                    <Sparkles className="h-4 w-4 text-amber" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHead eyebrow={c.methodEyebrow} title={c.methodTitle} />
          <ScrollProgressSteps steps={c.steps} />
        </Container>
      </Section>

      <Section className="bg-bg-2">
        <Container className="grid items-center gap-10 lg:grid-cols-[320px_1fr]">
          <Reveal>
            <div className="relative aspect-square max-w-[320px] overflow-hidden rounded-2xl shadow-xl">
              <Image
                src={brand.founder.image}
                alt={brand.founder.name}
                fill
                sizes="(min-width: 1024px) 320px, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <div>
              <Eyebrow>{c.founderEyebrow}</Eyebrow>
              <h2 className="mt-4 max-w-[22ch] font-display text-[clamp(30px,4vw,44px)] font-bold leading-tight text-primary">
                {c.founderTitle}
              </h2>
              <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-text-2">
                {c.founderBody}
              </p>
              <p className="mt-5 font-semibold text-text">{brand.founder.name}</p>
              <p className="text-sm text-mute">
                {locale === "es" ? brand.founder.role : "Founder and automation & AI consultant"}
              </p>
              <ButtonLink
                href={locale === "es" ? "/nosotros" : "/en/about"}
                variant="outline"
                className="mt-6"
              >
                {locale === "es" ? "Conocer más" : "Learn more"}
              </ButtonLink>
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHead
            eyebrow={locale === "es" ? "Recursos" : "Resources"}
            title={c.resources}
            lede={c.resourcesBody}
          />
          <StaggerGroup className="grid gap-4 md:grid-cols-3">
            {posts.map((post, index) => (
              <StaggerItem key={post.slug} index={index}>
                <article className="interactive-card h-full rounded-xl border border-line p-6">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-deep">
                    {post.category}
                  </span>
                  <h2 className="mt-3 font-display text-xl font-bold">{post.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-text-2">{post.excerpt}</p>
                  <Link
                    href={`${base}/recursos/${post.slug}`}
                    className="interactive-link mt-5 inline-flex items-center gap-2 text-sm font-semibold text-tech"
                  >
                    {c.read}
                    <ArrowRight className="motion-arrow h-4 w-4" />
                  </Link>
                </article>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </Section>

      <Section className="signature-cta bg-gradient-to-br from-primary to-primary-2 py-24 text-white">
        <Container className="max-w-[820px] text-center">
          <Reveal variant="mask">
            <h2 className="font-display text-[clamp(32px,4vw,50px)] font-bold">{c.finalTitle}</h2>
            <p className="mx-auto mt-4 max-w-[55ch] text-lg text-white/75">{c.finalBody}</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink
                href={`${base}/${locale === "es" ? "evaluacion/ahora" : "assessment/now"}`}
                size="lg"
              >
                {c.now}
              </ButtonLink>
              <ScheduleModalTrigger source="signature-cta" size="lg" variant="on-dark-outline">
                <Clock3 className="h-4 w-4" />
                {c.schedule}
              </ScheduleModalTrigger>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
