import type { Metadata } from "next";
import { Inter, Poppins, JetBrains_Mono } from "next/font/google";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { brand } from "@/lib/brand";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(brand.siteUrl),
  title: {
    default: "QuisqueyaTech — Del caos operativo al control inteligente",
    template: "%s | QuisqueyaTech",
  },
  description:
    "Consultora operativa para PYMES dominicanas. Diagnosticamos procesos e implementamos CRM, WhatsApp, agenda, IA y reportes. Evaluación inicial gratis.",
  keywords: [
    "automatización PYMES República Dominicana",
    "CRM WhatsApp clínicas",
    "consultora operativa RD",
    "QuisqueyaTech",
  ],
  authors: [{ name: "QuisqueyaTech" }],
  openGraph: {
    type: "website",
    locale: "es_DO",
    url: brand.siteUrl,
    siteName: brand.name,
    title: "QuisqueyaTech — Del caos operativo al control inteligente",
    description:
      "Ayudamos a PYMES dominicanas a ordenar atención, automatizar tareas y operar con más control.",
  },
  twitter: {
    card: "summary_large_image",
    title: "QuisqueyaTech",
    description: brand.tagline,
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: brand.name,
    description:
      "Consultora operativa de automatización e IA para PYMES dominicanas.",
    url: brand.siteUrl,
    email: brand.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Puerto Plata",
      addressCountry: "DO",
    },
    areaServed: "DO",
    slogan: brand.tagline,
  };

  return (
    <html
      lang="es"
      className={`${inter.variable} ${poppins.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans text-text">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
