import { getDatabase } from "../sqlite";
import type { Locale } from "../../../types/ui";

export type PostStatus = "draft" | "review_pending" | "scheduled" | "published" | "archived";

export interface PublishedPost {
  id: string;
  locale: Locale;
  slug: string;
  translationKey: string | null;
  title: string;
  excerpt: string;
  category: string | null;
  body: string;
  imageId: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  readingMinutes: number | null;
  featured: boolean;
  publishedAt: number;
  updatedAt: number;
}

interface PostRow extends Record<string, unknown> {
  id: string;
  locale: Locale;
  slug: string;
  translationKey: string | null;
  title: string;
  excerpt: string;
  category: string | null;
  body: string;
  imageId: string | null;
  imageAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  readingMinutes: number | null;
  featured: number | null;
  publishedAt: number;
  updatedAt: number;
  storagePath: string | null;
}

function mapPost(row: PostRow): PublishedPost {
  return {
    id: row.id,
    locale: row.locale,
    slug: row.slug,
    translationKey: row.translationKey,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    body: row.body,
    imageId: row.imageId,
    imageUrl: row.storagePath,
    imageAlt: row.imageAlt,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    readingMinutes: row.readingMinutes,
    featured: row.featured === 1,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
  };
}

const PUBLIC_POST_SELECT = `
  SELECT
    p.id, p.locale, p.slug, p.translationKey, p.title, p.excerpt,
    coalesce(c.name, p.category) AS category,
    p.body, p.imageId, p.imageAlt, p.seoTitle, p.seoDescription,
    p.readingMinutes, p.featured, p.publishedAt, p.updatedAt,
    s.path AS storagePath
  FROM posts p
  LEFT JOIN categories c ON c.id = p.categoryId
  LEFT JOIN storageObjects s ON s.id = p.imageId
`;

export function getPublishedPosts(locale: Locale, limit = 100, now = Date.now()) {
  const db = getDatabase();
  const rows = db.prepare(`${PUBLIC_POST_SELECT}
    WHERE p.locale = ? AND p.status = 'published' AND p.publishedAt <= ?
    ORDER BY p.publishedAt DESC
    LIMIT ?
  `).all(locale, now, limit) as PostRow[];
  return rows.map(mapPost);
}

export function getPublishedPost(locale: Locale, slug: string, now = Date.now()) {
  const db = getDatabase();
  const row = db.prepare(`${PUBLIC_POST_SELECT}
    WHERE p.locale = ? AND p.slug = ? AND p.status = 'published' AND p.publishedAt <= ?
    LIMIT 1
  `).get(locale, slug, now) as PostRow | undefined;
  return row ? mapPost(row) : null;
}

export function searchPosts(search: string, locale?: Locale, status?: PostStatus, limit = 50) {
  const db = getDatabase();
  const clauses = ["postsSearch MATCH ?"];
  const params: Array<string | number> = [search];
  if (locale) {
    clauses.push("p.locale = ?");
    params.push(locale);
  }
  if (status) {
    clauses.push("p.status = ?");
    params.push(status);
  }
  params.push(limit);

  return db.prepare(`
    SELECT p.id, p.locale, p.slug, p.translationKey, p.title, p.excerpt,
           p.status, p.publishedAt, p.updatedAt, p.imageAlt
    FROM postsSearch
    JOIN posts p ON p.rowid = postsSearch.rowid
    WHERE ${clauses.join(" AND ")}
    ORDER BY rank
    LIMIT ?
  `).all(...params);
}
