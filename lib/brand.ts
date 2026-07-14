export const brand = {
  name: "QuisqueyaTech",
  descriptor: "Automatización, IA y software para empresas",
  tagline: "La tecnología correcta, trabajando como un solo sistema.",
  domain: "quisqueyatech.com",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://quisqueyatech.com",
  publicEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "info@quisqueyatech.com",
  location: "Puerto Plata, República Dominicana",
  locationShort: "República Dominicana · Servicio internacional",
  founder: {
    name: "Julio Alberto Marte Balbuena",
    initials: "JM",
    image: "/team/julio-marte.jpeg",
    role: "Fundador y consultor de automatización e IA",
    linkedIn:
      "https://www.linkedin.com/in/julio-alberto-marte-balbuena-5454a072",
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
