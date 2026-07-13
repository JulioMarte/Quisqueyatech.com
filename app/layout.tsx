import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter, JetBrains_Mono, Poppins } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { brand } from "@/lib/brand";
import { organizationJsonLd, seo } from "@/lib/seo";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-poppins", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(brand.siteUrl),
  title: { default: seo.homeEs.title, template: "%s | QuisqueyaTech" },
  description: seo.homeEs.description,
  authors: [{ name: brand.founder.name }],
  creator: brand.name,
  publisher: brand.name,
  icons: { icon: [{ url: "/favicon.ico" }, { url: "/brand/favicon-32.png", sizes: "32x32" }], apple: "/brand/apple-touch-icon.png" },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = (await headers()).get("x-quisqueya-locale") === "en" ? "en" : "es";
  const page = (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
  return (
    <html lang={locale} className={`${inter.variable} ${poppins.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans text-text">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <ClerkProvider>{page}</ClerkProvider> : page}
      </body>
    </html>
  );
}
