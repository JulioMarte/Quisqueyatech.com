import type { Metadata } from "next";
import { brand } from "@/lib/brand";

export const seo = {
  home: {
    title: "QuisqueyaTech - Orden operativo para PYMES dominicanas",
    description:
      "Consultoría para PYMES dominicanas que quieren ordenar WhatsApp, citas, seguimiento, tareas repetitivas y reportes. Evaluación inicial gratis.",
    url: brand.siteUrl,
    image: "/og/home.png",
  },
  clinicas: {
    title: "Citas y seguimiento para clínicas y odontólogos en RD",
    description:
      "Ordenamos WhatsApp, agenda, recordatorios y seguimiento de pacientes para clínicas y odontólogos en República Dominicana. Evaluación inicial gratis.",
    url: `${brand.siteUrl}/clinicas`,
    image: "/og/clinicas.png",
  },
} as const;

export const baseKeywords = [
  "automatización PYMES República Dominicana",
  "WhatsApp clínicas República Dominicana",
  "consultoría operativa RD",
  "QuisqueyaTech",
  "seguimiento de clientes RD",
  "agenda para clínicas RD",
];

export function pageMetadata(page: typeof seo.home | typeof seo.clinicas): Metadata {
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.url },
    openGraph: {
      type: "website",
      locale: "es_DO",
      url: page.url,
      siteName: brand.name,
      title: page.title,
      description: page.description,
      images: [
        {
          url: page.image,
          width: 1200,
          height: 630,
          alt: `${brand.name} - ${page.title}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: [page.image],
    },
  };
}

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ProfessionalService",
      "@id": `${brand.siteUrl}/#business`,
      name: brand.name,
      description:
        "Consultoría operativa para PYMES dominicanas que quieren ordenar atención, seguimiento, citas y reportes.",
      url: brand.siteUrl,
      email: brand.email,
      image: `${brand.siteUrl}/og/home.png`,
      logo: `${brand.siteUrl}/brand/logo-mark-512.png`,
      slogan: brand.tagline,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Puerto Plata",
        addressCountry: "DO",
      },
      areaServed: {
        "@type": "Country",
        name: "República Dominicana",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${brand.siteUrl}/#website`,
      name: brand.name,
      url: brand.siteUrl,
      inLanguage: "es-DO",
      publisher: { "@id": `${brand.siteUrl}/#business` },
      description: seo.home.description,
    },
    {
      "@type": "Service",
      "@id": `${brand.siteUrl}/#service`,
      name: "Consultoría operativa para PYMES",
      serviceType: "Orden operativo, seguimiento de clientes, agenda y automatización",
      provider: { "@id": `${brand.siteUrl}/#business` },
      areaServed: {
        "@type": "Country",
        name: "República Dominicana",
      },
      description:
        "Diagnóstico e implementación de sistemas para ordenar WhatsApp, agenda, seguimiento, tareas repetitivas y reportes.",
    },
  ],
};

export const homeFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Necesito cambiar lo que uso ahora?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No necesariamente. Primero miramos lo que ya tienes. Solo recomendamos cambiar algo cuando claramente está causando el desorden.",
      },
    },
    {
      "@type": "Question",
      name: "¿La inteligencia artificial reemplaza a mi personal?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Se usa para preguntas repetidas y tareas mecánicas. Las ventas, los casos delicados y las decisiones siguen siendo humanas.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cuánto tarda un proyecto?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Una implementación corta para resolver un problema específico suele tomar 7-21 días. Un sistema más completo puede tomar 4-12 semanas, según el alcance.",
      },
    },
  ],
};

export const clinicServiceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${brand.siteUrl}/clinicas#service`,
  name: "Citas y seguimiento para clínicas y odontólogos",
  serviceType: "Orden de recepción, agenda, recordatorios y seguimiento de pacientes",
  provider: { "@id": `${brand.siteUrl}/#business` },
  areaServed: {
    "@type": "Country",
    name: "República Dominicana",
  },
  description: seo.clinicas.description,
  url: seo.clinicas.url,
};
