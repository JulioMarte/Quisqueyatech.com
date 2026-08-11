import type { Metadata } from "next";

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
  return children;
}
