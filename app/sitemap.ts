import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";
import { getPublishedPosts } from "@/lib/server/content";

const esRoutes = ["", "/soluciones", "/soluciones/automatizacion", "/soluciones/agentes-de-ia", "/soluciones/software-e-integraciones", "/soluciones/clinicas", "/como-trabajamos", "/evaluacion", "/evaluacion/ahora", "/evaluacion/agendar", "/recursos", "/nosotros", "/privacidad"];
const enRoutes = ["/en", "/en/solutions", "/en/solutions/automation", "/en/solutions/ai-agents", "/en/solutions/software-and-integrations", "/en/solutions/clinics", "/en/how-we-work", "/en/assessment", "/en/assessment/now", "/en/assessment/schedule", "/en/recursos", "/en/about", "/en/privacy"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = [...esRoutes, ...enRoutes].map((path, index) => ({ url: `${brand.siteUrl}${path}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: index === 0 ? 1 : 0.7 }));
  const posts = [...await getPublishedPosts("es"), ...await getPublishedPosts("en")].map((post) => ({ url: `${brand.siteUrl}${post.locale === "en" ? "/en" : ""}/recursos/${post.slug}`, lastModified: new Date(post.publishedAt), changeFrequency: "monthly" as const, priority: 0.6 }));
  return [...pages, ...posts];
}
