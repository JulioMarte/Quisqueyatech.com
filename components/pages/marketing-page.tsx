import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  Code2,
  Globe2,
  HeartPulse,
  MessageSquareText,
  Phone,
  Search,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ButtonLink } from "@/components/ui/button";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/ui/motion";
import { Container, Eyebrow, Section, SectionHead } from "@/components/ui/section";
import { PrivacySections } from "@/components/pages/privacy-sections";
import { ResourceGrid } from "@/components/resources/resource-grid";
import { brand } from "@/lib/brand";
import { getPublishedPost, getPublishedPosts } from "@/lib/server/content";
import type { Locale } from "@/lib/i18n";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  personJsonLd,
  serviceBreadcrumbs,
} from "@/lib/seo";
import { resourcePath, routePath, type StaticRouteKey } from "@/lib/routes";

export type PageKind =
  | "solutions"
  | "web"
  | "automation"
  | "agents"
  | "software"
  | "clinics"
  | "method"
  | "resources"
  | "about"
  | "privacy";

type Item = readonly [title: string, body: string];

type PageDefinition = {
  eyebrow: string;
  title: string;
  lede: string;
  problemTitle: string;
  problemBody: string;
  problems: readonly Item[];
  capabilityTitle: string;
  capabilityBody: string;
  capabilities: readonly Item[];
  principleTitle: string;
  principleBody: string;
  principles: readonly Item[];
  faq: readonly Item[];
};

const definitions: Record<
  Exclude<PageKind, "resources" | "about" | "privacy">,
  Record<Locale, PageDefinition>
> = {
  solutions: {
    es: {
      eyebrow: "Servicios",
      title: "La tecnología correcta depende del problema que vale la pena resolver.",
      lede:
        "QuisqueyaTech combina web, SEO, automatización, IA e integraciones. No empezamos por una herramienta: entendemos el proceso, identificamos la fricción y elegimos la pieza que realmente cambia el resultado.",
      problemTitle: "Un catálogo de software no arregla un proceso roto.",
      problemBody:
        "Muchas empresas ya tienen formularios, hojas de cálculo, WhatsApp, correo, agendas y aplicaciones. El problema aparece en los espacios entre esas herramientas: información que no llega, seguimientos que dependen de memoria y clientes que no saben cuál es el próximo paso.",
      problems: [
        ["Presencia digital que no convierte", "El sitio existe, pero no explica bien la oferta, no captura intención o no permite saber qué canales generan oportunidades."],
        ["Trabajo manual que se repite", "El equipo copia información, persigue respuestas o repite tareas que podrían coordinarse de forma más consistente."],
        ["Herramientas desconectadas", "Los datos están repartidos entre sistemas y cada persona termina reconstruyendo el contexto por su cuenta."],
      ],
      capabilityTitle: "Cuatro formas de intervenir, una sola lógica de negocio.",
      capabilityBody:
        "Cada servicio puede funcionar de forma independiente, pero el mayor valor aparece cuando las piezas responden al mismo proceso y comparten una definición clara del resultado.",
      capabilities: [
        ["Sitios web y SEO", "Convertimos la presencia digital en una entrada clara hacia el negocio: contenido útil, intención medible y próximos pasos visibles."],
        ["Automatización", "Conectamos tareas, estados, avisos y seguimientos para que el trabajo avance sin depender de copiar o recordar."],
        ["IA aplicada", "Usamos agentes de voz o texto cuando pueden responder, recopilar o ejecutar acciones dentro de límites explícitos."],
        ["Software e integraciones", "Construimos interfaces e integraciones específicas cuando el software genérico obliga al negocio a trabajar alrededor de la herramienta."],
      ],
      principleTitle: "La implementación debe ser tan simple como permita el problema.",
      principleBody:
        "No todo necesita IA, una aplicación nueva o una reconstrucción completa. Una buena solución puede ser una mejor página, una integración pequeña o un flujo automatizado bien medido.",
      principles: [
        ["Entender antes de construir", "Mapeamos entrada, responsables, decisiones, datos y excepciones antes de proponer tecnología."],
        ["Reutilizar antes de reemplazar", "Si una herramienta ya funciona, preferimos integrarla a crear otro sistema que el equipo tenga que aprender."],
        ["Medir después de lanzar", "Definimos qué evento o resultado demostraría que el cambio está ayudando al negocio."],
      ],
      faq: [
        ["¿Tengo que saber qué tecnología necesito?", "No. Es más útil que puedas explicar cómo funciona hoy el proceso y dónde se pierde tiempo, clientes o visibilidad."],
        ["¿Pueden trabajar con las herramientas que ya usamos?", "Sí. Una parte importante del enfoque es decidir qué debe conservarse, qué debe conectarse y qué realmente merece reemplazo."],
        ["¿Cada proyecto termina en software a medida?", "No. El objetivo es resolver el problema con la solución más pequeña que produzca un cambio verificable."],
      ],
    },
    en: {
      eyebrow: "Services",
      title: "The right technology depends on the problem worth solving.",
      lede:
        "QuisqueyaTech combines web, SEO, automation, AI, and integrations. We do not start with a tool: we understand the process, identify the friction, and choose the piece that can actually change the outcome.",
      problemTitle: "A software catalog does not repair a broken process.",
      problemBody:
        "Many companies already have forms, spreadsheets, WhatsApp, email, calendars, and applications. The problem often lives between those tools: information that never arrives, follow-up that depends on memory, and customers who do not know the next step.",
      problems: [
        ["A digital presence that does not convert", "The website exists, but the offer is unclear, intent is not captured, or the business cannot tell which channels create opportunities."],
        ["Manual work keeps repeating", "The team copies information, chases responses, or repeats tasks that could be coordinated more consistently."],
        ["Tools stay disconnected", "Data is spread across systems and every person has to rebuild the context on their own."],
      ],
      capabilityTitle: "Four ways to intervene, one business logic.",
      capabilityBody:
        "Each service can stand alone, but the strongest systems appear when every piece serves the same process and shares a clear definition of the outcome.",
      capabilities: [
        ["Websites and SEO", "Turn your digital presence into a clear entry point to the business with useful content, measurable intent, and visible next steps."],
        ["Automation", "Connect tasks, states, notifications, and follow-up so work moves without depending on copying or remembering."],
        ["Applied AI", "Use voice or text agents when they can respond, collect, or perform actions within explicit boundaries."],
        ["Software and integrations", "Build focused interfaces and integrations when generic software forces the business to work around the tool."],
      ],
      principleTitle: "Implementation should be as simple as the problem allows.",
      principleBody:
        "Not everything needs AI, a new application, or a complete rebuild. A good solution can be a better page, a small integration, or a well-measured automated workflow.",
      principles: [
        ["Understand before building", "Map intake, ownership, decisions, data, and exceptions before proposing technology."],
        ["Reuse before replacing", "If a tool already works, prefer integrating it over creating another system the team must learn."],
        ["Measure after launch", "Define which event or outcome would prove the change is helping the business."],
      ],
      faq: [
        ["Do I need to know which technology I need?", "No. It is more useful to explain how the process works today and where time, customers, or visibility are being lost."],
        ["Can you work with the tools we already use?", "Yes. A major part of the work is deciding what should stay, what should connect, and what genuinely needs replacement."],
        ["Does every project become custom software?", "No. The goal is to solve the problem with the smallest solution that produces a verifiable change."],
      ],
    },
  },
  web: {
    es: {
      eyebrow: "Sitios web y SEO",
      title: "Una web útil debe explicar, captar intención y dejar evidencia de lo que funciona.",
      lede:
        "Diseñamos sitios rápidos y claros alrededor de cómo una persona descubre tu negocio, entiende la oferta, compara opciones y decide contactarte. SEO y medición forman parte de la arquitectura, no son parches posteriores.",
      problemTitle: "El problema rara vez es que la página no se vea suficientemente moderna.",
      problemBody:
        "Un rediseño tiene poco valor si el visitante sigue sin entender qué haces, si las páginas no responden búsquedas reales o si nadie puede relacionar tráfico con llamadas, formularios y oportunidades.",
      problems: [
        ["Oferta poco clara", "La página intenta decir demasiado o describe tecnología sin responder qué problema resuelve el negocio para el cliente."],
        ["SEO sin arquitectura", "Se publican páginas o artículos sin una relación clara entre intención de búsqueda, servicios, casos y enlaces internos."],
        ["Conversión invisible", "Hay visitas, pero llamadas, formularios, WhatsApp y siguientes pasos no están instrumentados de forma útil."],
      ],
      capabilityTitle: "Construimos la presencia digital como parte del sistema comercial.",
      capabilityBody:
        "El sitio puede ser simple visualmente y aun así ser sofisticado en la forma en que organiza información, responde búsquedas y conecta una visita con una acción medible.",
      capabilities: [
        ["Arquitectura de información", "Definimos páginas y jerarquía según las preguntas que debe responder el visitante y las búsquedas que queremos cubrir."],
        ["SEO técnico y on-page", "Metadatos, canonicals, idiomas, sitemap, datos estructurados, enlazado interno y contenido con una intención clara."],
        ["Conversión", "Diseñamos CTAs y formularios alrededor de una acción concreta sin llenar la interfaz de caminos que compiten entre sí."],
        ["Medición", "Preparamos eventos para tráfico, llamadas, formularios y otras acciones que puedan conectarse con resultados posteriores."],
      ],
      principleTitle: "SEO no significa producir texto para robots.",
      principleBody:
        "Preferimos páginas que una persona realmente quiera leer y que demuestren experiencia, contexto y criterio. El objetivo es construir autoridad temática y comercial, no volumen de contenido vacío.",
      principles: [
        ["Una intención por página", "Cada página importante debe responder una necesidad concreta y tener un próximo paso coherente."],
        ["Casos antes que promesas", "El trabajo real, el proceso y las decisiones generan más confianza que estadísticas sin contexto."],
        ["Rendimiento medido", "Core Web Vitals, indexación y conversiones se revisan con datos después del lanzamiento."],
      ],
      faq: [
        ["¿Pueden rediseñar un sitio existente?", "Sí, pero primero evaluamos si el problema está en diseño, contenido, estructura, rendimiento, medición o en el proceso al que la web entrega el lead."],
        ["¿SEO está incluido desde el principio?", "Sí. La estructura de URLs, idiomas, metadata, enlaces internos, indexación y contenido se consideran durante la arquitectura del sitio."],
        ["¿Pueden medir llamadas y formularios?", "Podemos instrumentar esas acciones y diseñar una capa de medición para conectarlas con el origen del tráfico y, cuando exista el sistema de negocio adecuado, con resultados posteriores."],
      ],
    },
    en: {
      eyebrow: "Websites and SEO",
      title: "A useful website should explain, capture intent, and leave evidence of what works.",
      lede:
        "We build fast, clear websites around how people discover the business, understand the offer, compare options, and decide to contact you. SEO and measurement are part of the architecture, not patches added later.",
      problemTitle: "The problem is rarely that the website does not look modern enough.",
      problemBody:
        "A redesign has little value if visitors still do not understand what you do, pages do not answer real searches, or nobody can connect traffic with calls, forms, and opportunities.",
      problems: [
        ["The offer is unclear", "The page tries to say too much or describes technology without explaining which customer problem the business solves."],
        ["SEO without architecture", "Pages and articles are published without a clear relationship between search intent, services, case studies, and internal links."],
        ["Conversion stays invisible", "Traffic exists, but calls, forms, WhatsApp, and next steps are not instrumented in a useful way."],
      ],
      capabilityTitle: "We build the digital presence as part of the commercial system.",
      capabilityBody:
        "A website can remain visually simple while being sophisticated in how it organizes information, answers searches, and connects a visit with a measurable action.",
      capabilities: [
        ["Information architecture", "Define pages and hierarchy around the questions visitors need answered and the searches the business should cover."],
        ["Technical and on-page SEO", "Metadata, canonicals, languages, sitemap, structured data, internal linking, and content with a clear purpose."],
        ["Conversion", "Design CTAs and forms around one concrete action instead of filling the interface with competing paths."],
        ["Measurement", "Prepare events for traffic, calls, forms, and other actions that can later connect with business outcomes."],
      ],
      principleTitle: "SEO does not mean producing text for robots.",
      principleBody:
        "We prefer pages people genuinely want to read and that demonstrate experience, context, and judgment. The goal is topical and commercial authority, not empty content volume.",
      principles: [
        ["One intent per page", "Every important page should answer a concrete need and provide a coherent next step."],
        ["Cases before promises", "Real work, process, and decisions create more trust than unsupported performance claims."],
        ["Measure performance", "Core Web Vitals, indexation, and conversions should be reviewed with real data after launch."],
      ],
      faq: [
        ["Can you redesign an existing website?", "Yes, but first we determine whether the real problem is design, content, structure, performance, measurement, or the process receiving the lead."],
        ["Is SEO included from the beginning?", "Yes. URL structure, languages, metadata, internal links, indexation, and content are considered during the site architecture."],
        ["Can you measure calls and forms?", "We can instrument those actions and design a measurement layer that connects them to traffic sources and, when the business system supports it, later outcomes."],
      ],
    },
  },
  automation: {
    es: {
      eyebrow: "Automatización de procesos",
      title: "Automatiza cuando las reglas son claras y el trabajo repetitivo ya tiene un costo visible.",
      lede:
        "Diseñamos automatizaciones para seguimiento, traspasos, avisos y reportes. El objetivo no es eliminar personas: es dejar de gastar atención humana en mover información que un sistema puede coordinar.",
      problemTitle: "Automatizar un proceso confuso solo hace que el caos ocurra más rápido.",
      problemBody:
        "Antes de conectar herramientas, necesitamos saber qué inicia el flujo, quién es responsable, qué información es obligatoria, qué excepciones existen y qué resultado debe producirse.",
      problems: [
        ["Copiar y pegar", "La misma información viaja manualmente entre formularios, hojas, correo, CRM o mensajes."],
        ["Seguimiento por memoria", "Un lead, una tarea o una aprobación avanza solamente si alguien recuerda revisarla."],
        ["Reportes manuales", "Para saber qué pasó hay que reunir datos de varias herramientas y reconstruir el proceso después."],
      ],
      capabilityTitle: "Automatizamos coordinación, no solamente acciones sueltas.",
      capabilityBody:
        "Una automatización útil mantiene contexto y estado suficiente para saber qué ocurrió, qué falta y quién debe intervenir cuando algo sale del camino normal.",
      capabilities: [
        ["Intake y clasificación", "Normaliza solicitudes que llegan por formularios, correo, chat u otros canales y las dirige al flujo correcto."],
        ["Seguimiento", "Activa próximos pasos por estado y tiempo, con escalamiento cuando una condición necesita intervención humana."],
        ["Integraciones", "Sincroniza datos entre sistemas sin convertir cada aplicación en una nueva fuente de verdad."],
        ["Reportes y eventos", "Registra acciones relevantes para que el proceso pueda revisarse y medirse."],
      ],
      principleTitle: "Buenas automatizaciones tienen límites claros.",
      principleBody:
        "No intentamos cubrir cada excepción desde el primer día. Separamos el camino frecuente de las excepciones, definimos dónde debe detenerse el sistema y dejamos trazabilidad suficiente para corregirlo.",
      principles: [
        ["Idempotencia cuando importa", "Los reintentos no deberían crear acciones duplicadas en operaciones sensibles."],
        ["Human-in-the-loop", "Las excepciones y decisiones con riesgo deben poder escalar a una persona."],
        ["Observabilidad", "Un flujo que nadie puede explicar cuando falla no está terminado."],
      ],
      faq: [
        ["¿Qué proceso conviene automatizar primero?", "Uno repetible, con reglas relativamente estables, volumen suficiente y un resultado que pueda medirse sin poner en riesgo una operación crítica."],
        ["¿Usan n8n u otras herramientas low-code?", "Podemos usarlas cuando encajan. La herramienta depende del nivel de control, volumen, integraciones y criticidad del proceso."],
        ["¿Qué pasa con las excepciones?", "Se diseñan como parte del flujo. Un sistema serio necesita saber cuándo continuar, cuándo esperar y cuándo pedir intervención humana."],
      ],
    },
    en: {
      eyebrow: "Process automation",
      title: "Automate when the rules are clear and repetitive work already has a visible cost.",
      lede:
        "We design automation for follow-up, handoffs, notifications, and reporting. The goal is not to remove people; it is to stop spending human attention on moving information a system can coordinate.",
      problemTitle: "Automating a confusing process only makes chaos happen faster.",
      problemBody:
        "Before connecting tools, we need to know what starts the workflow, who owns it, which information is required, which exceptions exist, and which outcome must be produced.",
      problems: [
        ["Copy and paste", "The same information moves manually between forms, spreadsheets, email, CRM, or messages."],
        ["Memory-driven follow-up", "A lead, task, or approval moves only when somebody remembers to check it."],
        ["Manual reporting", "Understanding what happened requires gathering data from multiple tools and reconstructing the process afterward."],
      ],
      capabilityTitle: "We automate coordination, not only isolated actions.",
      capabilityBody:
        "Useful automation keeps enough context and state to know what happened, what is missing, and who should intervene when something leaves the normal path.",
      capabilities: [
        ["Intake and routing", "Normalize requests arriving through forms, email, chat, or other channels and direct them to the correct workflow."],
        ["Follow-up", "Trigger next steps by state and time, with escalation when a condition needs human intervention."],
        ["Integrations", "Synchronize data between systems without turning every application into another source of truth."],
        ["Reporting and events", "Record relevant actions so the workflow can be reviewed and measured."],
      ],
      principleTitle: "Good automation has clear boundaries.",
      principleBody:
        "We do not try to cover every exception on day one. We separate the common path from exceptions, define where the system must stop, and keep enough traceability to correct it.",
      principles: [
        ["Idempotency where it matters", "Retries should not create duplicate actions in sensitive operations."],
        ["Human in the loop", "Exceptions and risky decisions must be able to escalate to a person."],
        ["Observability", "A workflow nobody can explain when it fails is not finished."],
      ],
      faq: [
        ["Which process should be automated first?", "A repeatable one with relatively stable rules, enough volume, and a measurable outcome that does not put a critical operation at unnecessary risk."],
        ["Do you use n8n or other low-code tools?", "We can when they fit. The tool depends on control requirements, volume, integrations, and how critical the workflow is."],
        ["What happens with exceptions?", "They are designed into the workflow. A serious system needs to know when to continue, when to wait, and when to ask a person for help."],
      ],
    },
  },
  agents: {
    es: {
      eyebrow: "Agentes de IA",
      title: "IA que conversa y actúa solo dentro de los límites que el negocio puede verificar.",
      lede:
        "Construimos agentes de voz o texto para atención, levantamiento y operaciones. La conversación puede ser flexible; las acciones importantes deben ejecutarse mediante herramientas tipadas, permisos y reglas claras.",
      problemTitle: "Un agente convincente no es necesariamente un agente confiable.",
      problemBody:
        "El valor no está en que la voz parezca humana. Está en que el agente entienda qué puede hacer, qué información necesita, cómo confirmar una acción y cuándo debe transferir el caso a una persona.",
      problems: [
        ["Atención fuera de horario", "Solicitudes llegan cuando el equipo no está disponible y se pierden antes de entrar a un proceso claro."],
        ["Preguntas e intake repetitivos", "El equipo consume tiempo recopilando la misma información inicial o respondiendo preguntas previsibles."],
        ["Agentes sin herramientas seguras", "Un modelo tiene contexto, pero no existe una capa determinista que controle consultas, mutaciones y confirmaciones."],
      ],
      capabilityTitle: "El agente es una interfaz sobre sistemas de negocio.",
      capabilityBody:
        "Diseñamos el agente alrededor de herramientas concretas: consultar información, crear una solicitud, revisar disponibilidad, registrar un lead o escalar un caso. No necesita acceso libre al backend.",
      capabilities: [
        ["Voz y texto", "Elegimos el canal según el contexto: llamadas, web, chat o integraciones de mensajería cuando estén disponibles."],
        ["Captura estructurada", "Convierte una conversación en datos validados que otro sistema puede procesar."],
        ["Tools con permisos", "Cada acción expuesta al agente tiene un contrato, alcance y validaciones explícitas."],
        ["Handoff", "El agente puede reconocer excepciones y entregar contexto útil a una persona en lugar de improvisar."],
      ],
      principleTitle: "La IA interpreta; el sistema autoritativo valida y ejecuta.",
      principleBody:
        "Para reservas, pagos, identidad u otras acciones sensibles, el modelo no debería modificar estado directamente. Propone intención y llama una capability controlada que vuelve a validar las reglas.",
      principles: [
        ["Confirmación antes de acciones sensibles", "El usuario debe saber qué va a ocurrir antes de una mutación importante."],
        ["Contexto mínimo necesario", "El agente recibe solamente la información y herramientas que necesita para la tarea."],
        ["Trazabilidad", "Las llamadas de herramientas y resultados relevantes deben quedar correlacionados para investigar errores."],
      ],
      faq: [
        ["¿Puede un agente reservar o registrar solicitudes?", "Sí, si existe una API o capability autorizada que valide la operación. El agente no debería escribir directamente en tablas de negocio."],
        ["¿Puede funcionar en inglés y español?", "Sí. El diseño del agente, el prompt, las voces y los flujos deben probarse en ambos idiomas, no limitarse a traducir una interfaz."],
        ["¿La IA reemplaza completamente a recepción o soporte?", "No asumimos eso. Diseñamos qué tareas puede resolver bien y qué situaciones deben llegar a una persona."],
      ],
    },
    en: {
      eyebrow: "AI agents",
      title: "AI that can converse and act only within boundaries the business can verify.",
      lede:
        "We build voice and text agents for customer service, intake, and operations. Conversation can be flexible; important actions should run through typed tools, permissions, and clear rules.",
      problemTitle: "A convincing agent is not automatically a reliable agent.",
      problemBody:
        "The value is not that the voice sounds human. It is that the agent understands what it can do, which information it needs, how to confirm an action, and when the case must move to a person.",
      problems: [
        ["After-hours demand", "Requests arrive when the team is unavailable and disappear before entering a clear process."],
        ["Repeated questions and intake", "The team spends time collecting the same initial information or answering predictable questions."],
        ["Agents without safe tools", "A model has context, but there is no deterministic layer controlling queries, mutations, and confirmations."],
      ],
      capabilityTitle: "The agent is an interface over business systems.",
      capabilityBody:
        "We design the agent around concrete tools: look up information, create a request, check availability, register a lead, or escalate a case. It does not need unrestricted backend access.",
      capabilities: [
        ["Voice and text", "Choose the channel that fits the context: phone, web, chat, or messaging integrations when available."],
        ["Structured capture", "Turn conversation into validated data another system can process."],
        ["Scoped tools", "Every action exposed to the agent has an explicit contract, scope, and validation rules."],
        ["Handoff", "Recognize exceptions and provide useful context to a person instead of improvising."],
      ],
      principleTitle: "AI interprets; the authoritative system validates and executes.",
      principleBody:
        "For bookings, payments, identity, or other sensitive operations, the model should not modify state directly. It proposes intent and calls a controlled capability that revalidates the rules.",
      principles: [
        ["Confirm sensitive actions", "The user should know what is about to happen before an important mutation."],
        ["Minimum necessary context", "Give the agent only the information and tools it needs for the task."],
        ["Traceability", "Relevant tool calls and outcomes should be correlated so errors can be investigated."],
      ],
      faq: [
        ["Can an agent book or register requests?", "Yes, when an authorized API or capability validates the operation. The agent should not write directly to business tables."],
        ["Can it work in English and Spanish?", "Yes. Agent design, prompts, voices, and workflows should be tested in both languages rather than only translating the interface."],
        ["Does AI completely replace reception or support?", "We do not assume that. We define which tasks it can handle well and which situations should reach a person."],
      ],
    },
  },
  software: {
    es: {
      eyebrow: "Software e integraciones",
      title: "Construye software específico cuando el proceso es valioso y la herramienta genérica no encaja.",
      lede:
        "Integramos sistemas existentes y desarrollamos aplicaciones pequeñas o plataformas enfocadas cuando el negocio necesita una experiencia o una regla que el software estándar no resuelve bien.",
      problemTitle: "Personalizado no debe significar infraestructura distinta para cada cliente.",
      problemBody:
        "El software a medida se vuelve caro cuando cada proyecto reinventa autenticación, datos, eventos, permisos e integraciones. Buscamos experiencias específicas sobre componentes y contratos reutilizables cuando eso sea posible.",
      problems: [
        ["SaaS demasiado amplio", "La empresa paga por cientos de funciones y aun así termina adaptando el proceso a la herramienta."],
        ["Datos aislados", "Dos sistemas importantes contienen información relacionada pero no comparten un flujo confiable."],
        ["Trabajo sin interfaz adecuada", "Una tarea valiosa sigue viviendo en hojas y mensajes porque ninguna aplicación refleja realmente cómo se ejecuta."],
      ],
      capabilityTitle: "Integramos primero; construimos donde existe una brecha real.",
      capabilityBody:
        "Una solución puede ser una API, un panel interno, un widget embebible, una integración o una aplicación completa. La forma depende del boundary del problema.",
      capabilities: [
        ["Integraciones API", "Conecta sistemas mediante contratos explícitos, idempotencia y manejo de errores cuando la operación lo exige."],
        ["Aplicaciones internas", "Interfaces enfocadas para que el equipo ejecute un workflow sin depender de múltiples herramientas."],
        ["Componentes reutilizables", "Booking, forms, tracking u otras capacidades pueden vivir como servicios compartidos en vez de duplicarse dentro de cada website."],
        ["Datos y eventos", "Diseñamos fuentes de verdad, auditoría y eventos alrededor de la operación que realmente importa."],
      ],
      principleTitle: "Custom UX, shared infrastructure.",
      principleBody:
        "El cliente puede recibir una experiencia totalmente adaptada sin que cada implementación se convierta en un mini-SaaS imposible de mantener.",
      principles: [
        ["Boundaries claros", "El website, los agentes y las integraciones consumen APIs; no necesitan conocer la base de datos interna."],
        ["Source of truth explícito", "Cada dato operacional importante debe tener un dueño claro para evitar sincronizaciones ambiguas."],
        ["Construcción incremental", "Validamos un vertical slice antes de expandir el dominio o añadir infraestructura distribuida."],
      ],
      faq: [
        ["¿Cuándo conviene software a medida?", "Cuando el workflow es suficientemente valioso y estable, y adaptar el negocio a herramientas genéricas cuesta más que construir una capa específica."],
        ["¿Todo tiene que ser un sistema grande?", "No. Muchas oportunidades se resuelven mejor con una aplicación pequeña, un widget o una integración muy enfocada."],
        ["¿Pueden integrarse con un CRM o ERP existente?", "Sí. Preferimos respetar sistemas que ya son fuente de verdad y construir alrededor de ellos antes que reemplazarlos sin necesidad."],
      ],
    },
    en: {
      eyebrow: "Software and integrations",
      title: "Build focused software when the process is valuable and generic tools do not fit.",
      lede:
        "We integrate existing systems and develop small applications or focused platforms when the business needs an experience or rule standard software does not handle well.",
      problemTitle: "Custom should not mean completely different infrastructure for every client.",
      problemBody:
        "Custom software becomes expensive when every project reinvents authentication, data, events, permissions, and integrations. We aim for specific experiences over reusable components and contracts whenever that makes sense.",
      problems: [
        ["Overly broad SaaS", "The company pays for hundreds of features and still ends up adapting its process to the tool."],
        ["Isolated data", "Two important systems contain related information but do not share a reliable workflow."],
        ["Work without the right interface", "A valuable task remains in spreadsheets and messages because no application actually reflects how it is performed."],
      ],
      capabilityTitle: "Integrate first; build where a real gap exists.",
      capabilityBody:
        "A solution can be an API, internal dashboard, embeddable widget, integration, or complete application. The form depends on the boundary of the problem.",
      capabilities: [
        ["API integrations", "Connect systems through explicit contracts, idempotency, and error handling when the operation requires it."],
        ["Internal applications", "Focused interfaces that let the team perform a workflow without depending on multiple tools."],
        ["Reusable components", "Booking, forms, tracking, and similar capabilities can live as shared services instead of being duplicated inside every website."],
        ["Data and events", "Design sources of truth, audit, and events around the operation that actually matters."],
      ],
      principleTitle: "Custom UX, shared infrastructure.",
      principleBody:
        "A client can receive a highly tailored experience without every implementation becoming an unmaintainable mini-SaaS.",
      principles: [
        ["Clear boundaries", "Websites, agents, and integrations consume APIs; they do not need to know the internal database."],
        ["Explicit source of truth", "Every important operational record should have a clear owner to avoid ambiguous synchronization."],
        ["Incremental delivery", "Validate a vertical slice before expanding the domain or introducing distributed infrastructure."],
      ],
      faq: [
        ["When is custom software worth it?", "When the workflow is valuable and stable enough that forcing the business into generic tools costs more than building a focused layer."],
        ["Does everything need to become a large system?", "No. Many opportunities are better solved with a small application, widget, or very focused integration."],
        ["Can you integrate with an existing CRM or ERP?", "Yes. We prefer respecting systems that already own authoritative data and building around them instead of replacing them without a reason."],
      ],
    },
  },
  clinics: {
    es: {
      eyebrow: "Aplicación para clínicas",
      title: "Recepción, seguimiento y agenda son un workflow antes de ser una lista de herramientas.",
      lede:
        "Las clínicas son un ejemplo de cómo aplicamos sistemas, automatización e IA a un vertical. Esta página describe posibilidades, no promete resultados ni presenta una implementación genérica como si todas las clínicas trabajaran igual.",
      problemTitle: "Cada clínica tiene reglas y restricciones distintas.",
      problemBody:
        "Antes de recomendar automatización necesitamos entender cómo entran pacientes, cómo se confirma disponibilidad, quién puede modificar una cita, qué información es sensible y qué excepciones requieren personal clínico o administrativo.",
      problems: [
        ["Solicitudes dispersas", "WhatsApp, llamadas, Instagram y formularios pueden crear conversaciones sin un próximo paso visible."],
        ["Agenda dependiente de personas", "Confirmaciones, cambios y recordatorios pueden depender de memoria o de una sola persona que conoce el proceso."],
        ["Seguimiento irregular", "Pacientes que deben volver o completar un próximo paso pueden quedarse sin una acción clara."],
      ],
      capabilityTitle: "Una implementación posible conecta la entrada con el siguiente paso.",
      capabilityBody:
        "La solución concreta depende de los sistemas existentes, el tipo de práctica, los roles del equipo y las obligaciones aplicables. No asumimos un modelo clínico universal.",
      capabilities: [
        ["Intake", "Recopilar información inicial y dirigir solicitudes al flujo correcto sin pedir datos innecesarios."],
        ["Agenda", "Consultar disponibilidad y gestionar confirmaciones o cambios mediante reglas explícitas."],
        ["Seguimiento", "Mantener próximos pasos y recordatorios asociados a estados verificables."],
        ["Visibilidad", "Medir solicitudes, fuentes y estados operacionales sin convertir la web en un expediente clínico."],
      ],
      principleTitle: "El core tecnológico debe ser neutral al vertical.",
      principleBody:
        "Conceptos específicos como paciente, seguro o credenciales profesionales pertenecen al módulo adecuado. La infraestructura compartida debe conservar boundaries que también funcionen fuera de healthcare.",
      principles: [
        ["Privacidad por diseño", "Recopilar solamente los datos necesarios y separar marketing de información operacional sensible."],
        ["Roles y permisos", "No todas las personas ni agentes necesitan acceso a la misma información o acciones."],
        ["Excepciones humanas", "Un flujo debe tener caminos claros para situaciones que no pueden resolverse automáticamente."],
      ],
      faq: [
        ["¿Ofrecen una app médica lista para instalar?", "No presentamos una plataforma clínica universal. Primero evaluamos el proceso y después definimos qué módulos o integraciones tienen sentido."],
        ["¿Pueden automatizar recordatorios y seguimiento?", "Sí, cuando existe una fuente de verdad clara para el estado de la cita o solicitud y se respetan las políticas aplicables."],
        ["¿La web debería guardar información clínica?", "No por defecto. Marketing, captación y sistemas clínicos deben tener boundaries claros y manejar datos sensibles solamente donde corresponda."],
      ],
    },
    en: {
      eyebrow: "Application for clinics",
      title: "Intake, follow-up, and scheduling are a workflow before they are a list of tools.",
      lede:
        "Clinics are one example of how systems, automation, and AI can be applied to a vertical. This page describes possibilities; it does not promise outcomes or pretend every clinic operates the same way.",
      problemTitle: "Every clinic has different rules and constraints.",
      problemBody:
        "Before recommending automation we need to understand how patients arrive, how availability is confirmed, who can change an appointment, which information is sensitive, and which exceptions require clinical or administrative staff.",
      problems: [
        ["Requests are scattered", "WhatsApp, calls, Instagram, and forms can create conversations without a visible next step."],
        ["Scheduling depends on people", "Confirmations, changes, and reminders may depend on memory or on one person who knows the process."],
        ["Follow-up is inconsistent", "Patients who need to return or complete a next step can remain without a clear action."],
      ],
      capabilityTitle: "One possible implementation connects intake with the next step.",
      capabilityBody:
        "The specific solution depends on existing systems, practice type, team roles, and applicable obligations. We do not assume a universal clinical model.",
      capabilities: [
        ["Intake", "Collect initial information and route requests to the correct workflow without asking for unnecessary data."],
        ["Scheduling", "Search availability and manage confirmations or changes through explicit rules."],
        ["Follow-up", "Maintain next steps and reminders associated with verifiable states."],
        ["Visibility", "Measure requests, sources, and operational states without turning the marketing website into a clinical record system."],
      ],
      principleTitle: "Shared technology should remain neutral to the vertical.",
      principleBody:
        "Specific concepts such as patient, insurance, or professional credentials belong in the appropriate module. Shared infrastructure should preserve boundaries that also work outside healthcare.",
      principles: [
        ["Privacy by design", "Collect only necessary data and separate marketing surfaces from sensitive operational information."],
        ["Roles and permissions", "Not every person or agent needs access to the same information or actions."],
        ["Human exceptions", "A workflow needs clear paths for situations that should not be handled automatically."],
      ],
      faq: [
        ["Do you offer a universal medical app?", "No. We do not present a one-size-fits-all clinical platform. We first assess the workflow and then define which modules or integrations make sense."],
        ["Can you automate reminders and follow-up?", "Yes, when there is a clear source of truth for the appointment or request state and applicable policies are respected."],
        ["Should the website store clinical information?", "Not by default. Marketing, lead capture, and clinical systems should have clear boundaries and handle sensitive data only where appropriate."],
      ],
    },
  },
  method: {
    es: {
      eyebrow: "Cómo trabajamos",
      title: "Entender → priorizar → construir → medir.",
      lede:
        "Nuestro proceso intenta evitar dos errores: comprar tecnología antes de entender el problema y construir demasiado antes de comprobar que el cambio produce valor.",
      problemTitle: "El discovery comienza observando el trabajo real.",
      problemBody:
        "En vez de preguntar qué software quieres, pedimos que nos muestres qué pasa cuando llega una solicitud, quién interviene, dónde se registra, qué ocurre si alguien falta y cómo sabes si el proceso terminó bien.",
      problems: [
        ["1. Entender", "Mapeamos el flujo actual, las personas, herramientas, decisiones y excepciones que afectan el resultado."],
        ["2. Priorizar", "Identificamos el cuello de botella que justifica inversión y separamos lo importante de lo que puede esperar."],
        ["3. Construir", "Implementamos la solución mínima que modifica el proceso de forma visible y controlable."],
      ],
      capabilityTitle: "La cuarta etapa es medir y aprender.",
      capabilityBody:
        "Después del lanzamiento observamos qué ocurre en uso real. Si la solución no mueve la métrica o elimina la fricción definida, el trabajo no está terminado.",
      capabilities: [
        ["Medición", "Definimos eventos y resultados que permitan comparar el estado anterior con la nueva operación."],
        ["Corrección", "Ajustamos reglas, experiencia o integraciones cuando los datos muestran un punto de fuga."],
        ["Expansión por fases", "Solo añadimos nuevas capacidades cuando el sistema inicial ya demuestra que merece crecer."],
      ],
      principleTitle: "No necesitamos diseñar el futuro completo en el primer sprint.",
      principleBody:
        "Preferimos una arquitectura con boundaries claros y una implementación pequeña que pueda evolucionar a un sistema más amplio sin tener que fingir que conocemos todos los requisitos desde el día uno.",
      principles: [
        ["Business first", "El resultado operacional define qué tecnología tiene sentido."],
        ["Custom experience", "La experiencia puede adaptarse mucho aunque la infraestructura debajo sea reutilizable."],
        ["Evidence over assumptions", "Casos, telemetría y comportamiento real pesan más que una demo bonita."],
      ],
      faq: [
        ["¿Qué necesitan de mi para empezar?", "Una explicación práctica del proceso actual: qué lo inicia, quién participa, qué herramientas usan y dónde suelen aparecer problemas."],
        ["¿Siempre hacen un proyecto grande?", "No. Preferimos identificar una primera intervención que pueda demostrar valor antes de ampliar alcance."],
        ["¿Qué pasa después del lanzamiento?", "Medimos, revisamos el uso real y decidimos si conviene corregir, expandir o dejar el sistema exactamente como está."],
      ],
    },
    en: {
      eyebrow: "How we work",
      title: "Understand → prioritize → build → measure.",
      lede:
        "Our process tries to avoid two mistakes: buying technology before understanding the problem and building too much before proving the change creates value.",
      problemTitle: "Discovery starts by observing real work.",
      problemBody:
        "Instead of asking which software you want, we ask what happens when a request arrives, who gets involved, where it is recorded, what happens if somebody is unavailable, and how you know the process ended correctly.",
      problems: [
        ["1. Understand", "Map the current workflow, people, tools, decisions, and exceptions affecting the outcome."],
        ["2. Prioritize", "Identify the bottleneck that justifies investment and separate what matters from what can wait."],
        ["3. Build", "Implement the smallest solution that changes the process in a visible, controllable way."],
      ],
      capabilityTitle: "The fourth step is measuring and learning.",
      capabilityBody:
        "After launch we observe real usage. If the solution does not move the defined metric or remove the targeted friction, the work is not finished.",
      capabilities: [
        ["Measurement", "Define events and outcomes that let us compare the old state with the new operation."],
        ["Correction", "Adjust rules, experience, or integrations when data exposes a leak in the process."],
        ["Phased expansion", "Add new capabilities only after the initial system proves it deserves to grow."],
      ],
      principleTitle: "We do not need to design the entire future in the first sprint.",
      principleBody:
        "We prefer clear boundaries and a small implementation that can evolve into a broader system without pretending we know every requirement on day one.",
      principles: [
        ["Business first", "The operational outcome determines which technology makes sense."],
        ["Custom experience", "The experience can be highly tailored even when the infrastructure underneath is reusable."],
        ["Evidence over assumptions", "Case studies, telemetry, and real behavior matter more than a polished demo."],
      ],
      faq: [
        ["What do you need from me to start?", "A practical explanation of the current process: what starts it, who participates, which tools are used, and where problems usually appear."],
        ["Does every engagement become a large project?", "No. We prefer identifying a first intervention that can demonstrate value before expanding scope."],
        ["What happens after launch?", "We measure, review real usage, and decide whether to correct, expand, or leave the system exactly as it is."],
      ],
    },
  },
};

const routeKeyByKind: Record<Exclude<PageKind, "resources" | "about" | "privacy">, StaticRouteKey> = {
  solutions: "solutions",
  web: "webSeo",
  automation: "automation",
  agents: "agents",
  software: "software",
  clinics: "clinics",
  method: "method",
};

const icons = [Workflow, Search, Bot, Code2];
const contactId = (locale: Locale) => (locale === "es" ? "contacto" : "contact");

export async function MarketingPage({
  kind,
  locale,
  postSlug,
}: {
  kind: PageKind;
  locale: Locale;
  postSlug?: string;
}) {
  if (kind === "resources") return <Resources locale={locale} postSlug={postSlug} />;
  if (kind === "about") return <About locale={locale} />;
  if (kind === "privacy") return <Privacy locale={locale} />;

  const page = definitions[kind][locale];
  const routeKey = routeKeyByKind[kind];
  const breadcrumbs = serviceBreadcrumbs(routeKey, locale);

  return (
    <div lang={locale}>
      <PageHero page={page} />

      <Section className="pt-0">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[.78fr_1.22fr] lg:items-start">
            <Reveal>
              <div className="lg:sticky lg:top-28">
                <Eyebrow>{locale === "es" ? "El problema" : "The problem"}</Eyebrow>
                <h2 className="mt-4 max-w-[20ch] font-display text-[clamp(29px,3.5vw,42px)] font-bold leading-tight text-primary">
                  {page.problemTitle}
                </h2>
                <p className="mt-5 max-w-[56ch] text-lg leading-relaxed text-text-2">
                  {page.problemBody}
                </p>
              </div>
            </Reveal>
            <StaggerGroup className="grid gap-4 md:grid-cols-3">
              {page.problems.map(([title, body], index) => {
                const Icon = icons[index % icons.length];
                return (
                  <StaggerItem key={title} index={index}>
                    <article className="h-full rounded-2xl border border-line bg-white p-6 shadow-[0_18px_45px_-38px_rgba(8,47,73,.45)]">
                      <Icon className="h-10 w-10 rounded-xl bg-larimar-soft p-2 text-larimar-deep" />
                      <h3 className="mt-5 font-display text-lg font-bold text-primary">{title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-text-2">{body}</p>
                    </article>
                  </StaggerItem>
                );
              })}
            </StaggerGroup>
          </div>
        </Container>
      </Section>

      {kind === "solutions" ? <ServiceDirectory locale={locale} /> : null}

      <Section className="bg-bg-2">
        <Container>
          <SectionHead
            eyebrow={locale === "es" ? "Qué construimos" : "What we build"}
            title={page.capabilityTitle}
            lede={page.capabilityBody}
          />
          <div className="grid gap-4 md:grid-cols-2">
            {page.capabilities.map(([title, body], index) => {
              const Icon = [Globe2, Workflow, Bot, Code2][index % 4];
              return (
                <Reveal key={title} delay={index * 0.04}>
                  <article className="h-full rounded-2xl border border-line bg-white p-7">
                    <Icon className="h-10 w-10 rounded-xl bg-primary p-2 text-white" />
                    <h3 className="mt-5 font-display text-xl font-bold text-primary">{title}</h3>
                    <p className="mt-3 leading-relaxed text-text-2">{body}</p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
          <Reveal>
            <div>
              <Eyebrow>{locale === "es" ? "Criterio" : "Design principle"}</Eyebrow>
              <h2 className="mt-4 max-w-[20ch] font-display text-[clamp(30px,3.5vw,44px)] font-bold leading-tight text-primary">
                {page.principleTitle}
              </h2>
              <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-text-2">
                {page.principleBody}
              </p>
            </div>
          </Reveal>
          <div className="space-y-3">
            {page.principles.map(([title, body], index) => (
              <Reveal key={title} delay={index * 0.04}>
                <div className="grid grid-cols-[40px_1fr] gap-4 rounded-2xl border border-line bg-white p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-larimar-soft text-tech">
                    <Check className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-primary">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-text-2">{body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="bg-bg-2">
        <Container className="max-w-[920px]">
          <SectionHead
            eyebrow={locale === "es" ? "Preguntas frecuentes" : "Frequently asked questions"}
            title={locale === "es" ? "Lo que conviene aclarar antes de empezar." : "What is worth clarifying before we start."}
          />
          <div className="space-y-3">
            {page.faq.map(([question, answer]) => (
              <article key={question} className="rounded-2xl border border-line bg-white p-6">
                <h3 className="font-display text-lg font-bold text-primary">{question}</h3>
                <p className="mt-2 leading-relaxed text-text-2">{answer}</p>
              </article>
            ))}
          </div>
        </Container>
      </Section>

      <ContactCta locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}

function PageHero({ page }: { page: { eyebrow: string; title: string; lede: string } }) {
  return (
    <Section className="overflow-hidden bg-bg-2 py-20">
      <Container className="max-w-[1020px]">
        <StaggerGroup amount={0.05}>
          <StaggerItem index={0}>
            <Eyebrow>{page.eyebrow}</Eyebrow>
          </StaggerItem>
          <StaggerItem index={1}>
            <div className="overflow-hidden pb-1">
              <h1 className="max-w-[21ch] font-display text-[clamp(38px,5vw,60px)] font-extrabold leading-tight tracking-[-.035em] text-primary">
                {page.title}
              </h1>
            </div>
          </StaggerItem>
          <StaggerItem index={2}>
            <p className="mt-5 max-w-[68ch] text-xl leading-relaxed text-text-2">{page.lede}</p>
          </StaggerItem>
        </StaggerGroup>
      </Container>
    </Section>
  );
}

function ServiceDirectory({ locale }: { locale: Locale }) {
  const es = locale === "es";
  const services = [
    {
      icon: Globe2,
      href: routePath("webSeo", locale),
      title: es ? "Sitios web y SEO" : "Websites and SEO",
      body: es
        ? "Presencia digital, arquitectura de contenido, SEO técnico y conversión medible."
        : "Digital presence, content architecture, technical SEO, and measurable conversion.",
    },
    {
      icon: Workflow,
      href: routePath("automation", locale),
      title: es ? "Automatización" : "Automation",
      body: es
        ? "Workflows de seguimiento, traspasos, avisos e integraciones alrededor de reglas claras."
        : "Follow-up, handoff, notification, and integration workflows built around clear rules.",
    },
    {
      icon: Bot,
      href: routePath("agents", locale),
      title: es ? "Agentes de IA" : "AI agents",
      body: es
        ? "Voz y texto conectados a tools controladas, confirmaciones y handoff humano."
        : "Voice and text connected to controlled tools, confirmations, and human handoff.",
    },
    {
      icon: Code2,
      href: routePath("software", locale),
      title: es ? "Software e integraciones" : "Software and integrations",
      body: es
        ? "Aplicaciones y APIs específicas cuando las herramientas genéricas dejan una brecha real."
        : "Focused applications and APIs when generic software leaves a real operational gap.",
    },
  ];

  return (
    <Section className="pt-0">
      <Container>
        <div className="grid gap-4 md:grid-cols-2">
          {services.map(({ icon: Icon, href, title, body }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border border-line bg-white p-7 transition hover:-translate-y-1 hover:border-larimar-deep/30 hover:shadow-lg"
            >
              <Icon className="h-11 w-11 rounded-xl bg-primary p-2.5 text-white" />
              <h3 className="mt-5 font-display text-2xl font-bold text-primary">{title}</h3>
              <p className="mt-2 leading-relaxed text-text-2">{body}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-amber-deep">
                {es ? "Explorar servicio" : "Explore service"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </Section>
  );
}

function ContactCta({ locale }: { locale: Locale }) {
  const es = locale === "es";
  const home = routePath("home", locale);
  return (
    <Section className="bg-primary py-20 text-white">
      <Container className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <Reveal>
          <div>
            <Eyebrow tone="dark">{es ? "Siguiente paso" : "Next step"}</Eyebrow>
            <h2 className="mt-4 max-w-[18ch] font-display text-[clamp(30px,4vw,46px)] font-bold leading-tight">
              {es ? "Muéstranos cómo funciona hoy." : "Show us how it works today."}
            </h2>
            <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-white/70">
              {es
                ? "No necesitas llegar con una solución definida. Cuéntanos dónde se está perdiendo tiempo, clientes o control y empezamos desde ahí."
                : "You do not need to arrive with a solution already defined. Tell us where time, customers, or visibility are being lost and we start there."}
            </p>
          </div>
        </Reveal>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <a
            href={brand.publicPhoneHref}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-amber px-6 font-semibold text-white transition hover:bg-amber-deep"
          >
            <Phone className="h-4 w-4" /> {brand.publicPhoneDisplay}
          </a>
          <ButtonLink href={`${home}#${contactId(locale)}`} variant="on-dark-outline">
            {es ? "Contar mi caso" : "Tell us about it"}
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}

async function Resources({ locale, postSlug }: { locale: Locale; postSlug?: string }) {
  if (postSlug) {
    const post = await getPublishedPost(locale, postSlug);
    if (!post) notFound();
    const related = (await getPublishedPosts(locale))
      .filter((item) => item.slug !== post.slug && item.category === post.category)
      .slice(0, 2);
    const articlePath = resourcePath(locale, post.slug);
    const articleUrl = absoluteUrl(articlePath);
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt,
      datePublished: post.publishedAt,
      dateModified: post.publishedAt,
      inLanguage: locale,
      author: {
        "@type": "Person",
        name: brand.founder.name,
        url: absoluteUrl(routePath("about", locale)),
      },
      publisher: { "@id": `${brand.siteUrl}/#business` },
      mainEntityOfPage: articleUrl,
      ...(post.imageUrl ? { image: post.imageUrl } : {}),
    };
    const breadcrumbs = breadcrumbJsonLd([
      { name: locale === "es" ? "Inicio" : "Home", path: routePath("home", locale) },
      { name: locale === "es" ? "Recursos" : "Resources", path: routePath("resources", locale) },
      { name: post.title, path: articlePath },
    ]);

    return (
      <div lang={locale}>
        <Section className="bg-bg-2 py-16">
          <Container className="max-w-4xl">
            <Link
              href={routePath("resources", locale)}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-tech"
            >
              ← {locale === "es" ? "Todos los recursos" : "All resources"}
            </Link>
            <span className="mt-5 block text-xs font-semibold uppercase tracking-wider text-amber-deep">
              {post.category}
            </span>
            <h1 className="mt-3 max-w-[22ch] font-display text-[clamp(34px,5vw,52px)] font-bold leading-tight text-primary">
              {post.title}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-text-2">{post.excerpt}</p>
            <div className="mt-5 text-sm text-mute">
              <time dateTime={post.publishedAt}>
                {new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
                  new Date(post.publishedAt),
                )}
              </time>{" "}
              · {post.readingMinutes} min
            </div>
          </Container>
        </Section>
        {post.imageUrl ? (
          <Container className="-mt-8">
            <div className="relative aspect-[16/7] overflow-hidden rounded-2xl border border-line bg-bg-3">
              <Image
                src={post.imageUrl}
                alt={post.imageAlt || ""}
                fill
                unoptimized
                priority
                className="object-cover"
              />
            </div>
          </Container>
        ) : null}
        <Section className="pt-12">
          <Container className="max-w-3xl">
            <article className="prose prose-slate max-w-none prose-headings:font-display prose-headings:text-primary prose-a:text-tech">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
            </article>
          </Container>
        </Section>
        {related.length ? (
          <Section className="bg-bg-2">
            <Container>
              <h2 className="font-display text-2xl font-bold text-primary">
                {locale === "es" ? "Continúa explorando" : "Keep exploring"}
              </h2>
              <ResourceGrid posts={related} locale={locale} />
            </Container>
          </Section>
        ) : null}
        <ContactCta locale={locale} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, "\\u003c") }}
        />
      </div>
    );
  }

  const posts = await getPublishedPosts(locale);
  const breadcrumbs = serviceBreadcrumbs("resources", locale);
  return (
    <div lang={locale}>
      <Section className="bg-bg-2">
        <Container>
          <SectionHead
            eyebrow={locale === "es" ? "Recursos" : "Resources"}
            title={
              locale === "es"
                ? "Ideas prácticas para mejorar cómo opera tu empresa."
                : "Practical ideas to improve how your company operates."
            }
            lede={
              locale === "es"
                ? "Guías sobre automatización, IA, sistemas y presencia digital escritas para ayudar a tomar decisiones, no para llenar un calendario editorial."
                : "Guides on automation, AI, systems, and digital presence written to support decisions—not to fill an editorial calendar."
            }
          />
          <ResourceGrid posts={posts} locale={locale} />
        </Container>
      </Section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}

function About({ locale }: { locale: Locale }) {
  const es = locale === "es";
  const breadcrumbs = serviceBreadcrumbs("about", locale);
  return (
    <div lang={locale}>
      <Section>
        <Container className="grid items-start gap-12 lg:grid-cols-[340px_1fr]">
          <Reveal>
            <div className="relative aspect-square overflow-hidden rounded-2xl shadow-xl">
              <Image
                src={brand.founder.image}
                alt={brand.founder.name}
                fill
                sizes="(min-width: 1024px) 340px, 100vw"
                className="object-cover"
                priority
              />
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <div>
              <Eyebrow>{es ? "Nosotros" : "About"}</Eyebrow>
              <h1 className="mt-4 font-display text-[clamp(38px,5vw,58px)] font-bold leading-tight text-primary">
                {brand.founder.name}
              </h1>
              <p className="mt-2 text-lg font-semibold text-amber-deep">
                {es ? brand.founder.role : "Founder and systems & automation consultant"}
              </p>
              <p className="mt-6 max-w-[62ch] text-lg leading-relaxed text-text-2">
                {es
                  ? "Julio dirige QuisqueyaTech y participa directamente en el levantamiento, el diseño de soluciones y la relación con cada empresa. La firma trabaja desde Puerto Plata, República Dominicana, con un principio sencillo: entender la operación antes de recomendar tecnología."
                  : "Julio leads QuisqueyaTech and works directly on discovery, solution design, and each company relationship. The firm operates from Puerto Plata, Dominican Republic, with a simple principle: understand the operation before recommending technology."}
              </p>
              <p className="mt-5 max-w-[62ch] leading-relaxed text-text-2">
                {es
                  ? "El trabajo puede incluir sitios web y SEO, automatizaciones, agentes de IA, integraciones o software específico. La herramienta cambia; el criterio se mantiene: resolver una fricción real y poder explicar qué resultado esperamos mejorar."
                  : "The work may include websites and SEO, automation, AI agents, integrations, or focused software. The tool changes; the principle stays the same: solve real friction and be able to explain which outcome the work is expected to improve."}
              </p>
              <a
                href={brand.founder.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="interactive-link mt-6 inline-flex min-h-11 items-center font-semibold text-tech"
              >
                LinkedIn <ArrowRight className="motion-arrow ml-2 h-4 w-4" />
              </a>
            </div>
          </Reveal>
        </Container>
      </Section>
      <ContactCta locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd()).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}

function Privacy({ locale }: { locale: Locale }) {
  const es = locale === "es";
  const breadcrumbs = serviceBreadcrumbs("privacy", locale);
  return (
    <div lang={locale}>
      <Section>
        <Container className="max-w-3xl">
          <Reveal>
            <h1 className="font-display text-4xl font-bold text-primary">
              {es ? "Política de privacidad" : "Privacy policy"}
            </h1>
            <p className="mt-4 text-text-2">
              {es ? "Última actualización: agosto de 2026." : "Last updated: August 2026."}
            </p>
            <PrivacySections english={!es} />
          </Reveal>
        </Container>
      </Section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}
