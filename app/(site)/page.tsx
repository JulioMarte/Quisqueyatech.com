import type { Metadata } from "next";
import { MarketingHomePage } from "@/components/sections/marketing-home";
import { localizedPageMetadata } from "@/lib/seo";

export const metadata: Metadata = localizedPageMetadata("home", "es");

export default function HomePage() {
  return <MarketingHomePage locale="es" />;
}
