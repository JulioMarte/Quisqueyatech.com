import type { Metadata } from "next";
import Link from "next/link";
import { PrivacySections } from "@/components/pages/privacy-sections";
import { Container, Section } from "@/components/ui/section";
import { brand } from "@/lib/brand";
import { localizedPageMetadata, serviceBreadcrumbs } from "@/lib/seo";
import { routePath } from "@/lib/routes";

export const metadata: Metadata = localizedPageMetadata("privacy", "es");

export default function PrivacyPage() {
  const breadcrumbs = serviceBreadcrumbs("privacy", "es");
  return (
    <div lang="es">
      <Section>
        <Container className="max-w-3xl">
          <h1 className="font-display text-4xl font-bold text-primary">Política de privacidad</h1>
          <p className="mt-4 text-text-2">
            Última actualización: agosto de 2026. QuisqueyaTech opera desde {brand.location}.
          </p>
          <PrivacySections />
          <Link
            href={routePath("home", "es")}
            className="mt-10 inline-block font-semibold text-amber-deep"
          >
            ← Volver al inicio
          </Link>
        </Container>
      </Section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}
