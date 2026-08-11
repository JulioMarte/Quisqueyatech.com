"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { AnimatePresence, m } from "framer-motion";
import { useMemo, useState } from "react";
import type { ResourcePost } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { resourcePath } from "@/lib/routes";

export function ResourceGrid({ posts, locale }: { posts: ResourcePost[]; locale: Locale }) {
  const allLabel = locale === "es" ? "Todos" : "All";
  const [category, setCategory] = useState(allLabel);
  const [query, setQuery] = useState("");
  const categories = useMemo(
    () => [allLabel, ...Array.from(new Set(posts.map((post) => post.category)))],
    [allLabel, posts],
  );
  const visible = useMemo(
    () =>
      posts.filter(
        (post) =>
          (category === allLabel || post.category === category) &&
          `${post.title} ${post.excerpt}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [allLabel, category, posts, query],
  );

  return (
    <>
      <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex flex-wrap gap-2"
          aria-label={locale === "es" ? "Filtrar por categoría" : "Filter by category"}
        >
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
              className={`min-h-11 cursor-pointer rounded-full px-4 text-sm font-semibold transition-colors ${category === item ? "bg-primary text-white" : "bg-bg-2 text-text-2 hover:bg-bg-3"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="relative block min-w-64">
          <span className="sr-only">
            {locale === "es" ? "Buscar recursos" : "Search resources"}
          </span>
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-mute" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={locale === "es" ? "Buscar recursos" : "Search resources"}
            className="min-h-11 w-full rounded-full border border-line bg-white pl-10 pr-4 outline-none focus:border-tech"
          />
        </label>
      </div>
      {visible.length ? (
        <m.div layout className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((post) => (
              <m.article
                layout="position"
                key={post.slug}
                initial={{ opacity: 0, y: 34, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -18, scale: 0.98 }}
                transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
                className="interactive-card group overflow-hidden rounded-2xl border border-line bg-white"
              >
                {post.imageUrl ? (
                  <div className="relative aspect-[16/9] overflow-hidden bg-bg-3">
                    <Image
                      src={post.imageUrl}
                      alt={post.imageAlt || ""}
                      fill
                      unoptimized
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[16/9] items-end bg-gradient-to-br from-primary to-tech p-6">
                    <span className="font-mono text-xs font-semibold uppercase tracking-[.18em] text-white/80">
                      QuisqueyaTech
                    </span>
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wider">
                    <span className="text-amber-deep">{post.category}</span>
                    <span className="text-mute">{post.readingMinutes} min</span>
                  </div>
                  <h2 className="mt-3 font-display text-xl font-bold leading-snug text-primary">
                    {post.title}
                  </h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-text-2">
                    {post.excerpt}
                  </p>
                  <Link
                    className="interactive-link mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-tech"
                    href={resourcePath(locale, post.slug)}
                  >
                    {locale === "es" ? "Leer recurso" : "Read resource"}
                    <ArrowRight className="motion-arrow h-4 w-4" />
                  </Link>
                </div>
              </m.article>
            ))}
          </AnimatePresence>
        </m.div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-line-2 bg-white p-10 text-center text-text-2">
          {locale === "es"
            ? "No encontramos recursos con esos filtros."
            : "No resources match those filters."}
        </div>
      )}
    </>
  );
}
