export const brand = {
  name: "QuisqueyaTech",
  descriptor: "Consultora operativa",
  tagline: "Del caos operativo al control inteligente.",
  domain: "quisqueyatech.com",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://quisqueyatech.com",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "admin@quisqueyatech.com",
  location: "Puerto Plata, República Dominicana",
  locationShort: "PYMES dominicanas · Toda RD",
  whatsapp:
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") ?? "",
} as const;

export const colors = {
  primary: "#082F49",
  primary2: "#0A2138",
  tech: "#2563EB",
  larimar: "#38BDF8",
  larimarDeep: "#0EA5E9",
  amber: "#F97316",
  amberDeep: "#EA580C",
  text: "#0F172A",
  text2: "#475569",
  mute: "#64748B",
  bg: "#FFFFFF",
  bg2: "#F8FAFC",
  bg3: "#F1F5F9",
  line: "#E2E8F0",
  dark: "#0A1322",
  dark2: "#0F1E36",
  success: "#10B981",
  rose: "#E11D48",
} as const;
