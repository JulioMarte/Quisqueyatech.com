import { z } from "zod";
export const agentPostSchema = z
  .object({
    locale: z.enum(["es", "en"]),
    slug: z
      .string()
      .min(2)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
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
    expectedUpdatedAt: z.number().int().positive().optional(),
  })
  .strict();
export const transitionSchema = z
  .object({ expectedUpdatedAt: z.number().int().positive() })
  .strict();
