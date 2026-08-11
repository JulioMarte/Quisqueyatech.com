import { caseStudyPath, type CaseStudyKey, type SiteLocale } from "@/lib/routes";

export type CaseStudy = {
  key: CaseStudyKey;
  client: string;
  liveUrl?: string;
  locale: Record<
    SiteLocale,
    {
      category: string;
      title: string;
      summary: string;
      context: string;
      objective: string;
      solution: string;
      deliverables: readonly string[];
    }
  >;
};

export const caseStudies: readonly CaseStudy[] = [
  {
    key: "connections-rd",
    client: "Connections RD",
    liveUrl: "https://connectionsrd.com",
    locale: {
      es: {
        category: "Experiencia web",
        title: "Una presencia digital más clara para presentar el proyecto y convertir interés en acción.",
        summary:
          "Trabajo de arquitectura de información, diseño responsive y desarrollo web para organizar la propuesta de valor y facilitar los próximos pasos del visitante.",
        context:
          "El proyecto necesitaba presentar una oferta inmobiliaria de forma visual, comprensible y orientada a personas que comparan ubicación, estilo de vida, planos y opciones de contacto.",
        objective:
          "Reducir la fricción entre descubrir el proyecto y tomar una acción concreta, sin convertir la experiencia en una colección de páginas aisladas.",
        solution:
          "Se estructuró la experiencia alrededor de la información que un prospecto necesita para avanzar: propuesta de valor, estilo de vida, planos, características, ubicación y contacto.",
        deliverables: [
          "Arquitectura de información",
          "Diseño responsive",
          "Desarrollo web",
          "Jerarquía de conversión y llamadas a la acción",
        ],
      },
      en: {
        category: "Web experience",
        title: "A clearer digital presence designed to present the project and move interest toward action.",
        summary:
          "Information architecture, responsive design, and web development organized around the value proposition and the visitor's next step.",
        context:
          "The project needed to present a real-estate offering in a visual, understandable way for people comparing location, lifestyle, floor plans, and contact options.",
        objective:
          "Reduce friction between discovering the project and taking a concrete action without turning the experience into a collection of disconnected pages.",
        solution:
          "The experience was structured around the information a prospect needs to move forward: value proposition, lifestyle, floor plans, features, location, and contact.",
        deliverables: [
          "Information architecture",
          "Responsive design",
          "Web development",
          "Conversion hierarchy and calls to action",
        ],
      },
    },
  },
  {
    key: "the-vocal-room-academy",
    client: "The Vocal Room Academy",
    liveUrl: "https://thevocalroomacademy.com",
    locale: {
      es: {
        category: "Web + flujo de inscripción",
        title: "Una experiencia enfocada en explicar la oferta y reducir fricción desde interés hasta inscripción.",
        summary:
          "Sitio web, flujo de registro y automatización operativa para conectar mejor la presentación del programa con el siguiente paso del estudiante.",
        context:
          "La experiencia debía comunicar una oferta formativa con claridad y, al mismo tiempo, facilitar que una persona interesada pudiera avanzar hacia el registro sin depender de instrucciones dispersas.",
        objective:
          "Acercar contenido, decisión e inscripción dentro de un recorrido más coherente y reducir trabajo manual alrededor del proceso.",
        solution:
          "Se combinó la presentación del programa con un flujo de inscripción y automatizaciones operativas, manteniendo una experiencia sencilla para el visitante.",
        deliverables: [
          "Sitio web",
          "Flujo de inscripción",
          "Automatización operativa",
          "Experiencia responsive",
        ],
      },
      en: {
        category: "Web + enrollment flow",
        title: "An experience focused on explaining the offer and reducing friction from interest to enrollment.",
        summary:
          "Website, registration flow, and operational automation connecting the program presentation with the student's next step.",
        context:
          "The experience needed to explain an educational offer clearly while making it easier for an interested person to move toward registration without relying on scattered instructions.",
        objective:
          "Bring content, decision, and enrollment into a more coherent journey while reducing manual work around the process.",
        solution:
          "The program presentation was combined with an enrollment flow and operational automation while keeping the visitor experience straightforward.",
        deliverables: [
          "Website",
          "Enrollment flow",
          "Operational automation",
          "Responsive experience",
        ],
      },
    },
  },
  {
    key: "dominican-consulate-boston",
    client: "Consulado Dominicano en Boston",
    locale: {
      es: {
        category: "Información pública",
        title: "Una experiencia web para organizar información institucional y facilitar el acceso a servicios y comunicaciones.",
        summary:
          "Trabajo en WordPress, estructura de contenido y operación digital orientado a presentar información institucional de forma más accesible.",
        context:
          "Un sitio institucional debe ayudar a las personas a localizar información y servicios rápidamente, incluso cuando el contenido cambia y diferentes áreas necesitan comunicar actualizaciones.",
        objective:
          "Organizar mejor la información pública y dar una base manejable para la comunicación digital de la institución.",
        solution:
          "Se trabajó sobre WordPress y la estructura de contenido para mantener una experiencia navegable y una operación editorial práctica.",
        deliverables: [
          "Implementación WordPress",
          "Estructura de contenido",
          "Operación digital",
          "Organización de información institucional",
        ],
      },
      en: {
        category: "Public information",
        title: "A web experience built to organize institutional information and make services and communications easier to access.",
        summary:
          "WordPress, content structure, and digital operations work focused on making institutional information easier to navigate.",
        context:
          "An institutional website needs to help people locate information and services quickly even as content changes and different areas need to publish updates.",
        objective:
          "Organize public information more clearly and provide a manageable foundation for the institution's digital communication.",
        solution:
          "The work focused on WordPress and content structure to maintain a navigable experience and practical editorial operation.",
        deliverables: [
          "WordPress implementation",
          "Content structure",
          "Digital operations",
          "Institutional information organization",
        ],
      },
    },
  },
] as const;

export function getCaseStudy(key: CaseStudyKey): CaseStudy | undefined {
  return caseStudies.find((study) => study.key === key);
}

export function caseStudyHref(key: CaseStudyKey, locale: SiteLocale): string {
  return caseStudyPath(key, locale);
}
