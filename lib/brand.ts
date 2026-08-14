const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.quisqueyatech.com";
const siteUrl = configuredSiteUrl
  .replace(/^https:\/\/quisqueyatech\.com\/?$/i, "https://www.quisqueyatech.com")
  .replace(/\/$/, "");

const publicPhoneDisplay =
  process.env.NEXT_PUBLIC_CONTACT_PHONE_DISPLAY?.trim() || "+1 (829) 445-8366";
const publicPhoneE164 = process.env.NEXT_PUBLIC_CONTACT_PHONE_E164?.trim() || "+18294458366";

export const brand = {
  name: "QuisqueyaTech",
  descriptor: "Sistemas, automatización y presencia digital para empresas",
  tagline: "Tecnología que resuelve problemas reales del negocio.",
  domain: "quisqueyatech.com",
  siteUrl,
  publicEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "info@quisqueyatech.com",
  publicPhoneDisplay,
  publicPhoneE164,
  publicPhoneHref: `tel:${publicPhoneE164}`,
  location: "Puerto Plata, República Dominicana",
  locationShort: "República Dominicana · Servicio internacional",
  founder: {
    name: "Julio Alberto Marte Balbuena",
    initials: "JM",
    image: "/team/julio-marte.jpeg",
    role: "Fundador y consultor de sistemas y automatización",
    linkedIn: "https://www.linkedin.com/in/julio-alberto-marte-balbuena-5454a072",
  },
  social: {
    instagram: "https://instagram.com/quisqueyait",
    facebook: "https://facebook.com/quisqueyait",
    x: "https://x.com/quisqueyait",
    handle: "@quisqueyait",
  },
} as const;

export const colors = {
  primary: "#082F49",
  primary2: "#0A2138",
  tech: "#2563EB",
  larimar: "#38BDF8",
  amber: "#F97316",
  text: "#0F172A",
  text2: "#475569",
  background: "#FFFFFF",
} as const;
