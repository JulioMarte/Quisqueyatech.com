import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { AiActionInput } from "@/lib/validations/content";

const proposalSchema = z.object({
  title: z.string().optional(),
  alternativeTitles: z.array(z.string()).max(5).optional(),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  category: z.string().optional(),
  outline: z.array(z.string()).optional(),
  body: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  imageAlt: z.string().optional(),
  imagePrompt: z.string().optional(),
  warnings: z.array(z.string()).default([]),
});

export type AiProposal = z.infer<typeof proposalSchema>;

export interface ContentAiProvider {
  generate(
    input: AiActionInput,
  ): Promise<{ proposal: AiProposal; model: string; inputTokens?: number; outputTokens?: number }>;
}

class GeminiContentProvider implements ContentAiProvider {
  async generate(input: AiActionInput) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Gemini is not configured");
    const model = process.env.CONTENT_AI_MODEL || "gemini-2.5-flash";
    const ai = new GoogleGenAI({ apiKey });
    const outputLocale = input.action === "translate" ? input.targetLocale : input.locale;
    if (
      input.action === "translate" &&
      (!input.targetLocale || input.targetLocale === input.locale)
    )
      throw new Error("Translation requires a different targetLocale");
    const language = outputLocale === "es" ? "Spanish" : "English";
    const sourceRule = input.sources.length
      ? `User-provided references (not automatically verified): ${input.sources.join(", ")}. Do not claim you opened or verified them.`
      : "No verified sources were provided. Flag every factual or quantitative claim that requires verification.";
    const prompt = `You are the editorial assistant for QuisqueyaTech, a Dominican automation, AI and software consultancy. Return only JSON. Never fabricate clients, testimonials, credentials, metrics or outcomes. Action: ${input.action}. Output language: ${language}. ${sourceRule}\nAudience: ${input.audience || "business decision makers"}\nObjective: ${input.objective || "educate clearly and build trust"}\nBrief: ${input.brief}\nCurrent content: ${input.currentContent || ""}\nSelected text: ${input.selectedText || ""}\nFor translations preserve meaning, Markdown and source URLs. For drafts use concise Markdown headings and practical examples. Put verification needs in warnings.`;
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(proposalSchema),
      },
    });
    const parsed = proposalSchema.parse(JSON.parse(response.text || "{}"));
    return {
      proposal: parsed,
      model,
      inputTokens: response.usageMetadata?.promptTokenCount,
      outputTokens: response.usageMetadata?.candidatesTokenCount,
    };
  }
}

export function contentAiProvider(): ContentAiProvider {
  const provider = process.env.CONTENT_AI_PROVIDER || "gemini";
  if (provider !== "gemini") throw new Error(`Unsupported content AI provider: ${provider}`);
  return new GeminiContentProvider();
}
