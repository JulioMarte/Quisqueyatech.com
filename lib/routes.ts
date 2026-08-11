export type SiteLocale = "es" | "en";

export type StaticRouteKey =
  | "home"
  | "solutions"
  | "webSeo"
  | "automation"
  | "agents"
  | "software"
  | "clinics"
  | "method"
  | "resources"
  | "about"
  | "privacy"
  | "caseStudies";

export const localizedRoutes: Record<StaticRouteKey, Record<SiteLocale, string>> = {
  home: { es: "/", en: "/en" },
  solutions: { es: "/soluciones", en: "/en/solutions" },
  webSeo: {
    es: "/soluciones/sitios-web-y-seo",
    en: "/en/solutions/websites-and-seo",
  },
  automation: {
    es: "/soluciones/automatizacion",
    en: "/en/solutions/automation",
  },
  agents: {
    es: "/soluciones/agentes-de-ia",
    en: "/en/solutions/ai-agents",
  },
  software: {
    es: "/soluciones/software-e-integraciones",
    en: "/en/solutions/software-and-integrations",
  },
  clinics: {
    es: "/soluciones/clinicas",
    en: "/en/solutions/clinics",
  },
  method: { es: "/como-trabajamos", en: "/en/how-we-work" },
  resources: { es: "/recursos", en: "/en/resources" },
  about: { es: "/nosotros", en: "/en/about" },
  privacy: { es: "/privacidad", en: "/en/privacy" },
  caseStudies: { es: "/casos", en: "/en/case-studies" },
};

export function routePath(key: StaticRouteKey, locale: SiteLocale): string {
  return localizedRoutes[key][locale];
}

export function resourcePath(locale: SiteLocale, slug: string): string {
  return `${localizedRoutes.resources[locale]}/${encodeURIComponent(slug)}`;
}

export type CaseStudyKey =
  | "connections-rd"
  | "the-vocal-room-academy"
  | "dominican-consulate-boston";

export const caseStudySlugs: Record<CaseStudyKey, Record<SiteLocale, string>> = {
  "connections-rd": {
    es: "connections-rd",
    en: "connections-rd",
  },
  "the-vocal-room-academy": {
    es: "the-vocal-room-academy",
    en: "the-vocal-room-academy",
  },
  "dominican-consulate-boston": {
    es: "consulado-dominicano-boston",
    en: "dominican-consulate-boston",
  },
};

export function caseStudyPath(key: CaseStudyKey, locale: SiteLocale): string {
  return `${localizedRoutes.caseStudies[locale]}/${caseStudySlugs[key][locale]}`;
}

export function getStaticRouteByPath(pathname: string): {
  key: StaticRouteKey;
  locale: SiteLocale;
} | null {
  for (const [key, paths] of Object.entries(localizedRoutes) as [
    StaticRouteKey,
    Record<SiteLocale, string>,
  ][]) {
    if (paths.es === pathname) return { key, locale: "es" };
    if (paths.en === pathname) return { key, locale: "en" };
  }
  return null;
}

export function alternateStaticPath(pathname: string): string | null {
  const route = getStaticRouteByPath(pathname);
  if (!route) return null;
  return localizedRoutes[route.key][route.locale === "es" ? "en" : "es"];
}

export function getCaseStudyByPath(pathname: string): {
  key: CaseStudyKey;
  locale: SiteLocale;
} | null {
  for (const key of Object.keys(caseStudySlugs) as CaseStudyKey[]) {
    if (caseStudyPath(key, "es") === pathname) return { key, locale: "es" };
    if (caseStudyPath(key, "en") === pathname) return { key, locale: "en" };
  }
  return null;
}

export function alternateCaseStudyPath(pathname: string): string | null {
  const route = getCaseStudyByPath(pathname);
  if (!route) return null;
  return caseStudyPath(route.key, route.locale === "es" ? "en" : "es");
}

// Known translated article slugs used when the language switch runs entirely on the client.
// CMS-backed articles can still resolve their counterpart server-side through translationKey.
const knownResourceSlugPairs: readonly [string, string][] = [
  [
    "como-detectar-procesos-que-conviene-automatizar",
    "how-to-find-the-right-processes-to-automate",
  ],
];

export function alternateKnownResourcePath(pathname: string): string | null {
  for (const [esSlug, enSlug] of knownResourceSlugPairs) {
    if (pathname === resourcePath("es", esSlug)) return resourcePath("en", enSlug);
    if (pathname === resourcePath("en", enSlug)) return resourcePath("es", esSlug);
  }
  return null;
}
