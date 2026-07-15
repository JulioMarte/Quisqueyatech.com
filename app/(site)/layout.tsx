import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { ScheduleModalProvider } from "@/components/evaluation/schedule-modal-context";
import { ScheduleModalHost } from "@/components/evaluation/schedule-modal";
import { organizationJsonLd } from "@/lib/seo";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ScheduleModalProvider>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      {/* Global modal host — renders the portal at <body> level. */}
      <ScheduleModalHost />
    </ScheduleModalProvider>
  );
}
