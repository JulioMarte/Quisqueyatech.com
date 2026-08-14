import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || "https://www.quisqueyatech.com",
  output: "static",
  trailingSlash: "never",
  integrations: [react()],
  server: {
    port: 4221,
  },
  build: { format: "directory" },
});
