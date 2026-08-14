import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseStudyDetail, CaseStudiesPage } from "@/components/pages/case-studies-page";
import { MarketingPage, type PageKind } from "@/components/pages/marketing-page";
import { HomePageContent } from "@/components/sections/home";
import { brand } from "@/lib/brand";
import { getCaseStudy } from "@/lib/case-studies";
import { getPublishedPost, getPublishedPosts } from "@/lib/server/content";
import { absoluteUrl, localizedAlternates, localizedPageMetadata } from "@/lib/seo";
import {
  caseStudyPath,
  caseStudySlugs,
  getCaseStudyByPath,
  localizedRoutes,
  resourcePath,
  routePath,
  type CaseStudyKey,
  type SiteLocale,
  type StaticRouteKey,
} from "@/lib/routes";

type Route =
  | { type: "home"; locale: "en"; routeKey: "home" }
  | { type: "marketing"; locale: SiteLocale; routeKey: StaticRouteKey; kind: PageKind }
  | { type: "resources"; locale: SiteLocale; routeKey: "resources"; postSlug?: string }
  | { type: "caseStudies"; locale: SiteLocale; routeKey: "caseStudies" }
  | { type: "caseStudy"; locale: SiteLocale; routeKey: "caseStudies"; caseKey: CaseStudyKey };

const marketingRoutes: readonly {
  routeKey: StaticRouteKey;
  kind: PageKind;
}[] = [
  { routeKey: "solutions", kind: "solutions" },
  { routeKey: "webSeo", kind: "web" },
  { routeKey: "automation", kind: "automation" },
  { routeKey: "agents", kind: "agents" },
  { routeKey: "software", kind: "software" },
  { routeKey: "clinics", kind: "clinics" },
  { routeKey: "method", kind: "method" },
  { routeKey: "about", kind: "about" },
];

function resolveRoute(parts: string[]): Route | null {
  const path = `/${parts.join("/")}`;

  if (path === routePath("home", "en")) {
    return { type: "home", locale: "en", routeKey: "home" };
  }

  for (const { routeKey, kind } of marketingRoutes) {
    if (path === routePath(routeKey, "es")) {
      return { type: "marketing", locale: "es", routeKey, kind };
    }
    if (path === routePath(routeKey, "en")) {
      return { type: "marketing", locale: "en", routeKey, kind };
    }
  }

  if (path === routePath("resources", "es")) {
    return { type: "resources", locale: "es", routeKey: "resources" };
  }
  if (path === routePath("resources", "en")) {
    return { type: "resources", locale: "en", routeKey: "resources" };
  }

  const esResourcePrefix = `${routePath("resources", "es")}/`;
  const enResourcePrefix = `${routePath("resources", "en")}/`;
  if (path.startsWith(esResourcePrefix) && !path.slice(esResourcePrefix.length).includes("/")) {
    return {
      type: "resources",
      locale: "es",
      routeKey: "resources",
      postSlug: decodeURIComponent(path.slice(esResourcePrefix.length)),
    };
  }
  if (path.startsWith(enResourcePrefix) && !path.slice(enResourcePrefix.length).includes("/")) {
    return {
      type: "resources",
      locale: "en",
      routeKey: "resources",
      postSlug: decodeURIComponent(path.slice(enResourcePrefix.length)),
    };
  }

  if (path === routePath("caseStudies", "es")) {
    return { type: "caseStudies", locale: "es", routeKey: "caseStudies" };
  }
  if (path === routePath("caseStudies", "en")) {
    return { type: "caseStudies", locale: "en", routeKey: "caseStudies" };
  }

  const caseRoute = getCaseStudyByPath(path);
  if (caseRoute) {
    return {
      type: "caseStudy",
      locale: caseRoute.locale,
      routeKey: "caseStudies",
      caseKey: caseRoute.key,
    };
  }

  if (path === routePath("privacy", "en")) {
    return { type: "marketing", locale: "en", routeKey: "privacy", kind: "privacy" };
  }

  return null;
}

export const revalidate = 3600;

export async function generateStaticParams() {
  const paths = new Set<string>();

  paths.add(routePath("home", "en"));
  for (const { routeKey } of marketingRoutes) {
    paths.add(routePath(routeKey, "es"));
    paths.add(routePath(routeKey, "en"));
  }
  paths.add(routePath("resources", "es"));
  paths.add(routePath("resources", "en"));
  paths.add(routePath("caseStudies", "es"));
  paths.add(routePath("caseStudies", "en"));
  paths.add(routePath("privacy", "en"));

  for (const key of Object.keys(caseStudySlugs) as CaseStudyKey[]) {
    paths.add(caseStudyPath(key, "es"));
    paths.add(caseStudyPath(key, "en"));
  }

  const [esPosts, enPosts] = await Promise.all([getPublishedPosts("es"), getPublishedPosts("en")]);
  esPosts.forEach((post) => paths.add(resourcePath("es", post.slug)));
  enPosts.forEach((post) => paths.add(resourcePath("en", post.slug)));

  return [...paths].map((path) => ({ slug: path.split("/").filter(Boolean) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const parts = (await params).slug;
  const route = resolveRoute(parts);
  if (!route) return {};

  if (route.type === "home") return localizedPageMetadata("home", "en");

  if (route.type === "marketing") {
    return localizedPageMetadata(route.routeKey, route.locale);
  }

  if (route.type === "caseStudies") {
    return localizedPageMetadata("caseStudies", route.locale);
  }

  if (route.type === "caseStudy") {
    const study = getCaseStudy(route.caseKey);
    if (!study) return {};
    const copy = study.locale[route.locale];
    const esPath = caseStudyPath(route.caseKey, "es");
    const enPath = caseStudyPath(route.caseKey, "en");
    const canonicalPath = caseStudyPath(route.caseKey, route.locale);
    return {
      title: `${study.client} — ${copy.category}`,
      description: copy.summary,
      alternates: localizedAlternates(esPath, enPath, route.locale),
      openGraph: {
        type: "article",
        locale: route.locale === "es" ? "es_DO" : "en_US",
        alternateLocale: [route.locale === "es" ? "en_US" : "es_DO"],
        url: absoluteUrl(canonicalPath),
        siteName: brand.name,
        title: `${study.client} — ${copy.category}`,
        description: copy.summary,
      },
      twitter: {
        card: "summary_large_image",
        title: `${study.client} — ${copy.category}`,
        description: copy.summary,
      },
    };
  }

  if (!route.postSlug) return localizedPageMetadata("resources", route.locale);

  const post = await getPublishedPost(route.locale, route.postSlug);
  if (!post) return {};
  const otherLocale: SiteLocale = route.locale === "en" ? "es" : "en";
  const counterpart = post.translationKey
    ? (await getPublishedPosts(otherLocale)).find(
        (item) => item.translationKey === post.translationKey,
      )
    : undefined;

  const canonicalPath = resourcePath(route.locale, post.slug);
  const canonical = absoluteUrl(canonicalPath);
  const alternates = counterpart
    ? localizedAlternates(
        route.locale === "es" ? canonicalPath : resourcePath("es", counterpart.slug),
        route.locale === "en" ? canonicalPath : resourcePath("en", counterpart.slug),
        route.locale,
      )
    : { canonical };
  const image = post.imageUrl ? absoluteUrl(post.imageUrl) : absoluteUrl("/og/home-hero-v2.png");

  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    alternates,
    openGraph: {
      type: "article",
      locale: route.locale === "es" ? "es_DO" : "en_US",
      alternateLocale: counterpart ? [route.locale === "es" ? "en_US" : "es_DO"] : undefined,
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt,
      url: canonical,
      siteName: brand.name,
      publishedTime: post.publishedAt,
      authors: [brand.founder.name],
      images: [{ url: image, alt: post.imageAlt || post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt,
      images: [image],
    },
  };
}

export default async function CatchAllPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const route = resolveRoute((await params).slug);
  if (!route) notFound();

  if (route.type === "home") return <HomePageContent locale="en" />;
  if (route.type === "caseStudies") return <CaseStudiesPage locale={route.locale} />;
  if (route.type === "caseStudy") {
    return <CaseStudyDetail locale={route.locale} caseKey={route.caseKey} />;
  }
  if (route.type === "resources") {
    return <MarketingPage kind="resources" locale={route.locale} postSlug={route.postSlug} />;
  }
  return <MarketingPage kind={route.kind} locale={route.locale} />;
}
