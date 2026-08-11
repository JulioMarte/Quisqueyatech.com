import type { Metadata } from "next";
import { brand } from "@/lib/brand";

export const seo = {
  homeEs: {
    title: "Tecnología y sistemas para empresas | QuisqueyaTech",
    description:
      "QuisqueyaTech analiza cómo funciona tu negocio y construye sitios web, automatizaciones, IA e integraciones para reducir fricción, captar mejor y medir resultados.",
    url: brand.siteUrl,
    locale: "es_DO",
    image: "/og/home-hero-v2.png",
  },
  homeEn: {
    title: "Business systems, web, automation and AI | QuisqueyaTech",
    description:
      "QuisqueyaTech learns how your business works and builds websites, automation, AI and integrations that reduce friction, improve lead handling and make results measurable.",
    url: `${brand.siteUrl}/en`,
    locale: "en_US",
    image: "/og/home-hero-v2.png",
  },
} as const;

type SeoPage = {
  title: string;
  description: string;
  url: string;
  locale: string;
  image?: string;
};

export function pageMetadata(page: SeoPage): Metadata {
  const image = new URL(page.image || "/og/home-hero-v2.png", brand.siteUrl).toString();

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

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${brand.siteUrl}/#business`,
  name: brand.name,
  description: seo.homeEs.description,
  url: brand.siteUrl,
  email: brand.publicEmail,
  ...(brand.publicPhoneDisplay ? { telephone: brand.publicPhoneDisplay } : {}),
  logo: `${brand.siteUrl}/brand/logo-mark-512.png`,
  founder: { "@type": "Person", name: brand.founder.name, jobTitle: brand.founder.role },
  address: { "@type": "PostalAddress", addressLocality: "Puerto Plata", addressCountry: "DO" },
  areaServed: ["DO", "US", "Worldwide"],
  sameAs: [brand.social.instagram, brand.social.facebook, brand.social.x, brand.founder.linkedIn],
};
