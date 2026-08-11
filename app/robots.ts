import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/machine/",
        "/setup",
        "/sign-in",
        "/recovery",
        "/evaluacion/",
        "/en/assessment/",
        "/agenda/",
        "/en/schedule/",
      ],
    },
    sitemap: `${brand.siteUrl}/sitemap.xml`,
    host: brand.siteUrl,
  };
}
