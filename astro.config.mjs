import { defineConfig } from "astro/config";

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || "https://www.quisqueyatech.com",
  output: "static",
  trailingSlash: "never",
  server: {
    port: 4221,
  },
  build: { format: "directory" },
});
