import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { organizationJsonLd } from "@/lib/seo";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
