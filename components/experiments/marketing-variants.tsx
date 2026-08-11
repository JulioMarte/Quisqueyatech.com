import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  CalendarCheck,
  Check,
  CircleCheck,
  Code2,
  Gauge,
  Globe2,
  Layers3,
  LineChart,
  MapPin,
  MessageCircle,
  MousePointerClick,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { DawnSweep, KineticText, SystemFlow } from "@/components/ui/hero-motion";
import { MotionCard, Reveal, ScrollProgressSteps, StaggerGroup, StaggerItem } from "@/components/ui/motion";
import { brand } from "@/lib/brand";
import { caseStudies } from "@/lib/case-studies";
import { caseStudyPath, routePath } from "@/lib/routes";

export type MarketingVariant = "a" | "b" | "c" | "d";

export const marketingVariantDefinitions: readonly {
  id: MarketingVariant;
  name: string;
  descriptor: string;
  inspiration: string;
}[] = [
  {
    id: "a",
    name: "Growth Agency",
    descriptor: "Comercial, visual y fácil de escanear.",
    inspiration: "iCreate-style conversion rhythm",
  },
  {
    id: "b",
    name: "Premium Systems Consultancy",
    descriptor: "Editorial, sobria y de alto valor percibido.",
    inspiration: "Boutique B2B consultancy",
  },
  {
    id: "c",
    name: "Tech + Motion",
    descriptor: "Más movimiento, interacción y energía tecnológica.",
    inspiration: "QuisqueyaTech main motion language",
  },
  {
    id: "d",
    name: "Local Business Growth",
    descriptor: "Directa para PyMEs, servicios locales y operaciones.",
    inspiration: "Local-business conversion systems",
  },
] as const;

const stock = {
  team: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1800&q=88",
  meeting:
    "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1800&q=88",
  workspace:
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1800&q=88",
  office: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1800&q=88",
  collaboration:
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1800&q=88",
} as const;

const services = [
  {
    icon: Globe2,
    title: "Web + SEO",
    body: "Sitios claros, rápidos y medibles que conectan búsquedas con próximos pasos reales.",
    href: routePath("webSeo", "es"),
  },
  {
    icon: Workflow,
    title: "Automatización",
    body: "Seguimiento, traspasos y trabajo repetitivo coordinados por reglas explícitas.",
    href: routePath("automation", "es"),
  },
  {
    icon: Bot,
    title: "IA aplicada",
    body: "Agentes de voz y texto conectados a herramientas controladas y handoff humano.",
    href: routePath("agents", "es"),
  },
  {
    icon: Code2,
    title: "Software e integraciones",
    body: "Interfaces y APIs específicas cuando una herramienta genérica no encaja con el proceso.",
    href: routePath("software", "es"),
  },
] as const;

const processSteps = [
  ["01", "Entender", "Vemos cómo entra el trabajo, quién responde y dónde aparece la fricción."],
  ["02", "Priorizar", "Elegimos el cuello de botella que justifica intervención ahora."],
  ["03", "Construir", "Implementamos la solución más pequeña capaz de cambiar el resultado."],
  ["04", "Medir", "Instrumentamos el flujo para aprender y decidir qué mejorar después."],
] as const;

function PreviewRail({ active }: { active: MarketingVariant }) {
  return (
    <div className="fixed bottom-4 left-1/2 z-[80] w-[min(94vw,760px)] -translate-x-1/2 rounded-2xl border border-white/20 bg-primary/95 p-2 shadow-2xl backdrop-blur-xl">
      <div className="grid grid-cols-4 gap-1">
        {marketingVariantDefinitions.map((variant) => (
          <Link
            key={variant.id}
            href={`/preview/${variant.id}`}
            className={`rounded-xl px-3 py-2 text-center text-xs font-semibold transition sm:text-sm ${
              active === variant.id
                ? "bg-white text-primary shadow-sm"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {variant.id.toUpperCase()} · <span className="hidden sm:inline">{variant.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`font-display text-lg font-extrabold tracking-tight ${light ? "text-white" : "text-primary"}`}>
      Quisqueya<span className="text-amber">Tech</span>
    </Link>
  );
}

function PhoneCta({ dark = false, label = "Llamar ahora" }: { dark?: boolean; label?: string }) {
  return (
    <a
      href={brand.publicPhoneHref}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition hover:-translate-y-px ${
        dark ? "bg-white text-primary hover:bg-white/90" : "bg-amber text-white hover:bg-amber-deep"
      }`}
    >
      <Phone className="h-4 w-4" /> {label}
    </a>
  );
}

function WorkStrip({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <div
      className={`border-y py-5 ${
        tone === "dark" ? "border-white/10 bg-white/[.04] text-white" : "border-line bg-white text-primary"
      }`}
    >
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-center gap-x-9 gap-y-3 px-5 text-center">
        <span className={`text-xs font-bold uppercase tracking-[.18em] ${tone === "dark" ? "text-white/45" : "text-text-2"}`}>
          Trabajo seleccionado
        </span>
        {caseStudies.map((study) => (
          <span key={study.key} className="font-display text-sm font-bold sm:text-base">
            {study.client}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProjectCards({ compact = false, dark = false }: { compact?: boolean; dark?: boolean }) {
  const visualStyles = [
    "from-sky-100 via-white to-orange-100",
    "from-orange-100 via-white to-rose-100",
    "from-slate-200 via-white to-sky-100",
  ];

  return (
    <div className={`grid gap-4 ${compact ? "lg:grid-cols-3" : "md:grid-cols-3"}`}>
      {caseStudies.map((study, index) => {
        const content = study.locale.es;
        return (
          <Reveal key={study.key} delay={index * 0.05} variant="scale">
            <Link
              href={caseStudyPath(study.key, "es")}
              className={`group block h-full overflow-hidden rounded-[1.4rem] border transition hover:-translate-y-1 ${
                dark
                  ? "border-white/10 bg-white/[.06] text-white hover:border-white/20"
                  : "border-line bg-white text-primary shadow-[0_24px_60px_-48px_rgba(8,47,73,.55)] hover:border-larimar-deep/30"
              }`}
            >
              <div className={`relative ${compact ? "h-36" : "h-44"} overflow-hidden bg-gradient-to-br ${visualStyles[index]}`}>
                <div className="absolute inset-5 rounded-xl border border-white/70 bg-white/55 shadow-xl backdrop-blur-sm transition duration-500 group-hover:-translate-y-1 group-hover:rotate-[.5deg]">
                  <div className="flex h-8 items-center gap-1.5 border-b border-slate-900/10 px-3">
                    <span className="h-2 w-2 rounded-full bg-rose-400" />
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  </div>
                  <div className="grid h-[calc(100%-2rem)] grid-cols-[.8fr_1.2fr] gap-2 p-3">
                    <div className="rounded-lg bg-primary/90 p-3">
                      <div className="h-2 w-10 rounded bg-white/40" />
                      <div className="mt-3 h-7 w-14 rounded bg-white/90" />
                      <div className="mt-2 h-2 w-16 rounded bg-white/30" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-7 rounded bg-white/90" />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-10 rounded bg-white/80" />
                        <div className="h-10 rounded bg-white/80" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={compact ? "p-5" : "p-6"}>
                <p className={`text-xs font-bold uppercase tracking-[.16em] ${dark ? "text-larimar" : "text-tech"}`}>
                  {content.category}
                </p>
                <h3 className="mt-2 font-display text-xl font-bold">{study.client}</h3>
                {!compact && <p className={`mt-2 text-sm leading-relaxed ${dark ? "text-white/65" : "text-text-2"}`}>{content.summary}</p>}
                <span className={`mt-4 inline-flex items-center gap-2 text-sm font-bold ${dark ? "text-white" : "text-amber-deep"}`}>
                  Ver caso <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </div>
            </Link>
          </Reveal>
        );
      })}
    </div>
  );
}

function FooterSimple({ dark = false }: { dark?: boolean }) {
  return (
    <footer className={`pb-28 pt-10 ${dark ? "bg-[#061b2b] text-white" : "bg-white text-primary"}`}>
      <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-5 sm:flex-row sm:items-center sm:justify-between">
        <BrandMark light={dark} />
        <div className={`text-sm ${dark ? "text-white/55" : "text-text-2"}`}>
          {brand.locationShort} · {brand.publicEmail} · {brand.publicPhoneDisplay}
        </div>
      </div>
    </footer>
  );
}

function AgencyNav({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`relative z-20 ${dark ? "text-white" : "text-primary"}`}>
      <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-5">
        <BrandMark light={dark} />
        <nav className={`hidden items-center gap-7 text-sm font-semibold md:flex ${dark ? "text-white/70" : "text-text-2"}`}>
          <a href="#servicios" className="hover:text-amber">Servicios</a>
          <a href="#casos" className="hover:text-amber">Casos</a>
          <a href="#proceso" className="hover:text-amber">Proceso</a>
          <a href="#contacto" className="hover:text-amber">Contacto</a>
        </nav>
        <PhoneCta dark={dark} label={brand.publicPhoneDisplay} />
      </div>
    </div>
  );
}

function VariantA() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#fbfdff] text-text">
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_70%_10%,rgba(56,189,248,.17),transparent_34%),radial-gradient(circle_at_15%_35%,rgba(249,115,22,.12),transparent_30%)]">
        <AgencyNav />
        <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 pb-16 pt-12 lg:grid-cols-[.95fr_1.05fr] lg:pb-24 lg:pt-16">
          <div>
            <Reveal variant="mask">
              <div className="inline-flex items-center gap-2 rounded-full border border-larimar-deep/15 bg-white/75 px-4 py-2 text-xs font-bold uppercase tracking-[.15em] text-tech shadow-sm backdrop-blur">
                <Sparkles className="h-4 w-4" /> Sistemas digitales para empresas
              </div>
              <h1 className="mt-6 max-w-[13ch] font-display text-[clamp(46px,6vw,78px)] font-extrabold leading-[.98] tracking-[-.055em] text-primary">
                Convierte fricción en un sistema que trabaja mejor.
              </h1>
              <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-text-2">
                Web, SEO, automatización, IA e integraciones diseñadas alrededor de cómo tu negocio realmente consigue, atiende y retiene clientes.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <PhoneCta label="Hablar con QuisqueyaTech" />
                <a href="#casos" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 text-sm font-bold text-primary transition hover:border-larimar-deep/30 hover:bg-sky-50">
                  Ver nuestro trabajo <ArrowRight className="h-4 w-4" />
                </a>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-2">
                {["Español + inglés", "RD + servicio internacional", "Atención directa"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-success" />{item}</span>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.08} variant="scale">
            <div className="relative mx-auto w-full max-w-[600px]">
              <div className="absolute -left-8 top-16 z-20 hidden rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl backdrop-blur md:block">
                <div className="flex items-center gap-3"><Search className="h-9 w-9 rounded-xl bg-sky-100 p-2 text-tech" /><div><p className="text-xs text-text-2">Descubrimiento</p><p className="font-display font-bold text-primary">SEO + contenido</p></div></div>
              </div>
              <div className="absolute -right-7 bottom-14 z-20 hidden rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl backdrop-blur md:block">
                <div className="flex items-center gap-3"><Workflow className="h-9 w-9 rounded-xl bg-orange-100 p-2 text-amber-deep" /><div><p className="text-xs text-text-2">Operación</p><p className="font-display font-bold text-primary">Automatización</p></div></div>
              </div>
              <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white p-3 shadow-[0_35px_90px_-40px_rgba(8,47,73,.5)]">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem]">
                  <Image src={stock.meeting} alt="Equipo colaborando en una reunión de trabajo" fill priority className="object-cover" sizes="(max-width: 1024px) 92vw, 550px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/45 via-transparent to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5 grid grid-cols-3 gap-2">
                    {["Claridad", "Conversión", "Medición"].map((item) => <div key={item} className="rounded-xl border border-white/20 bg-primary/70 px-3 py-3 text-center text-xs font-bold text-white backdrop-blur">{item}</div>)}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <WorkStrip />

      <section id="servicios" className="py-20 sm:py-24">
        <div className="mx-auto max-w-[1180px] px-5">
          <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
            <Reveal>
              <div className="lg:sticky lg:top-28 lg:self-start">
                <p className="text-xs font-bold uppercase tracking-[.18em] text-amber-deep">Qué hacemos</p>
                <h2 className="mt-4 max-w-[12ch] font-display text-[clamp(34px,4vw,54px)] font-bold leading-[1.05] text-primary">Una solución distinta para cada cuello de botella.</h2>
                <p className="mt-4 max-w-[42ch] leading-relaxed text-text-2">No vendemos una herramienta única. Elegimos la pieza que acerca el proceso a un resultado medible.</p>
              </div>
            </Reveal>
            <StaggerGroup className="grid gap-4 sm:grid-cols-2">
              {services.map(({ icon: Icon, title, body, href }, index) => (
                <StaggerItem key={title} index={index}>
                  <Link href={href} className="group block h-full rounded-2xl border border-line bg-white p-6 shadow-[0_18px_48px_-42px_rgba(8,47,73,.7)] transition hover:-translate-y-1 hover:border-larimar-deep/30 hover:shadow-[0_26px_60px_-42px_rgba(8,47,73,.7)]">
                    <div className="flex items-start justify-between"><Icon className="h-11 w-11 rounded-xl bg-primary p-2.5 text-white" /><ArrowUpRight className="h-5 w-5 text-text-2 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-amber-deep" /></div>
                    <h3 className="mt-8 font-display text-2xl font-bold text-primary">{title}</h3>
                    <p className="mt-3 leading-relaxed text-text-2">{body}</p>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </div>
      </section>

      <section id="casos" className="bg-primary py-20 text-white sm:py-24">
        <div className="mx-auto max-w-[1180px] px-5">
          <Reveal><div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-larimar">Trabajo seleccionado</p><h2 className="mt-3 max-w-[16ch] font-display text-[clamp(34px,4vw,54px)] font-bold leading-tight">Casos visibles, contexto real.</h2></div><p className="max-w-[48ch] text-white/65">Preferimos mostrar el problema, las decisiones y el trabajo entregado antes que inventar métricas que no podemos verificar.</p></div></Reveal>
          <ProjectCards dark />
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-[1180px] px-5">
          <div className="grid gap-4 lg:grid-cols-4">
            {[
              [MousePointerClick, "Captar mejor", "La presencia digital debe conducir hacia una acción clara."],
              [MessageCircle, "Responder mejor", "Menos oportunidades perdidas entre mensajes, llamadas y formularios."],
              [Workflow, "Operar mejor", "Menos pasos manuales y más continuidad entre responsables."],
              [BarChart3, "Medir mejor", "Instrumentación para saber qué está funcionando y qué no."],
            ].map(([Icon, title, body], index) => {
              const IconComponent = Icon as typeof MousePointerClick;
              return <Reveal key={title as string} delay={index * .04}><div className="h-full rounded-2xl bg-bg-2 p-6"><IconComponent className="h-9 w-9 text-tech"/><h3 className="mt-5 font-display text-xl font-bold text-primary">{title as string}</h3><p className="mt-2 text-sm leading-relaxed text-text-2">{body as string}</p></div></Reveal>;
            })}
          </div>
        </div>
      </section>

      <section id="proceso" className="bg-bg-2 py-20 sm:py-24">
        <div className="mx-auto max-w-[1180px] px-5">
          <Reveal><div className="mb-10 max-w-[700px]"><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-deep">Proceso</p><h2 className="mt-4 font-display text-[clamp(34px,4vw,52px)] font-bold leading-tight text-primary">Entender antes de construir.</h2><p className="mt-4 text-lg text-text-2">La tecnología llega después de comprender el flujo, el responsable y el resultado esperado.</p></div></Reveal>
          <ScrollProgressSteps steps={processSteps} />
        </div>
      </section>

      <section id="contacto" className="py-20 sm:py-24">
        <div className="mx-auto max-w-[1180px] px-5">
          <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(120deg,#082F49,#0A2138_65%,#123e5a)] p-8 text-white sm:p-12 lg:p-14">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <Reveal><div><p className="text-xs font-bold uppercase tracking-[.18em] text-larimar">Próximo paso</p><h2 className="mt-4 max-w-[15ch] font-display text-[clamp(34px,4vw,56px)] font-bold leading-tight">Cuéntanos dónde el negocio se está enredando.</h2><p className="mt-4 max-w-[58ch] text-white/70">No necesitas llegar con una solución definida. Empezamos entendiendo cómo funciona hoy.</p></div></Reveal>
              <div className="flex flex-col gap-3"><PhoneCta dark label={brand.publicPhoneDisplay}/><a href={`mailto:${brand.publicEmail}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 px-5 text-sm font-bold text-white hover:bg-white/10">{brand.publicEmail}</a></div>
            </div>
          </div>
        </div>
      </section>
      <FooterSimple />
      <PreviewRail active="a" />
    </div>
  );
}

function VariantB() {
  return (
    <div className="min-h-screen bg-[#f4f1eb] text-[#12202d]">
      <section className="relative overflow-hidden bg-[#071d2d] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(56,189,248,.13),transparent_28%),radial-gradient(circle_at_15%_70%,rgba(249,115,22,.09),transparent_26%)]" />
        <AgencyNav dark />
        <div className="relative mx-auto grid max-w-[1240px] items-end gap-14 px-5 pb-20 pt-10 lg:grid-cols-[1.06fr_.94fr] lg:pb-28 lg:pt-16">
          <Reveal variant="mask">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-larimar">Business systems consultancy</p>
              <h1 className="mt-6 max-w-[12ch] font-display text-[clamp(48px,7vw,88px)] font-extrabold leading-[.95] tracking-[-.06em]">Diseñamos cómo la tecnología encaja en tu operación.</h1>
              <p className="mt-7 max-w-[57ch] text-lg leading-relaxed text-white/65">QuisqueyaTech estudia cómo llega el trabajo, dónde se pierde contexto y qué intervención puede mejorar el resultado sin llenar tu empresa de software innecesario.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row"><PhoneCta dark label="Conversar sobre el negocio"/><Link href={routePath("method","es")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-5 text-sm font-bold text-white hover:bg-white/10">Nuestro enfoque <ArrowRight className="h-4 w-4"/></Link></div>
            </div>
          </Reveal>
          <Reveal delay={.08} variant="scale">
            <div className="relative ml-auto w-full max-w-[500px]">
              <div className="relative aspect-[4/5] overflow-hidden rounded-t-[12rem] rounded-b-[2rem] border border-white/10">
                <Image src={stock.workspace} alt="Espacio de trabajo moderno" fill priority className="object-cover" sizes="(max-width: 1024px) 92vw, 480px" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071d2d]/80 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/15 bg-[#071d2d]/75 p-5 backdrop-blur-md"><p className="text-xs uppercase tracking-[.16em] text-white/45">Principio</p><p className="mt-2 font-display text-xl font-bold">Custom experience. Shared infrastructure. Clear outcomes.</p></div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <WorkStrip />

      <section className="py-24 sm:py-28">
        <div className="mx-auto max-w-[1180px] px-5">
          <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr]">
            <Reveal><div><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-deep">Nuestro trabajo</p><h2 className="mt-4 max-w-[13ch] font-display text-[clamp(36px,5vw,62px)] font-bold leading-[1.02] text-primary">Primero definimos el problema que merece sistema.</h2></div></Reveal>
            <div className="grid gap-0 border-t border-primary/15">
              {[
                ["01", "Descubrir", "Reconstruimos el recorrido real: entrada, responsables, decisiones, datos y excepciones."],
                ["02", "Diseñar", "Elegimos la intervención más pequeña que reduce fricción sin crear una plataforma innecesaria."],
                ["03", "Operar", "Conectamos la solución al trabajo diario y dejamos medición suficiente para aprender."],
              ].map(([number,title,body], index)=><Reveal key={number} delay={index*.05}><div className="grid gap-4 border-b border-primary/15 py-7 sm:grid-cols-[80px_180px_1fr]"><span className="font-mono text-sm text-text-2">{number}</span><h3 className="font-display text-2xl font-bold text-primary">{title}</h3><p className="max-w-[55ch] leading-relaxed text-text-2">{body}</p></div></Reveal>)}
            </div>
          </div>
        </div>
      </section>

      <section id="servicios" className="border-y border-primary/10 bg-[#ece8df] py-24 sm:py-28">
        <div className="mx-auto max-w-[1180px] px-5">
          <Reveal><div className="mb-12 grid gap-6 lg:grid-cols-2"><h2 className="max-w-[13ch] font-display text-[clamp(36px,5vw,62px)] font-bold leading-[1.03] text-primary">Capacidades que se combinan según el problema.</h2><p className="max-w-[58ch] self-end text-lg leading-relaxed text-text-2">Web, SEO, automatización, IA y software no son productos aislados: son capacidades que usamos cuando el flujo lo exige.</p></div></Reveal>
          <div className="grid gap-px overflow-hidden rounded-[1.5rem] border border-primary/10 bg-primary/10 md:grid-cols-2">
            {services.map(({icon:Icon,title,body,href},index)=><Reveal key={title} delay={index*.04}><Link href={href} className="group block h-full bg-[#f4f1eb] p-8 transition hover:bg-white"><div className="flex items-start justify-between"><span className="font-mono text-xs text-text-2">0{index+1}</span><Icon className="h-8 w-8 text-tech"/></div><h3 className="mt-14 font-display text-2xl font-bold text-primary">{title}</h3><p className="mt-3 max-w-[40ch] leading-relaxed text-text-2">{body}</p><span className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-primary">Explorar <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1"/></span></Link></Reveal>)}
          </div>
        </div>
      </section>

      <section id="casos" className="py-24 sm:py-28">
        <div className="mx-auto max-w-[1180px] px-5">
          <Reveal><div className="mb-12"><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-deep">Case studies</p><h2 className="mt-4 max-w-[14ch] font-display text-[clamp(36px,5vw,62px)] font-bold leading-[1.03] text-primary">El trabajo debe explicar el criterio detrás de la solución.</h2></div></Reveal>
          <div className="space-y-5">
            {caseStudies.map((study,index)=>{
              const content=study.locale.es;
              return <Reveal key={study.key} delay={index*.04}><Link href={caseStudyPath(study.key,"es")} className="group grid gap-7 rounded-[1.5rem] border border-primary/10 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-xl md:grid-cols-[.85fr_1.15fr] md:p-8"><div className={`relative min-h-52 overflow-hidden rounded-2xl ${index===0?"bg-sky-100":index===1?"bg-orange-100":"bg-slate-200"}`}><div className="absolute inset-5 rounded-xl border border-primary/10 bg-white/75 p-5 shadow-lg"><p className="text-xs font-bold uppercase tracking-[.15em] text-tech">{content.category}</p><div className="mt-5 h-20 rounded-xl bg-primary"/><div className="mt-3 grid grid-cols-3 gap-2"><div className="h-8 rounded-lg bg-slate-100"/><div className="h-8 rounded-lg bg-slate-100"/><div className="h-8 rounded-lg bg-slate-100"/></div></div></div><div className="self-center"><p className="text-xs font-bold uppercase tracking-[.16em] text-text-2">{study.client}</p><h3 className="mt-3 max-w-[21ch] font-display text-3xl font-bold leading-tight text-primary">{content.title}</h3><p className="mt-4 max-w-[58ch] leading-relaxed text-text-2">{content.summary}</p><span className="mt-6 inline-flex items-center gap-2 font-bold text-amber-deep">Leer caso <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/></span></div></Link></Reveal>;
            })}
          </div>
        </div>
      </section>

      <section id="proceso" className="bg-white py-24 sm:py-28">
        <div className="mx-auto max-w-[1180px] px-5"><Reveal><div className="mb-12"><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-deep">Método</p><h2 className="mt-4 font-display text-[clamp(36px,5vw,60px)] font-bold text-primary">Entender → priorizar → construir → medir.</h2></div></Reveal><ScrollProgressSteps steps={processSteps}/></div>
      </section>

      <section id="contacto" className="bg-[#071d2d] py-24 text-white sm:py-28">
        <div className="mx-auto grid max-w-[1180px] gap-12 px-5 lg:grid-cols-[1fr_.7fr] lg:items-end"><Reveal><div><p className="text-xs font-bold uppercase tracking-[.2em] text-larimar">Contacto directo</p><h2 className="mt-5 max-w-[13ch] font-display text-[clamp(40px,6vw,72px)] font-bold leading-[1]">Explícanos cómo funciona hoy.</h2><p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-white/60">Si podemos entender el recorrido, podemos decidir si hace falta una mejor web, una automatización, un agente o algo completamente distinto.</p></div></Reveal><div className="space-y-3"><PhoneCta dark label={brand.publicPhoneDisplay}/><a href={`mailto:${brand.publicEmail}`} className="flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-5 text-sm font-bold hover:bg-white/10">{brand.publicEmail}</a></div></div>
      </section>
      <FooterSimple dark />
      <PreviewRail active="b" />
    </div>
  );
}

function VariantC() {
  return (
    <div className="min-h-screen overflow-hidden bg-white text-text">
      <section className="hero-orchestration relative overflow-hidden pb-14">
        <DawnSweep />
        <AgencyNav />
        <div className="relative mx-auto max-w-[1120px] px-5 pb-8 pt-14 text-center sm:pt-20">
          <div className="hero-support [--hero-delay:.02s]"><div className="inline-flex items-center gap-2 rounded-full border border-larimar-deep/15 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-tech backdrop-blur"><Zap className="h-4 w-4"/>Web · automation · AI · software</div></div>
          <KineticText titleA="Tu negocio no necesita más software." titleB="Necesita menos fricción." className="mx-auto mt-5 max-w-[18ch] font-display text-[clamp(42px,6vw,72px)] font-extrabold leading-[1.02] tracking-[-.05em] text-primary" />
          <p className="hero-support mx-auto mt-6 max-w-[64ch] text-[clamp(17px,1.6vw,20px)] leading-relaxed text-text-2 [--hero-delay:.62s]">Mapeamos el flujo, construimos la intervención correcta y conectamos cada pieza para que el negocio pueda captar, responder, operar y medir mejor.</p>
          <div className="hero-support mt-8 flex flex-col justify-center gap-3 sm:flex-row [--hero-delay:.72s]"><PhoneCta label="Hablar con nosotros"/><a href="#sistema" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 text-sm font-bold text-primary hover:border-larimar-deep/30">Ver el sistema <ArrowRight className="h-4 w-4"/></a></div>
          <SystemFlow labels={["Descubrir","Responder","Operar"]} output="Medir + mejorar" />
        </div>
      </section>

      <div className="overflow-hidden border-y border-line bg-primary py-3 text-white">
        <div className="flex min-w-max motion-safe:animate-[marquee_24s_linear_infinite] items-center gap-8 px-4 text-xs font-bold uppercase tracking-[.18em] text-white/70">
          {["SEO", "Lead capture", "Voice AI", "WhatsApp", "Booking", "Automation", "Analytics", "Custom software", "SEO", "Lead capture", "Voice AI", "WhatsApp"].map((item,index)=><span key={`${item}-${index}`} className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber"/>{item}</span>)}
        </div>
      </div>

      <section id="servicios" className="bg-bg-2 py-20 sm:py-24">
        <div className="mx-auto max-w-[1180px] px-5">
          <Reveal><div className="mb-10 text-center"><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-deep">Capabilities</p><h2 className="mx-auto mt-4 max-w-[16ch] font-display text-[clamp(36px,5vw,58px)] font-bold leading-tight text-primary">Módulos visuales. Una sola lógica de negocio.</h2></div></Reveal>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {services.map(({icon:Icon,title,body,href},index)=><MotionCard key={title} index={index}><Link href={href} className="interactive-card group block h-full rounded-2xl border border-line bg-white p-6"><div className="flex items-start justify-between"><Icon className="h-11 w-11 rounded-xl bg-primary p-2.5 text-white transition duration-300 group-hover:-translate-y-1 group-hover:rotate-3"/><span className="font-mono text-xs text-text-2">0{index+1}</span></div><h3 className="mt-8 font-display text-xl font-bold text-primary">{title}</h3><p className="mt-3 text-sm leading-relaxed text-text-2">{body}</p><span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-amber-deep">Explorar <ArrowRight className="motion-arrow h-4 w-4"/></span></Link></MotionCard>)}
          </div>
        </div>
      </section>

      <section id="sistema" className="relative overflow-hidden bg-primary py-20 text-white sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(56,189,248,.14),transparent_28%),radial-gradient(circle_at_85%_70%,rgba(249,115,22,.12),transparent_28%)]"/>
        <div className="relative mx-auto grid max-w-[1180px] gap-12 px-5 lg:grid-cols-[.78fr_1.22fr] lg:items-center">
          <Reveal><div><p className="text-xs font-bold uppercase tracking-[.18em] text-larimar">System thinking</p><h2 className="mt-4 max-w-[12ch] font-display text-[clamp(38px,5vw,62px)] font-bold leading-[1.02]">La experiencia se siente custom. La lógica se conecta.</h2><p className="mt-5 max-w-[48ch] text-lg leading-relaxed text-white/65">No queremos cinco herramientas aisladas. Queremos un recorrido donde cada acción deja contexto para la siguiente.</p></div></Reveal>
          <Reveal delay={.08} variant="scale"><div className="rounded-[2rem] border border-white/12 bg-white/[.06] p-5 shadow-2xl backdrop-blur"><div className="flex items-center justify-between border-b border-white/10 pb-4"><div><p className="text-xs uppercase tracking-[.15em] text-white/40">Quisqueya system map</p><p className="mt-1 font-display font-bold">Customer journey orchestration</p></div><span className="flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-300 motion-safe:animate-pulse"/>Operational</span></div><div className="grid gap-3 py-5 sm:grid-cols-2">{[[Search,"Discover","Search / social / referral"],[MessageCircle,"Contact","Phone / form / chat"],[CalendarCheck,"Commit","Booking / quote / next step"],[LineChart,"Measure","Attribution / follow-up"]].map(([Icon,title,body],index)=>{const IconComponent=Icon as typeof Search;return <div key={title as string} className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b3550] p-5"><div className="absolute right-3 top-3 font-mono text-[10px] text-white/20">0{index+1}</div><IconComponent className="h-8 w-8 text-larimar"/><h3 className="mt-5 font-display text-lg font-bold">{title as string}</h3><p className="mt-1 text-xs text-white/50">{body as string}</p></div>})}</div><div className="rounded-2xl border border-amber/20 bg-amber/10 p-4 text-center text-sm font-bold text-orange-100">Every important transition emits evidence → event → report</div></div></Reveal>
        </div>
      </section>

      <section id="casos" className="py-20 sm:py-24">
        <div className="mx-auto max-w-[1180px] px-5"><Reveal><div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-deep">Selected work</p><h2 className="mt-4 max-w-[15ch] font-display text-[clamp(36px,5vw,58px)] font-bold leading-tight text-primary">Producto visual + lógica detrás.</h2></div><p className="max-w-[45ch] text-text-2">Cada caso puede mostrar la interfaz, pero también el proceso y las decisiones que la hicieron útil.</p></div></Reveal><ProjectCards/></div>
      </section>

      <section id="proceso" className="bg-bg-2 py-20 sm:py-24"><div className="mx-auto max-w-[1180px] px-5"><Reveal><div className="mb-10"><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-deep">Workflow</p><h2 className="mt-4 font-display text-[clamp(36px,5vw,58px)] font-bold text-primary">Entender. Priorizar. Construir. Medir.</h2></div></Reveal><ScrollProgressSteps steps={processSteps}/></div></section>

      <section id="contacto" className="relative overflow-hidden bg-white py-20 sm:py-24"><DawnSweep/><div className="relative mx-auto max-w-[980px] px-5 text-center"><Reveal variant="mask"><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-deep">Start with the problem</p><h2 className="mx-auto mt-4 max-w-[15ch] font-display text-[clamp(40px,6vw,68px)] font-bold leading-[1.02] text-primary">Muéstranos dónde se rompe el flujo.</h2><p className="mx-auto mt-5 max-w-[56ch] text-lg text-text-2">Nosotros nos encargamos de decidir si la respuesta es web, automatización, IA, integración o ninguna de las anteriores.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><PhoneCta label={brand.publicPhoneDisplay}/><a href={`mailto:${brand.publicEmail}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-white px-5 text-sm font-bold text-primary">{brand.publicEmail}</a></div></Reveal></div></section>
      <FooterSimple />
      <PreviewRail active="c" />
    </div>
  );
}

function VariantD() {
  const journey = [
    [Search, "Te encuentran", "Web + SEO + presencia local"],
    [MessageCircle, "Te contactan", "Llamadas, formularios y mensajes"],
    [CalendarCheck, "Avanzan", "Reserva, cotización o próximo paso"],
    [BarChart3, "Lo sabes", "Seguimiento y medición"],
  ] as const;

  return (
    <div className="min-h-screen bg-white text-text">
      <section className="relative overflow-hidden bg-[#fffaf5]">
        <AgencyNav />
        <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 pb-16 pt-10 lg:grid-cols-[1fr_1fr] lg:pb-20 lg:pt-14">
          <Reveal variant="mask"><div><div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-xs font-bold uppercase tracking-[.15em] text-amber-deep"><MapPin className="h-4 w-4"/>Para empresas que viven de atender clientes</div><h1 className="mt-6 max-w-[13ch] font-display text-[clamp(44px,6vw,76px)] font-extrabold leading-[.99] tracking-[-.05em] text-primary">Más clientes atendidos. Menos cosas cayéndose entre grietas.</h1><p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-text-2">Ayudamos a negocios de servicios a mejorar cómo los encuentran, cómo responden, cómo convierten una conversación en próximo paso y cómo dan seguimiento.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><PhoneCta label={`Llamar · ${brand.publicPhoneDisplay}`}/><a href="#como-ayudamos" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 text-sm font-bold text-primary">Ver cómo ayudamos <ArrowRight className="h-4 w-4"/></a></div></div></Reveal>
          <Reveal delay={.08} variant="scale"><div className="relative mx-auto grid w-full max-w-[560px] grid-cols-2 gap-3"><div className="relative col-span-2 aspect-[16/9] overflow-hidden rounded-[1.8rem]"><Image src={stock.team} alt="Equipo de pequeña empresa colaborando" fill priority className="object-cover" sizes="(max-width: 1024px) 92vw, 550px"/><div className="absolute inset-0 bg-gradient-to-t from-primary/45 to-transparent"/><div className="absolute bottom-4 left-4 rounded-xl bg-white/90 px-4 py-3 shadow-lg backdrop-blur"><p className="text-xs text-text-2">Sistema comercial</p><p className="font-display font-bold text-primary">Desde el primer contacto</p></div></div><div className="relative aspect-square overflow-hidden rounded-[1.5rem]"><Image src={stock.office} alt="Oficina de empresa de servicios" fill className="object-cover" sizes="260px"/></div><div className="relative aspect-square overflow-hidden rounded-[1.5rem] bg-primary p-5 text-white"><Users className="h-9 w-9 text-larimar"/><p className="mt-8 font-display text-2xl font-bold">Humano donde importa.</p><p className="mt-2 text-sm text-white/60">Automatizado donde ayuda.</p></div></div></Reveal>
        </div>
      </section>

      <WorkStrip />

      <section id="como-ayudamos" className="py-20 sm:py-24">
        <div className="mx-auto max-w-[1180px] px-5"><Reveal><div className="mb-10 text-center"><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-deep">El recorrido importa</p><h2 className="mx-auto mt-4 max-w-[18ch] font-display text-[clamp(36px,5vw,56px)] font-bold leading-tight text-primary">No basta con conseguir un lead. Hay que moverlo al siguiente paso.</h2></div></Reveal><StaggerGroup className="grid gap-4 md:grid-cols-4">{journey.map(([Icon,title,body],index)=><StaggerItem key={title} index={index}><div className="relative h-full rounded-2xl border border-line bg-white p-6 shadow-[0_20px_50px_-45px_rgba(8,47,73,.7)]"><span className="absolute right-4 top-4 font-mono text-xs text-slate-300">0{index+1}</span><Icon className="h-10 w-10 rounded-xl bg-orange-100 p-2.5 text-amber-deep"/><h3 className="mt-6 font-display text-xl font-bold text-primary">{title}</h3><p className="mt-2 text-sm leading-relaxed text-text-2">{body}</p>{index<journey.length-1&&<ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 rounded-full bg-primary p-1 text-white md:block"/>}</div></StaggerItem>)}</StaggerGroup></div>
      </section>

      <section className="bg-bg-2 py-20 sm:py-24">
        <div className="mx-auto max-w-[1180px] px-5"><Reveal><div className="mb-10 grid gap-6 lg:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-deep">Casos de uso</p><h2 className="mt-4 max-w-[15ch] font-display text-[clamp(36px,5vw,56px)] font-bold leading-tight text-primary">Útil donde respuesta y seguimiento mueven ingresos.</h2></div><p className="max-w-[52ch] self-end text-lg text-text-2">La arquitectura cambia por negocio, pero el patrón se repite: capturar intención, responder a tiempo, coordinar el próximo paso y medirlo.</p></div></Reveal><div className="grid gap-4 lg:grid-cols-3">{[
          [stock.meeting,"Clínicas y prácticas","Recepción, preguntas frecuentes, solicitudes, citas y seguimiento."],
          [stock.workspace,"Servicios profesionales","Consultas, formularios, clasificación y seguimiento comercial."],
          [stock.collaboration,"Servicios locales","Llamadas, leads fuera de horario, visitas y coordinación de próximos pasos."],
        ].map(([image,title,body],index)=><Reveal key={title} delay={index*.04} variant="scale"><div className="group overflow-hidden rounded-[1.5rem] border border-line bg-white"><div className="relative h-52 overflow-hidden"><Image src={image} alt={`Contexto visual para ${title}`} fill className="object-cover transition duration-700 group-hover:scale-[1.04]" sizes="(max-width: 1024px) 92vw, 380px"/><div className="absolute inset-0 bg-gradient-to-t from-primary/55 to-transparent"/></div><div className="p-6"><h3 className="font-display text-2xl font-bold text-primary">{title}</h3><p className="mt-2 leading-relaxed text-text-2">{body}</p></div></div></Reveal>)}</div></div>
      </section>

      <section id="servicios" className="py-20 sm:py-24"><div className="mx-auto max-w-[1180px] px-5"><Reveal><div className="mb-10"><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-deep">Qué podemos construir</p><h2 className="mt-4 max-w-[16ch] font-display text-[clamp(36px,5vw,56px)] font-bold leading-tight text-primary">La capa que falta entre marketing y operación.</h2></div></Reveal><div className="grid gap-4 sm:grid-cols-2">{services.map(({icon:Icon,title,body,href},index)=><Reveal key={title} delay={index*.04}><Link href={href} className="group flex h-full gap-5 rounded-2xl border border-line bg-white p-6 transition hover:-translate-y-1 hover:border-amber/30 hover:shadow-lg"><Icon className="h-11 w-11 shrink-0 rounded-xl bg-primary p-2.5 text-white"/><div><h3 className="font-display text-xl font-bold text-primary">{title}</h3><p className="mt-2 text-sm leading-relaxed text-text-2">{body}</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-amber-deep">Explorar <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1"/></span></div></Link></Reveal>)}</div></div></section>

      <section id="casos" className="bg-primary py-20 text-white sm:py-24"><div className="mx-auto max-w-[1180px] px-5"><Reveal><div className="mb-10"><p className="text-xs font-bold uppercase tracking-[.18em] text-larimar">Trabajo real</p><h2 className="mt-4 max-w-[16ch] font-display text-[clamp(36px,5vw,56px)] font-bold leading-tight">Empezamos con lo que ya hemos construido.</h2></div></Reveal><ProjectCards compact dark/></div></section>

      <section id="proceso" className="py-20 sm:py-24"><div className="mx-auto max-w-[1180px] px-5"><Reveal><div className="mb-10"><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-deep">Proceso simple</p><h2 className="mt-4 font-display text-[clamp(36px,5vw,56px)] font-bold text-primary">Cuatro pasos. Tecnología después del problema.</h2></div></Reveal><ScrollProgressSteps steps={processSteps}/></div></section>

      <section id="contacto" className="bg-[#fff5e8] py-20 sm:py-24"><div className="mx-auto grid max-w-[1180px] gap-10 px-5 lg:grid-cols-[1fr_auto] lg:items-center"><Reveal><div><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-deep">Habla con una persona</p><h2 className="mt-4 max-w-[15ch] font-display text-[clamp(38px,5vw,62px)] font-bold leading-tight text-primary">¿Dónde se están perdiendo clientes o tiempo hoy?</h2><p className="mt-4 max-w-[58ch] text-lg leading-relaxed text-text-2">Una conversación corta puede ser suficiente para saber si vale la pena profundizar.</p></div></Reveal><div className="rounded-[1.5rem] border border-orange-200 bg-white p-5 shadow-xl"><p className="text-xs font-bold uppercase tracking-[.14em] text-text-2">Contacto directo</p><a href={brand.publicPhoneHref} className="mt-3 block font-display text-2xl font-bold text-primary hover:text-amber-deep">{brand.publicPhoneDisplay}</a><a href={`mailto:${brand.publicEmail}`} className="mt-1 block text-sm text-tech">{brand.publicEmail}</a><div className="mt-5"><PhoneCta label="Llamar ahora"/></div></div></div></section>
      <FooterSimple />
      <PreviewRail active="d" />
    </div>
  );
}

export function MarketingVariantPage({ variant }: { variant: MarketingVariant }) {
  if (variant === "a") return <VariantA />;
  if (variant === "b") return <VariantB />;
  if (variant === "c") return <VariantC />;
  return <VariantD />;
}
