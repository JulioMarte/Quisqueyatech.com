import type { Locale } from "../types/ui";

export interface HomeCardContent {
  title: string;
  body: string;
  href?: string;
}

export interface HomeStepContent {
  number: string;
  title: string;
  body: string;
}

export interface HomeContent {
  meta: { title: string; description: string };
  hero: {
    eyebrow: string;
    primary: string;
    secondaryWords: readonly string[];
    ariaLabel: string;
    lede: string;
    primaryCta: string;
    secondaryCta: string;
    notes: readonly string[];
    sources: readonly string[];
    output: string;
  };
  problem: { eyebrow: string; title: string; description: string; cards: readonly HomeCardContent[] };
  solutions: { eyebrow: string; title: string; description: string; cards: readonly HomeCardContent[]; linkLabel: string };
  assessment: {
    eyebrow: string;
    title: string;
    description: string;
    voiceTitle: string;
    voiceMeta: string;
    bullets: readonly string[];
  };
  process: { eyebrow: string; title: string; steps: readonly HomeStepContent[] };
  founder: {
    eyebrow: string;
    title: string;
    description: string;
    role: string;
    cta: string;
  };
  resources: { eyebrow: string; title: string; description: string; cta: string };
  finalCta: { title: string; description: string };
}

export const homeContent: Record<Locale, HomeContent> = {
  es: {
    meta: {
      title: "Automatización, IA y software para empresas",
      description: "Evaluamos cómo opera tu equipo, detectamos dónde se pierde tiempo y diseñamos automatizaciones, agentes de IA y software que mejoran la productividad sin complicar la operación.",
    },
    hero: {
      eyebrow: "Automatización, IA y software para empresas",
      primary: "Tu empresa no necesita más herramientas.",
      secondaryWords: ["Necesita", "que", "trabajen", "juntas."],
      ariaLabel: "Tu empresa no necesita más herramientas. Necesita que trabajen juntas.",
      lede: "Evaluamos cómo opera tu equipo, detectamos dónde se pierde tiempo y diseñamos automatizaciones, agentes de IA y software que mejoran la productividad sin complicar la operación.",
      primaryCta: "Quiero mi evaluación ahora",
      secondaryCta: "Agendar mi evaluación",
      notes: ["Evaluación inicial sin costo", "Disponible en español e inglés", "Resumen preliminar inmediato"],
      sources: ["Automatización", "Agentes de IA", "Software"],
      output: "Un solo sistema",
    },
    problem: {
      eyebrow: "El problema no es la falta de tecnología",
      title: "El trabajo se frena cuando procesos, personas y herramientas operan por separado.",
      description: "No recomendamos software por moda. Buscamos dónde se repite trabajo, se pierde información o una decisión llega demasiado tarde.",
      cards: [
        { title: "Trabajo manual que se multiplica", body: "Datos copiados entre formularios, hojas de cálculo y sistemas que nunca se sincronizan." },
        { title: "Seguimientos que dependen de memoria", body: "Solicitudes, clientes y tareas importantes quedan sin un próximo paso visible." },
        { title: "Información difícil de convertir en decisiones", body: "Los reportes llegan tarde o requieren horas de preparación manual." },
      ],
    },
    solutions: {
      eyebrow: "Soluciones",
      title: "Tecnología aplicada a un resultado operativo claro.",
      description: "Podemos empezar con una mejora puntual o diseñar un sistema por fases. La herramienta se elige después de entender el proceso.",
      linkLabel: "Explorar solución",
      cards: [
        { title: "Automatización de procesos", body: "Conecta tareas repetitivas, aprobaciones, seguimiento y reportes para que el trabajo avance sin persecución constante.", href: "/soluciones/automatizacion" },
        { title: "Agentes de IA", body: "Agentes de voz o texto que recopilan información, atienden solicitudes y ejecutan tareas con límites definidos.", href: "/soluciones/agentes-de-ia" },
        { title: "Software e integraciones", body: "Aplicaciones e integraciones que unen los datos y herramientas que tu empresa ya utiliza.", href: "/soluciones/software-e-integraciones" },
      ],
    },
    assessment: {
      eyebrow: "Empieza con claridad",
      title: "Una evaluación que también demuestra lo que podemos construir.",
      description: "Nuestro agente de voz realiza un levantamiento estructurado de 12–15 minutos. Al terminar recibes tres oportunidades preliminares, su impacto esperado y un próximo paso claro.",
      voiceTitle: "Evaluación guiada por voz",
      voiceMeta: "12–15 min · ES / EN",
      bullets: ["Entiende tu proceso actual", "Detecta trabajo repetitivo", "Prioriza oportunidades", "Entrega un resumen inmediato"],
    },
    process: {
      eyebrow: "Cómo trabajamos",
      title: "Primero entendemos. Después diseñamos. Finalmente implementamos.",
      steps: [
        { number: "01", title: "Evaluar", body: "Identificamos procesos, fricción, herramientas y prioridades." },
        { number: "02", title: "Priorizar", body: "Separamos oportunidades reales de ideas que todavía no justifican inversión." },
        { number: "03", title: "Diseñar", body: "Definimos el flujo, los controles y la tecnología necesaria." },
        { number: "04", title: "Implementar", body: "Construimos, probamos, capacitamos y medimos con uso real." },
      ],
    },
    founder: {
      eyebrow: "Responsabilidad directa",
      title: "Una firma tecnológica con atención de fundador.",
      description: "Julio lidera las evaluaciones, el diseño de soluciones y la relación con cada empresa. QuisqueyaTech trabaja desde República Dominicana con empresas dentro y fuera del país.",
      role: "Fundador y consultor de automatización e IA",
      cta: "Conocer más",
    },
    resources: {
      eyebrow: "Recursos",
      title: "Recursos para tomar mejores decisiones tecnológicas",
      description: "Guías honestas sobre automatización, agentes de IA e integración de sistemas. Sin tendencias vacías ni promesas infladas.",
      cta: "Ver recursos",
    },
    finalCta: {
      title: "Descubre dónde la tecnología puede producir el mayor impacto.",
      description: "Completa la evaluación ahora o reserva el horario que te resulte más cómodo.",
    },
  },
  en: {
    meta: {
      title: "Automation, AI, and software for modern companies",
      description: "We examine how your team operates, find where time is lost, and design automation, AI agents, and software that improve productivity without adding operational complexity.",
    },
    hero: {
      eyebrow: "Automation, AI, and software for modern companies",
      primary: "Your business does not need more tools.",
      secondaryWords: ["It", "needs", "the", "right", "ones", "working", "together."],
      ariaLabel: "Your business does not need more tools. It needs the right ones working together.",
      lede: "We examine how your team operates, find where time is lost, and design automation, AI agents, and software that improve productivity without adding operational complexity.",
      primaryCta: "Start my assessment now",
      secondaryCta: "Schedule my assessment",
      notes: ["Free initial assessment", "Available in English and Spanish", "Immediate preliminary summary"],
      sources: ["Automation", "AI agents", "Software"],
      output: "One connected system",
    },
    problem: {
      eyebrow: "Technology is rarely the real problem",
      title: "Work slows down when processes, people, and tools operate separately.",
      description: "We do not recommend software because it is trending. We look for repeated work, missing information, and decisions that arrive too late.",
      cards: [
        { title: "Manual work keeps multiplying", body: "Data is copied between forms, spreadsheets, and systems that never stay in sync." },
        { title: "Follow-up depends on memory", body: "Requests, customers, and important tasks have no visible next step." },
        { title: "Information is hard to turn into decisions", body: "Reports arrive late or take hours of manual preparation." },
      ],
    },
    solutions: {
      eyebrow: "Solutions",
      title: "Technology tied to a clear operational outcome.",
      description: "Start with one targeted improvement or build a system in phases. We choose the technology after understanding the process.",
      linkLabel: "Explore solution",
      cards: [
        { title: "Process automation", body: "Connect recurring tasks, approvals, follow-up, and reporting so work keeps moving.", href: "/en/solutions/automation" },
        { title: "AI agents", body: "Voice and text agents that collect information, handle requests, and perform tasks within defined boundaries.", href: "/en/solutions/ai-agents" },
        { title: "Software and integrations", body: "Applications and integrations that connect the data and tools your company already uses.", href: "/en/solutions/software-and-integrations" },
      ],
    },
    assessment: {
      eyebrow: "Start with clarity",
      title: "An assessment that also demonstrates what we can build.",
      description: "Our voice agent runs a structured 12–15 minute discovery session. You receive three preliminary opportunities, expected impact, and a clear next step.",
      voiceTitle: "Voice-guided assessment",
      voiceMeta: "12–15 min · ES / EN",
      bullets: ["Understands your current process", "Finds repetitive work", "Prioritizes opportunities", "Delivers an immediate summary"],
    },
    process: {
      eyebrow: "How we work",
      title: "Understand first. Design second. Then implement.",
      steps: [
        { number: "01", title: "Assess", body: "Map processes, friction, tools, and priorities." },
        { number: "02", title: "Prioritize", body: "Separate real opportunities from ideas that do not justify investment yet." },
        { number: "03", title: "Design", body: "Define the workflow, controls, and technology required." },
        { number: "04", title: "Implement", body: "Build, test, train, and measure with real usage." },
      ],
    },
    founder: {
      eyebrow: "Direct accountability",
      title: "A technology firm with founder-level attention.",
      description: "Julio leads assessments, solution design, and each client relationship. QuisqueyaTech works from the Dominican Republic with companies at home and abroad.",
      role: "Founder and automation & AI consultant",
      cta: "Learn more",
    },
    resources: {
      eyebrow: "Resources",
      title: "Resources for better technology decisions",
      description: "Practical guidance on automation, AI agents, and systems integration—without empty trends or inflated promises.",
      cta: "View resources",
    },
    finalCta: {
      title: "Find where technology can create the greatest impact.",
      description: "Complete the assessment now or reserve a time that works for you.",
    },
  },
};
