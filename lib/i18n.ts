export type Locale = "es" | "en";

export function localeFromPath(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "es";
}

export function withLocale(locale: Locale, path = "/"): string {
  if (locale === "es") return path;
  if (path === "/") return "/en";
  return `/en${path}`;
}

export function alternatePath(pathname: string): string {
  const pairs: Record<string, string> = {
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
    "/terminos-de-mensajeria": "/en/messaging-terms",
  };
  if (pairs[pathname]) return pairs[pathname];
  const reverse = Object.fromEntries(Object.entries(pairs).map(([es, en]) => [en, es]));
  if (reverse[pathname]) return reverse[pathname];
  return localeFromPath(pathname) === "en"
    ? pathname.replace(/^\/en(?=\/|$)/, "") || "/"
    : `/en${pathname}`;
}

export const uiCopy = {
  es: {
    solutions: "Soluciones",
    method: "Cómo trabajamos",
    resources: "Recursos",
    about: "Nosotros",
    assessment: "Quiero mi evaluación",
    language: "EN",
    menu: "Abrir menú",
    close: "Cerrar menú",
  },
  en: {
    solutions: "Solutions",
    method: "How we work",
    resources: "Resources",
    about: "About",
    assessment: "Get my assessment",
    language: "ES",
    menu: "Open menu",
    close: "Close menu",
  },
} as const;
