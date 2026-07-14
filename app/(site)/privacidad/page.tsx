import type { Metadata } from "next";
import Link from "next/link";
import { PrivacySections } from "@/components/pages/privacy-sections";
import { Container, Section } from "@/components/ui/section";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Privacidad", description: "Política de privacidad y retención de datos de QuisqueyaTech." };

export default function PrivacyPage() {
  return <Section><Container className="max-w-3xl"><h1 className="font-display text-4xl font-bold text-primary">Política de privacidad</h1><p className="mt-4 text-text-2">Última actualización: julio de 2026. QuisqueyaTech opera desde {brand.location}.</p><PrivacySections /><Link href="/" className="mt-10 inline-block font-semibold text-amber-deep">← Volver al inicio</Link></Container></Section>;
}
