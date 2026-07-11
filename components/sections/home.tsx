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
import { SystemPanel } from "@/components/demo/system-panel";
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
            <Eyebrow>Consultoría para negocios que quieren ordenar la casa</Eyebrow>
            <h1 className="mt-4 font-display text-[clamp(38px,5vw,64px)] font-extrabold leading-[1.04] tracking-[-0.03em] text-primary">
              <span className="bg-gradient-to-r from-amber-deep to-larimar-deep bg-clip-text text-transparent">
                Ordenamos el desorden
              </span>{" "}
              antes de venderte tecnología.
            </h1>
            <p className="mt-5 max-w-[48ch] text-[clamp(16.5px,1.35vw,19px)] leading-[1.55] text-text-2">
              Ayudamos a PYMES dominicanas a responder mejor, dar seguimiento,
              agendar sin enredos y ver qué está pasando en el negocio. Primero
              entendemos tu operación; después montamos el sistema que hace falta.
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
                "Diagnóstico con gente real",
                "Plan por fases",
                "Pensado para negocios en RD",
              ].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 font-medium">
                  <span className="font-bold text-success">✓</span> {t}
                </span>
              ))}
            </div>
          </div>
          <SystemPanel />
        </div>
      </Container>
    </Section>
  );
}

export function ProblemSection() {
  const pains = [
    {
      title: "Personas interesadas que se pierden en WhatsApp",
      body: "Escriben de noche, nadie responde, y cuando vuelves ya compraron en otro lado.",
    },
    {
      title: "Clientes sin seguimiento",
      body: "Se atiende una vez, se deja para después, y nadie sabe quién debía llamar.",
    },
    {
      title: "Citas mal llevadas",
      body: "Huecos, cancelaciones, dobles reservas y una agenda que vive cambiando a mano.",
    },
    {
      title: "El equipo contestando lo mismo todo el día",
      body: "Precios, horarios, ubicación, disponibilidad. La misma pregunta, una y otra vez.",
    },
    {
      title: "Números que llegan tarde",
      body: "El dueño se entera al cierre de mes, cuando ya se perdió tiempo y dinero.",
    },
    {
      title: "Información regada",
      body: "Un poco en celulares, otro poco en Excel, otro poco en la memoria de alguien.",
    },
  ];

  return (
    <Section id="problema">
      <Container>
        <SectionHead
          eyebrow="El problema real"
          title={
            <>
              Tu negocio no necesita otra app más.{" "}
              <strong className="text-primary">Necesita trabajar con orden.</strong>
            </>
          }
        />
        <div className="grid items-start gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-lg leading-relaxed text-text-2">
              Muchos negocios ya tienen WhatsApp, Instagram, Excel, llamadas,
              libretas y calendario. El problema no es que falten herramientas.{" "}
              <strong className="text-text">
                El problema es que cada cosa va por su lado.
              </strong>
            </p>
            <p className="mt-4 text-base text-text-2">
              Ahí se pierden clientes, el equipo se cansa y el dueño empieza a
              preguntar tarde: “¿y qué pasó con esa gente?”. En RD, la mayoría de
              negocios no está comprando palabras bonitas sobre inteligencia
              artificial. Está comprando{" "}
              <strong className="text-text">menos desorden y más control</strong>.
              Eso es lo que construimos.
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-line bg-bg-2 p-7">
            <h4 className="mb-4 font-mono text-xs font-medium uppercase tracking-[0.14em] text-mute">
              Lo que aparece en casi cada diagnóstico
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
    ["WhatsApp personal", "Varias personas contestando sin saber qué dijo la otra."],
    ["Excel intocable", "Solo una persona lo entiende. Si falta, se tranca todo."],
    ["Libretas y papel", "Citas anotadas a mano, cambios sin aviso, datos perdidos."],
    ["Llamadas sin registro", "Si no contestaron, nadie recuerda devolver la llamada."],
    ["Clientes sin próximo paso", "Se habló con ellos, sí. Pero nadie sabe qué sigue."],
    ["Dueño preguntando", "“¿Qué pasó con ese cliente?” y media oficina buscando respuesta."],
  ];
  const after = [
    ["Mensajes en un solo lugar", "WhatsApp, Instagram y formularios con orden y responsable."],
    ["Registro de clientes y seguimiento", "Cualquiera atiende con contexto, sin empezar desde cero."],
    ["Agenda conectada", "Confirmaciones y recordatorios que salen sin perseguir a nadie."],
    ["Respuestas repetidas bajo control", "Lo simple se responde rápido; lo delicado pasa a una persona."],
    ["Próximos pasos visibles", "Cada cliente tiene estado, responsable y acción siguiente."],
    ["Panel de control", "El dueño ve lo importante sin pedir veinte reportes."],
  ];

  return (
    <Section id="antes-despues" className="bg-bg-2">
      <Container>
        <SectionHead
          center
          eyebrow="Antes vs. después"
          title={
            <>
              De operar con parches a{" "}
              <strong className="text-primary">trabajar con sistema.</strong>
            </>
          }
          lede="Esto es lo que cambia cuando el negocio deja de depender de memoria, suerte y corredera."
        />
        <div className="grid overflow-hidden rounded-[var(--radius-xl)] border border-line bg-white md:grid-cols-2">
          <div className="border-b border-line p-8 md:border-b-0 md:border-r">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-red-700">
              <X className="h-3 w-3" /> Antes
            </span>
            <h3 className="mb-5 font-display text-[28px] font-bold text-red-900">
              Cómo se trabaja hoy
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
              Cómo se trabaja con nosotros
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
    title: "Miramos cómo trabajas",
    body: "Vemos por dónde entran los clientes, quién responde, cómo se agenda y dónde se queda dinero en la mesa.",
    icon: Search,
  },
  {
    n: "02",
    title: "Detectamos los tranques",
    body: "Separamos lo urgente de lo decorativo: tareas repetidas, clientes sin seguimiento y pasos que nadie tiene claros.",
    icon: LayoutGrid,
  },
  {
    n: "03",
    title: "Armamos el mapa",
    body: "Te entregamos una ruta sencilla: qué ordenar primero, qué herramientas usar y qué puede esperar.",
    icon: Map,
  },
  {
    n: "04",
    title: "Montamos el sistema",
    body: "Conectamos mensajes, agenda, seguimiento, automatizaciones y reportes. Probado antes de ponerlo a correr.",
    icon: Wrench,
  },
  {
    n: "05",
    title: "Ajustamos con uso real",
    body: "Medimos, corregimos y mejoramos. Un sistema bueno no se deja abandonado el día de entrega.",
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
              Primero entendemos el negocio.{" "}
              <span className="italic text-amber">Después entra la tecnología.</span>
            </>
          }
          lede="No llegamos vendiendo una herramienta de moda. Llegamos a ordenar una operación que tiene que funcionar lunes, martes y viernes con el equipo real que tienes."
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
      body: "Una conversación corta para entender qué te está costando tiempo, clientes o tranquilidad.",
      items: ["WhatsApp o llamada", "Dolor principal", "Siguiente paso claro"],
      cta: { href: "#evaluacion", label: "Agendar evaluación", variant: "primary" as const },
    },
    {
      tag: "Producto de entrada",
      title: "Diagnóstico operativo",
      time: "Pagado",
      body: "Revisamos procesos, fugas y oportunidades. Sales con un mapa de trabajo y una propuesta por fases, sin comprar a ciegas.",
      items: [
        "Reunión de levantamiento",
        "Mapa de cómo se trabaja hoy y cómo debería fluir",
        "Plan por fases + cotización",
      ],
      cta: { href: "#evaluacion", label: "Quiero evaluar mi negocio", variant: "dark" as const },
      highlight: true,
    },
    {
      tag: "Rápido",
      title: "Proyecto corto de automatización",
      time: "7-21 días",
      body: "Resolvemos un dolor específico: agenda, mensajes, seguimiento o una tarea repetitiva que ya cansó.",
      items: ["Un dolor, un resultado", "Precio cerrado", "Listo para usar"],
      cta: { href: "#evaluacion", label: "Hablar de un proyecto corto", variant: "ghost" as const },
    },
    {
      tag: "Completo",
      title: "Sistema operativo para tu negocio",
      time: "Por fases",
      body: "Mensajes, agenda, seguimiento de clientes, automatizaciones y paneles de control trabajando juntos.",
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
              Empieza por el nivel correcto.{" "}
              <strong className="text-primary">Sin comprar a ciegas.</strong>
            </>
          }
          lede="Primero una evaluación corta. Luego, si tiene sentido, un diagnóstico pagado. Después implementamos por fases."
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
    "Cuestionario inicial sobre cómo trabaja el negocio",
    "Reunión de levantamiento (60 min)",
    "Mapa del proceso actual",
    "Detección de tranques y fugas",
    "Recomendaciones para automatizar sin inventar de más",
    "Mapa del sistema recomendado",
    "Plan de implementación por fases",
    "Cotización cerrada para implementar",
  ];

  return (
    <Section id="diagnostico" className="bg-bg-2">
      <Container>
        <div className="relative grid items-center gap-10 overflow-hidden rounded-[var(--radius-xl)] border border-line bg-gradient-to-br from-amber-soft via-white to-white p-8 lg:grid-cols-[1.1fr_1fr] lg:p-12">
          <div>
            <Eyebrow>Producto de entrada</Eyebrow>
            <h2 className="mt-3.5 font-display text-[clamp(28px,3.2vw,42px)] font-bold text-primary">
              <span className="text-amber-deep">Diagnóstico operativo.</span>
            </h2>
            <p className="mt-3 text-base text-text-2">
              Antes de montar nada, miramos la operación con calma. Qué pasa
              cuando entra un cliente, dónde se pierde seguimiento, qué se repite
              demasiado y qué conviene resolver primero.
            </p>
            <p className="mt-3 text-base text-text-2">
              La evaluación inicial de 15 minutos es gratis. El diagnóstico
              formal es pagado porque deja un entregable serio: una ruta que
              puedes usar incluso si decides no implementar con nosotros.
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
    title: "Mensajes y ventas en orden",
    body: "Ponemos WhatsApp, Instagram y formularios en un solo lugar para que ningún cliente se quede flotando.",
    tags: ["WhatsApp", "Instagram", "Formularios"],
    outcome: "Más respuestas a tiempo, menos oportunidades perdidas",
  },
  {
    icon: Users,
    title: "Registro de clientes y seguimiento",
    body: "Cada persona interesada queda con estado, responsable y próximo paso. Así el equipo sabe qué hacer.",
    tags: ["Clientes", "Estados", "Tareas"],
    outcome: "Cada contacto con una acción clara",
  },
  {
    icon: Calendar,
    title: "Agenda conectada",
    body: "Citas, confirmaciones, recordatorios y cambios sin vivir apagando fuegos.",
    tags: ["Calendario", "Confirmaciones"],
    outcome: "Menos ausencias, más citas aprovechadas",
  },
  {
    icon: Zap,
    title: "Tareas repetitivas automatizadas",
    body: "Reducimos copiar datos, enviar mensajes, clasificar solicitudes y pasar casos al equipo correcto.",
    tags: ["Flujos", "Mensajes", "Alertas"],
    outcome: "Horas semanales recuperadas",
  },
  {
    icon: Bot,
    title: "Asistentes para preguntas repetidas",
    body: "Responden lo básico bajo reglas claras. Cuando el caso se complica, pasa a una persona.",
    tags: ["Preguntas", "WhatsApp", "Soporte"],
    outcome: "Atención más rápida sin perder el toque humano",
  },
  {
    icon: BarChart3,
    title: "Paneles de control y reportes",
    body: "Clientes nuevos, citas, ventas, tiempo de respuesta y resultados en una vista que el dueño puede leer.",
    tags: ["Control", "Números"],
    outcome: "Decisiones con datos, no con corazonadas",
  },
  {
    icon: Link2,
    title: "Conexiones a medida",
    body: "Hacemos que las herramientas que ya usas se hablen entre ellas, en vez de obligarte a empezar de cero.",
    tags: ["Herramientas", "Calendarios"],
    outcome: "Menos doble trabajo",
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
              Convertimos trabajo manual en{" "}
              <strong className="text-primary">procesos que sí se pueden medir.</strong>
            </>
          }
          lede="No vendemos herramientas sueltas. Ordenamos las partes del negocio que más duelen y las conectamos para que el equipo pueda usarlas de verdad."
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
      body: "Citas, recordatorios, pacientes nuevos y reportes para el doctor o administrador.",
      href: "/clinicas",
      featured: true,
      items: [
        "Agenda con confirmación automática",
        "Recordatorio 24h y 2h antes",
        "Respuestas para preguntas frecuentes",
        "Reactivación de pacientes",
      ],
    },
    {
      tag: "Nicho #2",
      title: "Academias y centros educativos",
      body: "Inscripciones, pagos, seguimiento a interesados y comunicación con padres.",
      items: ["Seguimiento por curso", "Recordatorio de pago", "Formularios digitales"],
    },
    {
      tag: "Nicho #3",
      title: "Ferreterías y comercios",
      body: "Cotizaciones, pedidos por WhatsApp, seguimiento y mejor historial de clientes.",
      items: ["Cotizaciones desde catálogo", "Seguimiento después de vender", "Alertas de inventario"],
    },
    {
      tag: "Nicho #4",
      title: "Servicios profesionales",
      body: "Prospectos, reuniones, propuestas, cobros y tareas administrativas con más orden.",
      items: ["Próxima acción visible", "Agenda de reuniones", "Seguimiento de cobro"],
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
                responder rápido y dar seguimiento cambia el resultado.
              </strong>
            </>
          }
          lede="Empezamos por sectores donde el dolor se ve rápido: llamadas perdidas, citas vacías, mensajes sin responder y clientes que se enfrían."
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
                  Ver página de clínicas →
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
    "Te llegan clientes por WhatsApp, Instagram o llamadas",
    "Tu equipo repite las mismas tareas todos los días",
    "No hay seguimiento claro de citas, pacientes o clientes",
    "Quieres crecer sin depender de libretas y Excel",
    "Necesitas ver números sin perseguir a media oficina",
  ];
  const no = [
    "Buscas solo “un asistente automático barato”",
    "No estás dispuesto a cambiar procesos internos",
    "Quieres automatizar sin ordenar primero",
    "Nadie dentro del negocio va a liderar el cambio",
  ];

  return (
    <Section className="bg-bg-2">
      <Container>
        <SectionHead
          center
          eyebrow="Buen encaje"
          title="Para quién sí, y para quién no"
          lede="Trabajamos mejor con negocios que quieren ordenar de verdad, no ponerle maquillaje tecnológico al mismo desorden."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[var(--radius-xl)] border border-emerald-200 bg-white p-8">
            <h3 className="mb-4 font-display text-xl font-bold text-emerald-700">
              Esto es para ti si...
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
              Esto no es para ti si...
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
    { icon: Users, label: "Registro de clientes configurado" },
    { icon: Inbox, label: "Bandeja de mensajes" },
    { icon: Settings2, label: "Tareas automatizadas" },
    { icon: Bot, label: "Asistente para preguntas repetidas" },
    { icon: Calendar, label: "Agenda conectada" },
    { icon: BarChart3, label: "Paneles de control" },
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
                <strong className="text-primary">Entregamos control para operar.</strong>
              </h2>
            </div>
            <p className="text-[15.5px] text-text-2">
              Entregamos cosas que tu equipo puede usar: procesos claros,
              seguimiento configurado, mensajes ordenados, reportes, capacitación
              y soporte para que no se quede bonito solo el día de entrega.
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
    { name: "Operación", tools: "Odoo · registro de clientes · Google Calendar" },
    { name: "Automatización", tools: "n8n · conexiones entre sistemas · alertas" },
    { name: "Reportes", tools: "Metabase · métricas web" },
    { name: "Infraestructura", tools: "Cloudflare · Docker · PostgreSQL" },
    { name: "Asistentes", tools: "Modelos de IA bajo reglas claras" },
  ];

  return (
    <Section
      id="stack"
      className="overflow-hidden bg-bg-dark text-white before:pointer-events-none before:absolute before:right-0 before:top-0 before:h-[500px] before:w-[500px] before:bg-[radial-gradient(circle,rgba(56,189,248,0.18),transparent_60%)] before:content-['']"
    >
      <Container className="relative z-10">
        <SectionHead
          dark
          eyebrow="Herramientas que usamos"
          title={
            <>
              Tecnología seria,{" "}
              <strong className="text-white">explicada sin marearte.</strong>
            </>
          }
          lede="Usamos herramientas probadas. Lo importante no es el nombre de cada plataforma; lo importante es que el sistema sea estable, claro y usable para tu equipo."
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
    q: "¿Necesito cambiar lo que uso ahora?",
    a: "No necesariamente. Primero miramos lo que ya tienes. Solo recomendamos cambiar algo cuando claramente está causando el desorden.",
  },
  {
    q: "¿La inteligencia artificial reemplaza a mi personal?",
    a: "No. Se usa para preguntas repetidas y tareas mecánicas. Las ventas, los casos delicados y las decisiones siguen siendo humanas.",
  },
  {
    q: "¿La evaluación y el diagnóstico son gratis?",
    a: "La evaluación inicial de 15 minutos es gratis. El diagnóstico operativo es pagado porque incluye mapa, recomendaciones, plan por fases y cotización.",
  },
  {
    q: "¿Cuánto tarda un proyecto?",
    a: "Una implementación corta para resolver un problema específico suele tomar 7-21 días. Un sistema más completo puede tomar 4-12 semanas, según el alcance.",
  },
  {
    q: "¿Puedo empezar pequeño?",
    a: "Sí, y normalmente es lo más sensato. Evaluamos, diagnosticamos si hace falta, resolvemos un primer dolor y luego escalamos con evidencia.",
  },
  {
    q: "¿Funciona con WhatsApp?",
    a: "Sí. Trabajamos con opciones oficiales y estables para evitar inventos raros que después se caen o bloquean la cuenta.",
  },
  {
    q: "¿Qué pasa si mi equipo no es técnico?",
    a: "Mejor todavía: el sistema tiene que ser entendible. Entregamos manual, capacitación y soporte para que el equipo lo use sin depender de nosotros para todo.",
  },
  {
    q: "¿Cuánto cuesta?",
    a: "La evaluación es gratis. El diagnóstico y la implementación se cotizan según alcance. Después del diagnóstico tendrás números claros antes de avanzar.",
  },
];

export function FaqSection() {
  return (
    <Section id="faq">
      <Container>
        <SectionHead
          center
          eyebrow="Preguntas frecuentes"
          title="Las dudas normales antes de meterle mano al negocio."
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
                  -
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
              Cuéntanos qué se está enredando. Te diremos por dónde empezar.
            </h2>
            <p className="mt-4 text-base text-text-2">
              Completa el formulario o escríbenos por WhatsApp. En 24-48 horas
              laborables te damos una respuesta inicial y, si tiene sentido,
              agendamos la evaluación de 15 minutos.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-text-2">
              {[
                "Sin compromiso",
                "Sin venta forzada",
                "Diagnóstico formal solo si de verdad aporta",
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
          ¿Qué parte de tu negocio{" "}
          <span className="italic text-amber">hay que ordenar primero?</span>
        </h2>
        <p className="mx-auto mt-4 max-w-[50ch] text-lg text-white/78">
          Agenda una evaluación inicial y recibe una ruta clara para mejorar
          atención, seguimiento, citas y control.
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
          Respuesta inicial en 24-48 horas · Sin compromiso
        </div>
      </Container>
    </Section>
  );
}
