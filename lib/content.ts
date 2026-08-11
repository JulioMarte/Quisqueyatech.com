import type { Locale } from "@/lib/i18n";

export type ResourcePost = {
  _id?: string;
  locale: Locale;
  slug: string;
  translationKey?: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  readingMinutes: number;
  body: string;
  imageUrl?: string | null;
  imageAlt?: string;
  seoTitle?: string;
  seoDescription?: string;
  featured?: boolean;
};

export const seedPosts: ResourcePost[] = [
  {
    locale: "es",
    slug: "como-detectar-procesos-que-conviene-automatizar",
    translationKey: "automation-candidates",
    title: "Cómo detectar qué procesos conviene automatizar primero",
    excerpt:
      "Una guía práctica para separar los cuellos de botella reales de las automatizaciones que solo se ven interesantes.",
    category: "Automatización",
    publishedAt: "2026-07-13",
    readingMinutes: 6,
    body: `## Empieza por el proceso, no por la herramienta

Una automatización útil resuelve un problema repetible y medible. Antes de elegir software, documenta qué inicia el proceso, quién interviene, qué información se mueve y dónde se detiene.

## Cuatro señales claras

- El equipo copia la misma información entre sistemas.
- Una tarea depende de que alguien la recuerde.
- Los clientes esperan por una validación interna sencilla.
- Preparar un reporte exige reunir datos manualmente.

## Prioriza impacto y estabilidad

El mejor primer proyecto suele tener volumen suficiente, reglas relativamente estables y un responsable claro. Evita comenzar por el proceso más complejo de la empresa: comienza por uno que permita demostrar valor y aprender sin poner en riesgo la operación.

## Qué debería pasar antes de construir

Documenta el flujo actual, identifica dónde se pierde tiempo o una oportunidad y define qué resultado demostraría que el cambio funcionó. Si todavía no puedes describir ese resultado, probablemente es pronto para automatizar.

QuisqueyaTech parte de esa conversación: entender cómo funciona el negocio antes de decidir si la respuesta correcta es automatización, una mejora web, una integración o software específico.`,
  },
  {
    locale: "en",
    slug: "how-to-find-the-right-processes-to-automate",
    translationKey: "automation-candidates",
    title: "How to find the right processes to automate first",
    excerpt:
      "A practical way to separate high-value workflow improvements from automation that merely looks impressive.",
    category: "Automation",
    publishedAt: "2026-07-13",
    readingMinutes: 6,
    body: `## Start with the process, not the tool

Useful automation fixes a repeatable, measurable problem. Before choosing software, document what starts the process, who is involved, which information moves, and where work gets stuck.

## Four strong signals

- Your team copies the same information between systems.
- A task depends on someone remembering it.
- Customers wait for a simple internal validation.
- Reporting requires manually collecting data.

## Prioritize impact and stability

The best first project usually has enough volume, stable rules, and a clear owner. Do not begin with the most complicated workflow in the company. Start with one that can prove value without putting operations at risk.

## What should happen before you build

Document the current workflow, identify where time or an opportunity is being lost, and define which outcome would prove the change worked. If that outcome is still unclear, it is probably too early to automate.

QuisqueyaTech starts with that conversation: understand how the business works before deciding whether the right answer is automation, a better website, an integration, or focused software.`,
  },
];

export function postsForLocale(locale: Locale) {
  return seedPosts.filter((post) => post.locale === locale);
}

export function findPost(locale: Locale, slug: string) {
  return seedPosts.find((post) => post.locale === locale && post.slug === slug);
}
