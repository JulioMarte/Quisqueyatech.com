import type { Locale } from "../types/ui";

export const siteConfig = {
  name: "QuisqueyaTech",
  descriptor: "Automatización, IA y software para empresas",
  defaultUrl: "https://www.quisqueyatech.com",
  defaultEmail: "info@quisqueyatech.com",
  location: "Puerto Plata, República Dominicana",
  founder: {
    name: "Julio Alberto Marte Balbuena",
    roleEs: "Fundador y consultor de automatización e IA",
    roleEn: "Founder and automation & AI consultant",
    linkedIn: "https://www.linkedin.com/in/julio-alberto-marte-balbuena-5454a072",
  },
  social: {
    instagram: "https://instagram.com/quisqueyait",
    facebook: "https://facebook.com/quisqueyait",
    x: "https://x.com/quisqueyait",
  },
} as const;

export const routePairs = {
  "/": "/en",
  "/soluciones": "/en/solutions",
  "/soluciones/automatizacion": "/en/solutions/automation",
  "/soluciones/agentes-de-ia": "/en/solutions/ai-agents",
  "/soluciones/software-e-integraciones": "/en/solutions/software-and-integrations",
  "/soluciones/clinicas": "/en/solutions/clinics",
  "/como-trabajamos": "/en/how-we-work",
  "/evaluacion": "/en/assessment",
  "/evaluacion/ahora": "/en/assessment/now",
  "/evaluacion/agendar": "/en/assessment/schedule",
  "/recursos": "/en/recursos",
  "/nosotros": "/en/about",
  "/privacidad": "/en/privacy",
} as const satisfies Record<string, string>;

export const localizedRoutes = {
  es: {
    root: "/",
    solutions: "/soluciones",
    method: "/como-trabajamos",
    resources: "/recursos",
    about: "/nosotros",
    assessment: "/evaluacion",
    assessmentNow: "/evaluacion/ahora",
    assessmentSchedule: "/evaluacion/agendar",
    privacy: "/privacidad",
  },
  en: {
    root: "/en",
    solutions: "/en/solutions",
    method: "/en/how-we-work",
    resources: "/en/recursos",
    about: "/en/about",
    assessment: "/en/assessment",
    assessmentNow: "/en/assessment/now",
    assessmentSchedule: "/en/assessment/schedule",
    privacy: "/en/privacy",
  },
} as const satisfies Record<Locale, Record<string, string>>;

export function getAlternatePath(path: string, locale: Locale): string {
  const reversePairs = Object.fromEntries(Object.entries(routePairs).map(([es, en]) => [en, es]));
  return routePairs[path as keyof typeof routePairs]
    || reversePairs[path]
    || (locale === "en" ? path.replace(/^\/en(?=\/|$)/, "") || "/" : `/en${path}`);
}
