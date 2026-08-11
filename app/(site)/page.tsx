import type { Metadata } from "next";
import { HomePageContent } from "@/components/sections/home";
import { localizedPageMetadata } from "@/lib/seo";

export const metadata: Metadata = localizedPageMetadata("home", "es");

export default function HomePage() {
  return <HomePageContent locale="es" />;
}
