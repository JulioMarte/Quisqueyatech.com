import type { Metadata } from "next";
import { HomePageContent } from "@/components/sections/home";
import { pageMetadata, seo } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(seo.homeEs);

export default function HomePage() {
  return <HomePageContent locale="es" />;
}
