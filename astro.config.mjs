import { defineConfig, fontProviders } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || "https://www.quisqueyatech.com",
  output: "static",
  trailingSlash: "never",
  integrations: [react()],
  fonts: [
    {
      name: "Inter",
      cssVariable: "--astro-font-inter",
      provider: fontProviders.google(),
      weights: [400, 500, 600, 700],
      styles: ["normal"],
      subsets: ["latin"],
      formats: ["woff2"],
      fallbacks: ["system-ui", "sans-serif"],
    },
    {
      name: "Poppins",
      cssVariable: "--astro-font-poppins",
      provider: fontProviders.google(),
      weights: [500, 600, 700, 800],
      styles: ["normal"],
      subsets: ["latin"],
      formats: ["woff2"],
      fallbacks: ["system-ui", "sans-serif"],
    },
    {
      name: "JetBrains Mono",
      cssVariable: "--astro-font-jetbrains",
      provider: fontProviders.google(),
      weights: [400, 500],
      styles: ["normal"],
      subsets: ["latin"],
      formats: ["woff2"],
      fallbacks: ["ui-monospace", "monospace"],
    },
  ],
  server: {
    port: 4221,
  },
  build: {
    format: "directory",
    inlineStylesheets: "always",
  },
});
