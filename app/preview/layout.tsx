import type { Metadata } from "next";
import { PreviewClosingCta } from "@/components/experiments/preview-closing-cta";
import { PreviewFooter } from "@/components/experiments/preview-footer";
import { Navbar } from "@/components/layout/navbar";
import "./preview.css";

export const metadata: Metadata = {
  title: "Visual direction previews",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default function PreviewLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Navbar />
      <div className="preview-variant-content">{children}</div>
      <PreviewClosingCta />
      <PreviewFooter />
    </>
  );
}
