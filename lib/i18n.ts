import {
  alternateCaseStudyPath,
  alternateKnownResourcePath,
  alternateStaticPath,
  getStaticRouteByPath,
  localizedRoutes,
  resourcePath,
  routePath,
  type SiteLocale,
} from "@/lib/routes";

export type Locale = SiteLocale;

export function localeFromPath(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "es";
}

/**
 * Locale-aware helper for callers that still pass a Spanish canonical path.
 * Prefer routePath()/resourcePath() for new code because translated slugs are explicit there.
 */
export function withLocale(locale: Locale, path = "/"): string {
  if (locale === "es") return path;
  const staticRoute = getStaticRouteByPath(path);
  if (staticRoute) return localizedRoutes[staticRoute.key].en;
  if (path === "/") return routePath("home", "en");
  return `/en${path}`;
}

export function alternatePath(pathname: string): string {
  const staticPath = alternateStaticPath(pathname);
  if (staticPath) return staticPath;

  const casePath = alternateCaseStudyPath(pathname);
  if (casePath) return casePath;

  const knownResourcePath = alternateKnownResourcePath(pathname);
  if (knownResourcePath) return knownResourcePath;

  // For a CMS article whose translated slug is not available in client code,
  // send the visitor to the other language's resource index instead of inventing
  // a mixed-language or non-existent URL. Server metadata still resolves exact
  // article counterparts through translationKey.
  if (
    pathname.startsWith(`${routePath("resources", "es")}/`) ||
    pathname.startsWith(`${routePath("resources", "en")}/`)
  ) {
    return routePath("resources", localeFromPath(pathname) === "en" ? "es" : "en");
  }

  return localeFromPath(pathname) === "en"
    ? pathname.replace(/^\/en(?=\/|$)/, "") || "/"
    : `/en${pathname}`;
}

export { resourcePath, routePath };

export const uiCopy = {
  es: {
    solutions: "Soluciones",
    method: "Cómo trabajamos",
    resources: "Recursos",
    about: "Nosotros",
    assessment: "Contacto",
    language: "EN",
    menu: "Abrir menú",
    close: "Cerrar menú",
  },
  en: {
    solutions: "Solutions",
    method: "How we work",
    resources: "Resources",
    about: "About",
    assessment: "Contact",
    language: "ES",
    menu: "Open menu",
    close: "Close menu",
  },
} as const;
