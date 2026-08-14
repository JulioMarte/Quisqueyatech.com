import { BusinessImpactHero } from "@/components/sections/business-impact-hero";
import { MarketingHomePage } from "@/components/sections/marketing-home";
import type { SiteLocale } from "@/lib/routes";
import styles from "./home.module.css";

export async function HomePageContent({ locale }: { locale: SiteLocale }) {
  return (
    <>
      <BusinessImpactHero variant="main" locale={locale} />
      <div className={styles.withoutLegacyHero}>
        <MarketingHomePage locale={locale} />
      </div>
    </>
  );
}
