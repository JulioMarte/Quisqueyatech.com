import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  Clock3,
  Gauge,
  LineChart,
  MessageSquareText,
  Phone,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";
import { DawnSweep, KineticText } from "@/components/ui/hero-motion";
import { Reveal } from "@/components/ui/motion";
import { brand } from "@/lib/brand";
import { routePath, type SiteLocale } from "@/lib/routes";

export type BusinessHeroVariant = "main" | "a" | "b" | "c" | "d";

type Metric = {
  label: string;
  value: string;
  helper: string;
  icon: typeof BarChart3;
};

type HeroCopy = {
  eyebrow: string;
  title: string;
  titleAccent?: string;
  body: string;
  primary: string;
  secondary: string;
  secondaryHref: string;
  proof: readonly string[];
  metrics: readonly Metric[];
};

const spanishCopy: Record<BusinessHeroVariant, HeroCopy> = {
  main: {
    eyebrow: "Soluciones digitales para empresas",
    title: "Haz que tu negocio capte mejor, responda más rápido y opere con más claridad.",
    body: "Diseñamos web, SEO, automatización, IA e integraciones alrededor de cómo tu empresa realmente consigue clientes, atiende solicitudes y mueve el trabajo al siguiente paso.",
    primary: "Hablar con QuisqueyaTech",
    secondary: "Cuéntanos tu caso",
    secondaryHref: "#contacto",
    proof: ["Web + SEO", "Automatización", "IA aplicada", "Software e integraciones"],
    metrics: [
      { label: "Visitas monitorizadas", value: "2,847", helper: "tráfico mensual", icon: LineChart },
      { label: "Nuevos leads", value: "+12", helper: "esta semana", icon: Users },
      { label: "Tiempo de respuesta", value: "2m 14s", helper: "promedio", icon: Clock3 },
      { label: "Seguimiento", value: "100%", helper: "con próximo paso", icon: Check },
    ],
  },
  a: {
    eyebrow: "Growth systems · Web + SEO + automation",
    title: "Web, SEO y sistemas diseñados para convertir atención en oportunidades.",
    body: "Una presencia digital útil no termina en tráfico. Conectamos descubrimiento, contacto, seguimiento y medición para que el negocio pueda ver qué está moviendo clientes hacia adelante.",
    primary: "Empezar una conversación",
    secondary: "Ver nuestro trabajo",
    secondaryHref: routePath("caseStudies", "es"),
    proof: ["Claridad comercial", "SEO", "Conversión", "Medición"],
    metrics: [
      { label: "Website traffic", value: "2,847", helper: "visitas monitorizadas", icon: TrendingUp },
      { label: "Search intent", value: "18", helper: "consultas relevantes", icon: Search },
      { label: "Nuevos leads", value: "+12", helper: "esta semana", icon: Users },
      { label: "Conversión", value: "4.8%", helper: "ejemplo de medición", icon: Gauge },
    ],
  },
  b: {
    eyebrow: "Business systems consultancy",
    title: "Detecta dónde la tecnología puede producir el mayor impacto en tu operación.",
    body: "Antes de recomendar una herramienta, reconstruimos cómo entra el trabajo, dónde pierde contexto y qué resultado justificaría cambiar el proceso. Después construimos solamente lo que hace falta.",
    primary: "Conversar sobre el negocio",
    secondary: "Cómo trabajamos",
    secondaryHref: routePath("method", "es"),
    proof: ["Discovery", "Prioridad", "Implementación", "Evidencia"],
    metrics: [
      { label: "Flujo visible", value: "4", helper: "etapas instrumentadas", icon: Workflow },
      { label: "Con responsable", value: "92%", helper: "solicitudes asignadas", icon: Users },
      { label: "Speed to lead", value: "2m 14s", helper: "tiempo de respuesta", icon: Clock3 },
      { label: "Próximo paso", value: "100%", helper: "estado identificable", icon: Check },
    ],
  },
  c: {
    eyebrow: "QuisqueyaTech system view",
    title: "Tu negocio no necesita más software.",
    titleAccent: "Necesita un sistema que trabaje mejor.",
    body: "Mapeamos la fricción, conectamos la intervención correcta y dejamos trazabilidad para que captar, responder, operar y medir formen parte del mismo recorrido.",
    primary: "Hablar con nosotros",
    secondary: "Ver soluciones",
    secondaryHref: routePath("solutions", "es"),
    proof: ["Discover", "Respond", "Operate", "Measure"],
    metrics: [
      { label: "Requests", value: "126", helper: "procesadas esta semana", icon: MessageSquareText },
      { label: "Calls routed", value: "92%", helper: "con destino definido", icon: Phone },
      { label: "Response", value: "2m 14s", helper: "promedio", icon: Clock3 },
      { label: "Workflow events", value: "18", helper: "señales instrumentadas", icon: Workflow },
    ],
  },
  d: {
    eyebrow: "Para negocios que viven de atender clientes",
    title: "Haz más fácil que te encuentren, te contacten y den el siguiente paso.",
    body: "Ayudamos a clínicas, servicios profesionales y negocios locales a conectar web, llamadas, mensajes, seguimiento y operación para perder menos oportunidades entre un contacto y el próximo paso.",
    primary: "Llamar ahora",
    secondary: "Cuéntanos tu negocio",
    secondaryHref: "#contacto",
    proof: ["Te encuentran", "Te contactan", "Avanzan", "Lo puedes medir"],
    metrics: [
      { label: "Llamadas web", value: "31", helper: "acciones monitorizadas", icon: Phone },
      { label: "WhatsApp", value: "22", helper: "conversaciones", icon: MessageSquareText },
      { label: "Próximos pasos", value: "14", helper: "oportunidades avanzadas", icon: TrendingUp },
      { label: "Respuesta", value: "2m", helper: "ejemplo de promedio", icon: Clock3 },
    ],
  },
};

const mainEnglish: HeroCopy = {
  eyebrow: "Digital solutions for businesses",
  title: "Help your business capture better, respond faster, and operate with more clarity.",
  body: "We design web, SEO, automation, AI, and integrations around how your company actually wins customers, handles requests, and moves work to the next step.",
  primary: "Talk to QuisqueyaTech",
  secondary: "Tell us about your business",
  secondaryHref: "#contact",
  proof: ["Web + SEO", "Automation", "Applied AI", "Software & integrations"],
  metrics: [
    { label: "Tracked visits", value: "2,847", helper: "monthly traffic", icon: LineChart },
    { label: "New leads", value: "+12", helper: "this week", icon: Users },
    { label: "Response time", value: "2m 14s", helper: "average", icon: Clock3 },
    { label: "Follow-up", value: "100%", helper: "with a next step", icon: Check },
  ],
};

export function BusinessImpactHero({
  variant,
  locale = "es",
}: {
  variant: BusinessHeroVariant;
  locale?: SiteLocale;
}) {
  const copy = variant === "main" && locale === "en" ? mainEnglish : spanishCopy[variant];

  if (variant === "a") return <GrowthHero copy={copy} />;
  if (variant === "b") return <ConsultancyHero copy={copy} />;
  if (variant === "c") return <MotionHero copy={copy} />;
  if (variant === "d") return <LocalHero copy={copy} />;
  return <MainHero copy={copy} />;
}

function MainHero({ copy }: { copy: HeroCopy }) {
  return (
    <section className="hero-orchestration relative overflow-hidden border-b border-line py-16 sm:py-20 lg:py-24">
      <DawnSweep />
      <div className="relative mx-auto grid max-w-[1180px] items-center gap-12 px-5 lg:grid-cols-[.96fr_1.04fr]">
        <Reveal variant="mask">
          <div>
            <HeroEyebrow>{copy.eyebrow}</HeroEyebrow>
            <h1 className="mt-6 max-w-[13ch] font-display text-[clamp(44px,6vw,76px)] font-extrabold leading-[.99] tracking-[-.055em] text-primary">
              {copy.title}
            </h1>
            <p className="mt-6 max-w-[61ch] text-[clamp(17px,1.5vw,20px)] leading-relaxed text-text-2">
              {copy.body}
            </p>
            <HeroActions copy={copy} />
            <ProofRow items={copy.proof} />
          </div>
        </Reveal>
        <Reveal delay={0.08} variant="scale">
          <MetricsBoard metrics={copy.metrics} label="Panel ilustrativo de negocio" />
        </Reveal>
      </div>
    </section>
  );
}

function GrowthHero({ copy }: { copy: HeroCopy }) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-[radial-gradient(circle_at_72%_28%,rgba(186,230,253,.72),transparent_31%),radial-gradient(circle_at_18%_68%,rgba(255,237,213,.65),transparent_29%),linear-gradient(180deg,#f8fbff,#ffffff)] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 lg:grid-cols-[.92fr_1.08fr]">
        <Reveal variant="mask">
          <div>
            <HeroEyebrow>{copy.eyebrow}</HeroEyebrow>
            <h1 className="mt-6 max-w-[15ch] font-display text-[clamp(44px,5.7vw,72px)] font-extrabold leading-[1] tracking-[-.05em] text-primary">
              {copy.title}
            </h1>
            <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-text-2">{copy.body}</p>
            <HeroActions copy={copy} />
            <ProofRow items={copy.proof} />
          </div>
        </Reveal>
        <Reveal delay={0.08} variant="scale">
          <div className="relative mx-auto w-full max-w-[590px] py-8 sm:py-12">
            <div className="absolute -left-2 top-0 z-20 rounded-2xl border border-white/90 bg-white/90 px-4 py-3 shadow-xl backdrop-blur sm:-left-7">
              <p className="text-[10px] font-bold uppercase tracking-[.15em] text-text-2">New leads</p>
              <p className="mt-1 font-display text-2xl font-bold text-primary">+12</p>
            </div>
            <div className="absolute -right-1 bottom-1 z-20 rounded-2xl border border-white/90 bg-white/90 px-4 py-3 shadow-xl backdrop-blur sm:-right-7">
              <p className="text-[10px] font-bold uppercase tracking-[.15em] text-text-2">Search intent</p>
              <p className="mt-1 font-display text-2xl font-bold text-primary">18</p>
            </div>
            <MetricsBoard metrics={copy.metrics} label="Growth dashboard · datos ilustrativos" compact />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ConsultancyHero({ copy }: { copy: HeroCopy }) {
  return (
    <section className="relative overflow-hidden bg-[#071d2d] py-16 text-white sm:py-20 lg:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_20%,rgba(56,189,248,.14),transparent_28%),radial-gradient(circle_at_12%_76%,rgba(249,115,22,.09),transparent_24%)]" />
      <div className="relative mx-auto grid max-w-[1220px] items-center gap-14 px-5 lg:grid-cols-[1.02fr_.98fr]">
        <Reveal variant="mask">
          <div>
            <HeroEyebrow dark>{copy.eyebrow}</HeroEyebrow>
            <h1 className="mt-6 max-w-[13ch] font-display text-[clamp(46px,6.2vw,80px)] font-extrabold leading-[.96] tracking-[-.06em]">
              {copy.title}
            </h1>
            <p className="mt-7 max-w-[60ch] text-lg leading-relaxed text-white/65">{copy.body}</p>
            <HeroActions copy={copy} dark />
            <ProofRow items={copy.proof} dark />
          </div>
        </Reveal>
        <Reveal delay={0.08} variant="scale">
          <div className="rounded-[2rem] border border-white/10 bg-white/[.055] p-4 shadow-2xl backdrop-blur-xl sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/35">Operational snapshot</p>
                <p className="mt-1 font-display text-lg font-bold">Friction → next step → evidence</p>
              </div>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">VISIBLE</span>
            </div>
            <MetricGrid metrics={copy.metrics} dark />
            <IllustrativeNote dark />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function MotionHero({ copy }: { copy: HeroCopy }) {
  return (
    <section className="hero-orchestration relative overflow-hidden border-b border-line py-14 sm:py-20 lg:py-24">
      <DawnSweep />
      <div className="relative mx-auto grid max-w-[1180px] items-center gap-10 px-5 lg:grid-cols-[1fr_1fr]">
        <div>
          <div className="hero-support [--hero-delay:.02s]">
            <HeroEyebrow>{copy.eyebrow}</HeroEyebrow>
          </div>
          <KineticText
            titleA={copy.title}
            titleB={copy.titleAccent || ""}
            className="mt-6 max-w-[15ch] font-display text-[clamp(43px,5.8vw,72px)] font-extrabold leading-[1] tracking-[-.055em] text-primary"
          />
          <p className="hero-support mt-6 max-w-[60ch] text-lg leading-relaxed text-text-2 [--hero-delay:.62s]">
            {copy.body}
          </p>
          <div className="hero-support [--hero-delay:.72s]">
            <HeroActions copy={copy} />
            <ProofRow items={copy.proof} />
          </div>
        </div>
        <div className="hero-support relative [--hero-delay:.52s]">
          <div className="absolute -left-5 top-8 hidden h-20 w-20 rounded-full border border-larimar-deep/20 bg-larimar-soft/60 blur-[1px] sm:block motion-safe:animate-pulse" />
          <div className="absolute -right-6 bottom-12 hidden h-16 w-16 rounded-full border border-orange-200 bg-orange-100/70 sm:block motion-safe:animate-pulse" />
          <MetricsBoard metrics={copy.metrics} label="Live system view · datos ilustrativos" />
        </div>
      </div>
    </section>
  );
}

function LocalHero({ copy }: { copy: HeroCopy }) {
  return (
    <section className="relative overflow-hidden border-b border-orange-100 bg-[radial-gradient(circle_at_82%_18%,rgba(255,237,213,.92),transparent_33%),linear-gradient(180deg,#fffaf5,#ffffff)] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 lg:grid-cols-[1fr_1fr]">
        <Reveal variant="mask">
          <div>
            <HeroEyebrow>{copy.eyebrow}</HeroEyebrow>
            <h1 className="mt-6 max-w-[14ch] font-display text-[clamp(44px,5.8vw,74px)] font-extrabold leading-[.99] tracking-[-.05em] text-primary">
              {copy.title}
            </h1>
            <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-text-2">{copy.body}</p>
            <HeroActions copy={copy} />
            <ProofRow items={copy.proof} />
          </div>
        </Reveal>
        <Reveal delay={0.08} variant="scale">
          <div className="rounded-[2rem] border border-orange-100 bg-white p-4 shadow-[0_35px_90px_-48px_rgba(8,47,73,.45)] sm:p-6">
            <div className="mb-5 flex items-center gap-3 rounded-2xl bg-primary p-4 text-white">
              <Phone className="h-10 w-10 rounded-xl bg-white/10 p-2.5 text-larimar" />
              <div>
                <p className="text-xs text-white/50">Desde el primer contacto</p>
                <p className="font-display text-lg font-bold">Encontrar → contactar → avanzar → medir</p>
              </div>
            </div>
            <MetricGrid metrics={copy.metrics} />
            <IllustrativeNote />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function MetricsBoard({
  metrics,
  label,
  compact = false,
}: {
  metrics: readonly Metric[];
  label: string;
  compact?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-4 shadow-[0_32px_90px_-42px_rgba(8,47,73,.42)] backdrop-blur-xl sm:p-6">
      <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.17em] text-text-2">{label}</p>
          <p className="mt-1 font-display text-lg font-bold text-primary">Business signals</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> demo
        </span>
      </div>
      <div className={compact ? "mt-4 grid gap-3 sm:grid-cols-2" : "mt-5 grid gap-3 sm:grid-cols-2"}>
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className={`rounded-2xl border border-line bg-white ${compact ? "p-4" : "p-5"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-text-2">{metric.label}</p>
                  <p className={`${compact ? "mt-2 text-2xl" : "mt-3 text-3xl"} font-display font-bold tracking-tight text-primary`}>
                    {metric.value}
                  </p>
                </div>
                <Icon className={`h-9 w-9 rounded-xl p-2 ${index % 2 === 0 ? "bg-larimar-soft text-tech" : "bg-orange-100 text-amber-deep"}`} />
              </div>
              <p className="mt-2 text-xs text-mute">{metric.helper}</p>
              {index === 0 ? (
                <div className="mt-4 h-8 overflow-hidden">
                  <svg viewBox="0 0 160 32" className="h-full w-full" aria-hidden="true">
                    <path d="M0 27 C18 26 28 23 42 21 C62 18 71 18 90 13 C110 8 129 11 160 2" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-tech" />
                    <path d="M0 27 C18 26 28 23 42 21 C62 18 71 18 90 13 C110 8 129 11 160 2 L160 32 L0 32 Z" className="fill-sky-100/70" />
                  </svg>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <IllustrativeNote />
    </div>
  );
}

function MetricGrid({ metrics, dark = false }: { metrics: readonly Metric[]; dark?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.label}
            className={dark ? "rounded-2xl border border-white/10 bg-[#0b3048] p-5" : "rounded-2xl border border-line bg-bg-2/70 p-5"}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={dark ? "text-xs font-semibold text-white/50" : "text-xs font-semibold text-text-2"}>{metric.label}</p>
                <p className={`mt-2 font-display text-3xl font-bold ${dark ? "text-white" : "text-primary"}`}>{metric.value}</p>
              </div>
              <Icon className={`h-9 w-9 rounded-xl p-2 ${dark ? "bg-white/10 text-larimar" : index % 2 === 0 ? "bg-larimar-soft text-tech" : "bg-orange-100 text-amber-deep"}`} />
            </div>
            <p className={dark ? "mt-2 text-xs text-white/40" : "mt-2 text-xs text-mute"}>{metric.helper}</p>
          </div>
        );
      })}
    </div>
  );
}

function HeroEyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[.15em] ${dark ? "border-white/10 bg-white/[.05] text-larimar" : "border-larimar-deep/15 bg-white/75 text-tech shadow-sm backdrop-blur"}`}>
      <Sparkles className="h-4 w-4" /> {children}
    </div>
  );
}

function HeroActions({ copy, dark = false }: { copy: HeroCopy; dark?: boolean }) {
  const secondary = copy.secondaryHref.startsWith("#") ? (
    <a
      href={copy.secondaryHref}
      className={secondaryClass(dark)}
    >
      {copy.secondary} <ArrowRight className="h-4 w-4" />
    </a>
  ) : (
    <Link href={copy.secondaryHref} className={secondaryClass(dark)}>
      {copy.secondary} <ArrowRight className="h-4 w-4" />
    </Link>
  );

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      <a
        href={brand.publicPhoneHref}
        className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold shadow-sm transition hover:-translate-y-px ${dark ? "bg-amber text-white hover:bg-amber-deep" : "bg-primary text-white hover:bg-primary-2"}`}
      >
        <Phone className="h-4 w-4" /> {copy.primary}
      </a>
      {secondary}
    </div>
  );
}

function secondaryClass(dark: boolean) {
  return `inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-6 text-sm font-bold transition ${
    dark
      ? "border-white/20 bg-white/[.04] text-white hover:bg-white/10"
      : "border-line bg-white text-primary hover:border-larimar-deep/30 hover:bg-bg-2"
  }`;
}

function ProofRow({ items, dark = false }: { items: readonly string[]; dark?: boolean }) {
  return (
    <div className={`mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm ${dark ? "text-white/55" : "text-text-2"}`}>
      {items.map((item) => (
        <span key={item} className="inline-flex items-center gap-1.5">
          <Check className={`h-4 w-4 ${dark ? "text-larimar" : "text-success"}`} />
          {item}
        </span>
      ))}
    </div>
  );
}

function IllustrativeNote({ dark = false }: { dark?: boolean }) {
  return (
    <p className={`mt-4 text-[11px] leading-relaxed ${dark ? "text-white/35" : "text-mute"}`}>
      Datos ilustrativos para mostrar el tipo de señales que un sistema conectado puede instrumentar; no representan resultados atribuidos a clientes.
    </p>
  );
}
