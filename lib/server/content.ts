import "server-only";
import { convexQuery } from "@/lib/server/convex";
import { findPost, postsForLocale, type ResourcePost } from "@/lib/content";
import type { Locale } from "@/lib/i18n";

type ConvexPost = {
  _id: string; locale: Locale; slug: string; translationKey?: string; title: string; excerpt: string;
  category?: string; body: string; imageUrl?: string | null; imageAlt?: string; seoTitle?: string;
  seoDescription?: string; readingMinutes?: number; featured?: boolean; publishedAt?: number;
};

function normalize(post: ConvexPost): ResourcePost {
  return { ...post, category: post.category || (post.locale === "es" ? "Tecnología" : "Technology"), publishedAt: new Date(post.publishedAt || Date.now()).toISOString(), readingMinutes: post.readingMinutes || Math.max(1, Math.ceil(post.body.trim().split(/\s+/).length / 220)) };
}

export async function getPublishedPosts(locale: Locale): Promise<ResourcePost[]> {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL || !process.env.ADMIN_API_SECRET) return postsForLocale(locale);
  try {
    const result = await convexQuery("posts:serverPublished", { secret: process.env.ADMIN_API_SECRET, locale }) as ConvexPost[] | null;
    return result ? result.map(normalize) : [];
  } catch {
    return postsForLocale(locale);
  }
}

export async function getPublishedPost(locale: Locale, slug: string): Promise<ResourcePost | undefined> {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL || !process.env.ADMIN_API_SECRET) return findPost(locale, slug);
  try {
    const result = await convexQuery("posts:serverBySlug", { secret: process.env.ADMIN_API_SECRET, locale, slug }) as ConvexPost | null;
    return result ? normalize(result) : undefined;
  } catch {
    return findPost(locale, slug);
  }
}
