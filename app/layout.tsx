import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Poppins } from "next/font/google";
import { MotionProvider } from "@/components/ui/motion";
import { brand } from "@/lib/brand";
import { seoPages } from "@/lib/seo";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
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

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(brand.siteUrl),
  title: {
    default: `${seoPages.home.es.title} | ${brand.name}`,
    template: `%s | ${brand.name}`,
  },
  description: seoPages.home.es.description,
  authors: [{ name: brand.founder.name }],
  creator: brand.name,
  publisher: brand.name,
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/brand/favicon-32.png", sizes: "32x32" }],
    apple: "/brand/apple-touch-icon.png",
  },
  robots: { index: true, follow: true },
  verification: googleVerification ? { google: googleVerification } : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${poppins.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans text-text">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
