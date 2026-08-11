import { notFound } from "next/navigation";
import {
  MarketingVariantPage,
  marketingVariantDefinitions,
  type MarketingVariant,
} from "@/components/experiments/marketing-variants";

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

  return <MarketingVariantPage variant={variant as MarketingVariant} />;
}
