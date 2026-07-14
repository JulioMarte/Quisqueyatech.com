import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomePageContent } from "@/components/sections/home";
import { MarketingPage } from "@/components/pages/marketing-page";
import { brand } from "@/lib/brand";
import { getPublishedPost, getPublishedPosts } from "@/lib/server/content";

type Kind = Parameters<typeof MarketingPage>[0]["kind"];
type Route = { kind: Kind | "home"; locale: "es" | "en"; postSlug?: string };

function resolveRoute(parts: string[]): Route | null {
  const path = `/${parts.join("/")}`;
  const fixed: Record<string, Route> = {
    "/en": { kind: "home", locale: "en" },
    "/soluciones": { kind: "solutions", locale: "es" }, "/en/solutions": { kind: "solutions", locale: "en" },
    "/soluciones/automatizacion": { kind: "automation", locale: "es" }, "/en/solutions/automation": { kind: "automation", locale: "en" },
    "/soluciones/agentes-de-ia": { kind: "agents", locale: "es" }, "/en/solutions/ai-agents": { kind: "agents", locale: "en" },
    "/soluciones/software-e-integraciones": { kind: "software", locale: "es" }, "/en/solutions/software-and-integrations": { kind: "software", locale: "en" },
    "/soluciones/clinicas": { kind: "clinics", locale: "es" }, "/en/solutions/clinics": { kind: "clinics", locale: "en" },
    "/como-trabajamos": { kind: "method", locale: "es" }, "/en/how-we-work": { kind: "method", locale: "en" },
    "/evaluacion": { kind: "assessment", locale: "es" }, "/en/assessment": { kind: "assessment", locale: "en" },
    "/evaluacion/ahora": { kind: "assessmentNow", locale: "es" }, "/en/assessment/now": { kind: "assessmentNow", locale: "en" },
    "/evaluacion/agendar": { kind: "assessmentSchedule", locale: "es" }, "/en/assessment/schedule": { kind: "assessmentSchedule", locale: "en" },
    "/recursos": { kind: "resources", locale: "es" }, "/en/recursos": { kind: "resources", locale: "en" },
    "/nosotros": { kind: "about", locale: "es" }, "/en/about": { kind: "about", locale: "en" },
    "/en/privacy": { kind: "privacy", locale: "en" },
  };
  if (fixed[path]) return fixed[path];
  const resource = path.match(/^\/(en\/)?recursos\/([^/]+)$/);
  if (resource) return { kind: "resources", locale: resource[1] ? "en" : "es", postSlug: resource[2] };
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const parts = (await params).slug;
  const route = resolveRoute(parts);
  if (!route) return {};
  const isEn = route.locale === "en";
  const canonical = `${brand.siteUrl}/${parts.join("/")}`;
  if (route.postSlug) {
    const post = await getPublishedPost(route.locale, route.postSlug);
    if (!post) return {};
    const counterpart = post.translationKey ? (await getPublishedPosts(isEn ? "es" : "en")).find((item) => item.translationKey === post.translationKey) : undefined;
    return { title: post.seoTitle || post.title, description: post.seoDescription || post.excerpt, alternates: { canonical, languages: counterpart ? { [route.locale]: canonical, [isEn ? "es" : "en"]: `${brand.siteUrl}${isEn ? "" : "/en"}/recursos/${counterpart.slug}` } : undefined }, openGraph: { type: "article", title: post.seoTitle || post.title, description: post.seoDescription || post.excerpt, url: canonical, publishedTime: post.publishedAt, images: post.imageUrl ? [{ url: post.imageUrl, alt: post.imageAlt || post.title }] : undefined } };
  }
  return { title: route.kind === "home" ? (isEn ? "Automation, AI, and software for modern companies" : "Automatización, IA y software para empresas") : undefined, alternates: { canonical } };
}

export default async function CatchAllPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const route = resolveRoute((await params).slug);
  if (!route) notFound();
  if (route.kind === "home") return <HomePageContent locale="en" />;
  return <MarketingPage kind={route.kind} locale={route.locale} postSlug={route.postSlug} />;
}
