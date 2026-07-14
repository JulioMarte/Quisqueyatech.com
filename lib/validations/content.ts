import { z } from "zod";

export const postStatusSchema = z.enum(["draft", "review_pending", "scheduled", "published", "archived"]);

export const postInputSchema = z.object({
  id: z.string().optional(),
  locale: z.enum(["es", "en"]),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  translationKey: z.string().max(120).optional(),
  title: z.string().min(4).max(180),
  excerpt: z.string().min(10).max(320),
  category: z.string().min(2).max(80).optional(),
  body: z.string().min(20).max(100_000),
  imageId: z.string().optional(),
  imageAlt: z.string().max(240).optional(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(170).optional(),
  readingMinutes: z.number().int().min(1).max(180).optional(),
  featured: z.boolean().optional(),
  status: postStatusSchema,
  publishedAt: z.number().optional(),
}).superRefine((post, ctx) => {
  if (post.status === "scheduled" && !post.publishedAt) ctx.addIssue({ code: "custom", path: ["publishedAt"], message: "Scheduled posts require a publication date" });
});

export type PostInput = z.infer<typeof postInputSchema>;

export const aiActionSchema = z.object({
  action: z.enum(["outline", "draft", "rewrite", "summary", "titles", "seo", "translate", "alt-text", "image-prompt"]),
  postId: z.string().optional(),
  locale: z.enum(["es", "en"]),
  targetLocale: z.enum(["es", "en"]).optional(),
  brief: z.string().min(5).max(12_000),
  currentContent: z.string().max(100_000).optional(),
  selectedText: z.string().max(20_000).optional(),
  audience: z.string().max(300).optional(),
  objective: z.string().max(500).optional(),
  sources: z.array(z.string().url()).max(12).default([]),
});

export type AiActionInput = z.infer<typeof aiActionSchema>;
