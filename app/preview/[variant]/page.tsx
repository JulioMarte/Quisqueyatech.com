import { notFound } from "next/navigation";
import {
  MarketingVariantPage,
  marketingVariantDefinitions,
  type MarketingVariant,
} from "@/components/experiments/marketing-variants";
import {
  BusinessImpactHero,
  type BusinessHeroVariant,
} from "@/components/sections/business-impact-hero";

export function generateStaticParams() {
  return marketingVariantDefinitions.map(({ id }) => ({ variant: id }));
}

export default async function MarketingVariantPreviewPage({
  params,
}: {
  params: Promise<{ variant: string }>;
}) {
  const { variant } = await params;
  const allowed = marketingVariantDefinitions.some((entry) => entry.id === variant);
  if (!allowed) notFound();

  const selectedVariant = variant as MarketingVariant;

  return (
    <>
      <BusinessImpactHero variant={selectedVariant as BusinessHeroVariant} locale="es" />
      <div className="legacy-preview-variant">
        <MarketingVariantPage variant={selectedVariant} />
      </div>
    </>
  );
}
