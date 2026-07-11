import type { Metadata } from "next";
import {
  HeroSection,
  ProblemSection,
  BeforeAfterSection,
  MethodSection,
  StartPathsSection,
  OfferSection,
  SolutionsSection,
  SectorsSection,
  FitSection,
  DeliverablesSection,
  StackSection,
  FaqSection,
  EvaluationSection,
  FinalCtaSection,
} from "@/components/sections/home";
import { homeFaqJsonLd, pageMetadata, seo } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(seo.home);

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeFaqJsonLd) }}
      />
      <HeroSection />
      <ProblemSection />
      <BeforeAfterSection />
      <MethodSection />
      <StartPathsSection />
      <OfferSection />
      <SolutionsSection />
      <SectorsSection />
      <FitSection />
      <DeliverablesSection />
      <StackSection />
      <FaqSection />
      <EvaluationSection />
      <FinalCtaSection />
    </>
  );
}
