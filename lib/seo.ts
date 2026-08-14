import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import { localizedRoutes, routePath, type SiteLocale, type StaticRouteKey } from "@/lib/routes";

export type SeoDefinition = {
  title: string;
  description: string;
  image?: string;
};

export const seoPages: Record<StaticRouteKey, Record<SiteLocale, SeoDefinition>> = {
  home: {
    es: {
      title: "Tecnología y sistemas para empresas",
      description:
        "QuisqueyaTech analiza cómo funciona tu negocio y construye sitios web, automatizaciones, IA e integraciones para reducir fricción, captar mejor y medir resultados.",
    },
    en: {
      title: "Business systems, web, automation and AI",
      description:
        "QuisqueyaTech learns how your business works and builds websites, automation, AI and integrations that reduce friction, improve lead handling and make results measurable.",
    },
  },
  solutions: {
    es: {
      title: "Soluciones tecnológicas para empresas",
      description:
        "Web, SEO, automatización, IA y software a medida diseñados alrededor del proceso real de tu empresa, no de una lista de herramientas.",
    },
    en: {
      title: "Technology solutions for businesses",
      description:
        "Web, SEO, automation, AI, and custom software designed around how your business actually works—not around a list of tools.",
    },
  },
  webSeo: {
    es: {
      title: "Sitios web y SEO orientados a negocio",
      description:
        "Diseñamos sitios web rápidos, claros y medibles para convertir búsquedas y visitas en conversaciones, leads y oportunidades reales.",
    },
    en: {
      title: "Business-focused websites and SEO",
      description:
        "We build fast, clear, measurable websites designed to turn search visibility and visits into conversations, leads, and real opportunities.",
    },
  },
  automation: {
    es: {
      title: "Automatización de procesos para empresas",
      description:
        "Automatizamos seguimientos, traspasos, tareas y reportes cuando el trabajo repetitivo está costando tiempo, errores u oportunidades.",
    },
    en: {
      title: "Business process automation",
      description:
        "We automate follow-up, handoffs, recurring tasks, and reporting when manual work is costing time, accuracy, or opportunities.",
    },
  },
  agents: {
    es: {
      title: "Agentes de IA para atención y operaciones",
      description:
        "Agentes de voz y texto para responder, recopilar información y ejecutar acciones permitidas dentro de workflows y límites claros.",
    },
    en: {
      title: "AI agents for customer service and operations",
      description:
        "Voice and text agents that respond, collect information, and perform approved actions within clear workflows and guardrails.",
    },
  },
  software: {
    es: {
      title: "Software a medida e integraciones",
      description:
        "Integramos las herramientas que ya usas y construimos software específico cuando una plataforma genérica no encaja con el proceso.",
    },
    en: {
      title: "Custom software and integrations",
      description:
        "We connect the tools you already use and build focused software when generic platforms do not fit the workflow.",
    },
  },
  clinics: {
    es: {
      title: "Sistemas y automatización para clínicas",
      description:
        "Aplicaciones posibles de recepción, seguimiento, agenda e información para clínicas. Evaluamos cada operación antes de recomendar tecnología.",
    },
    en: {
      title: "Systems and automation for clinics",
      description:
        "Potential applications for intake, follow-up, scheduling, and information workflows. We assess each operation before recommending technology.",
    },
  },
  method: {
    es: {
      title: "Cómo trabajamos",
      description:
        "Entender, priorizar, construir y medir: el proceso de QuisqueyaTech para resolver problemas operativos con tecnología sin añadir complejidad innecesaria.",
    },
    en: {
      title: "How we work",
      description:
        "Understand, prioritize, build, and measure: QuisqueyaTech's process for solving operational problems with technology without adding unnecessary complexity.",
    },
  },
  resources: {
    es: {
      title: "Recursos sobre sistemas, automatización, IA y web",
      description:
        "Guías prácticas de QuisqueyaTech para tomar mejores decisiones sobre automatización, IA, presencia digital e integración de sistemas.",
    },
    en: {
      title: "Resources on systems, automation, AI and web",
      description:
        "Practical QuisqueyaTech guides for better decisions about automation, AI, digital presence, and systems integration.",
    },
  },
  about: {
    es: {
      title: "Nosotros",
      description:
        "Conoce el enfoque de QuisqueyaTech: entender primero cómo funciona el negocio y construir después la tecnología que realmente necesita.",
    },
    en: {
      title: "About QuisqueyaTech",
      description:
        "Learn how QuisqueyaTech works: understand the business first, then build the technology it actually needs.",
    },
  },
  privacy: {
    es: {
      title: "Política de privacidad",
      description: "Política de privacidad y tratamiento de datos de QuisqueyaTech.",
    },
    en: {
      title: "Privacy policy",
      description: "QuisqueyaTech privacy and data handling policy.",
    },
  },
  caseStudies: {
    es: {
      title: "Casos y trabajo seleccionado",
      description:
        "Proyectos de QuisqueyaTech explicados por contexto, objetivo y trabajo realizado, sin métricas ni resultados inventados.",
    },
    en: {
      title: "Case studies and selected work",
      description:
        "QuisqueyaTech projects explained through context, objective, and delivered work—without invented metrics or performance claims.",
    },
  },
};

// Backward-compatible names while older pages are migrated to localizedPageMetadata().
export const seo = {
  homeEs: {
    ...seoPages.home.es,
    url: brand.siteUrl,
    locale: "es_DO",
    image: "/og/home-hero-v2.png",
  },
  homeEn: {
    ...seoPages.home.en,
    url: `${brand.siteUrl}/en`,
    locale: "en_US",
    image: "/og/home-hero-v2.png",
  },
} as const;

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${brand.siteUrl}${path === "/" ? "" : path.startsWith("/") ? path : `/${path}`}`;
}

export function localizedAlternates(esPath: string, enPath: string, canonicalLocale: SiteLocale) {
  const es = absoluteUrl(esPath);
  const en = absoluteUrl(enPath);
  return {
    canonical: canonicalLocale === "es" ? es : en,
    languages: {
      es,
      en,
      "x-default": es,
    },
  } as const;
}

export function localizedPageMetadata(
  key: StaticRouteKey,
  locale: SiteLocale,
  image = "/og/home-hero-v2.png",
): Metadata {
  const page = seoPages[key][locale];
  const paths = localizedRoutes[key];
  const canonical = absoluteUrl(paths[locale]);
  const imageUrl = absoluteUrl(image);
  const alternateLocale = locale === "es" ? "en_US" : "es_DO";

  return {
    title: page.title,
    description: page.description,
    alternates: localizedAlternates(paths.es, paths.en, locale),
    openGraph: {
      type: "website",
      locale: locale === "es" ? "es_DO" : "en_US",
      alternateLocale: [alternateLocale],
      url: canonical,
      siteName: brand.name,
      title: page.title,
      description: page.description,
      images: [{ url: imageUrl, width: 1200, height: 630, type: "image/png", alt: page.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: [imageUrl],
    },
  };
}

type LegacySeoPage = {
  title: string;
  description: string;
  url: string;
  locale: string;
  image?: string;
};

export function pageMetadata(page: LegacySeoPage): Metadata {
  const image = absoluteUrl(page.image || "/og/home-hero-v2.png");
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.url },
    openGraph: {
      type: "website",
      locale: page.locale,
      url: page.url,
      siteName: brand.name,
      title: page.title,
      description: page.description,
      images: [{ url: image, width: 1200, height: 630, type: "image/png", alt: page.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: [image],
    },
  };
}

export function breadcrumbJsonLd(items: readonly { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${brand.siteUrl}/#business`,
  name: brand.name,
  description: seoPages.home.es.description,
  url: brand.siteUrl,
  email: brand.publicEmail,
  telephone: brand.publicPhoneE164,
  logo: `${brand.siteUrl}/brand/logo-mark-512.png`,
  founder: {
    "@type": "Person",
    name: brand.founder.name,
    jobTitle: brand.founder.role,
    sameAs: brand.founder.linkedIn,
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "sales",
    telephone: brand.publicPhoneE164,
    email: brand.publicEmail,
    availableLanguage: ["Spanish", "English"],
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Puerto Plata",
    addressCountry: "DO",
  },
  areaServed: ["DO", "US", "Worldwide"],
  sameAs: [brand.social.instagram, brand.social.facebook, brand.social.x, brand.founder.linkedIn],
};

export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${brand.siteUrl}/nosotros#founder`,
    name: brand.founder.name,
    jobTitle: brand.founder.role,
    worksFor: { "@id": `${brand.siteUrl}/#business` },
    sameAs: [brand.founder.linkedIn],
  };
}

export function serviceBreadcrumbs(key: StaticRouteKey, locale: SiteLocale) {
  const homeName = locale === "es" ? "Inicio" : "Home";
  const currentName = seoPages[key][locale].title;
  if (key === "home")
    return breadcrumbJsonLd([{ name: homeName, path: routePath("home", locale) }]);
  return breadcrumbJsonLd([
    { name: homeName, path: routePath("home", locale) },
    { name: currentName, path: routePath(key, locale) },
  ]);
}
