import type { MetadataRoute } from "next";
import { caseStudies } from "@/lib/case-studies";
import { getPublishedPosts } from "@/lib/server/content";
import { absoluteUrl } from "@/lib/seo";
import { caseStudyPath, localizedRoutes, resourcePath, type StaticRouteKey } from "@/lib/routes";

const staticKeys: readonly StaticRouteKey[] = [
  "home",
  "solutions",
  "webSeo",
  "automation",
  "agents",
  "software",
  "clinics",
  "method",
  "resources",
  "caseStudies",
  "about",
  "privacy",
];

function localizedEntry(
  esPath: string,
  enPath: string,
  locale: "es" | "en",
  options?: Pick<MetadataRoute.Sitemap[number], "lastModified" | "changeFrequency" | "priority">,
): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(locale === "es" ? esPath : enPath),
    alternates: {
      languages: {
        es: absoluteUrl(esPath),
        en: absoluteUrl(enPath),
      },
    },
    ...options,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (const key of staticKeys) {
    const paths = localizedRoutes[key];
    const priority = key === "home" ? 1 : key === "privacy" ? 0.2 : 0.7;
    const changeFrequency =
      key === "resources" || key === "caseStudies"
        ? "weekly"
        : key === "privacy"
          ? "yearly"
          : "monthly";
    entries.push(
      localizedEntry(paths.es, paths.en, "es", { priority, changeFrequency }),
      localizedEntry(paths.es, paths.en, "en", { priority, changeFrequency }),
    );
  }

  for (const study of caseStudies) {
    const esPath = caseStudyPath(study.key, "es");
    const enPath = caseStudyPath(study.key, "en");
    entries.push(
      localizedEntry(esPath, enPath, "es", { priority: 0.7, changeFrequency: "monthly" }),
      localizedEntry(esPath, enPath, "en", { priority: 0.7, changeFrequency: "monthly" }),
    );
  }

  const [esPosts, enPosts] = await Promise.all([getPublishedPosts("es"), getPublishedPosts("en")]);
  const enByTranslation = new Map(
    enPosts.filter((post) => post.translationKey).map((post) => [post.translationKey, post]),
  );
  const esByTranslation = new Map(
    esPosts.filter((post) => post.translationKey).map((post) => [post.translationKey, post]),
  );

  for (const post of esPosts) {
    const en = post.translationKey ? enByTranslation.get(post.translationKey) : undefined;
    const esPath = resourcePath("es", post.slug);
    const lastModified = new Date(post.publishedAt);
    if (en) {
      entries.push(
        localizedEntry(esPath, resourcePath("en", en.slug), "es", {
          lastModified,
          priority: 0.6,
          changeFrequency: "monthly",
        }),
      );
    } else {
      entries.push({
        url: absoluteUrl(esPath),
        lastModified,
        priority: 0.6,
        changeFrequency: "monthly",
      });
    }
  }

  for (const post of enPosts) {
    const es = post.translationKey ? esByTranslation.get(post.translationKey) : undefined;
    const enPath = resourcePath("en", post.slug);
    const lastModified = new Date(post.publishedAt);
    if (es) {
      entries.push(
        localizedEntry(resourcePath("es", es.slug), enPath, "en", {
          lastModified,
          priority: 0.6,
          changeFrequency: "monthly",
        }),
      );
    } else {
      entries.push({
        url: absoluteUrl(enPath),
        lastModified,
        priority: 0.6,
        changeFrequency: "monthly",
      });
    }
  }

  return entries;
}
