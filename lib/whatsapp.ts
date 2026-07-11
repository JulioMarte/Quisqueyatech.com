import { brand } from "./brand";

export type WhatsAppContext = {
  source?: string;
  name?: string;
  business?: string;
  sector?: string;
  pain?: string;
  message?: string;
};

export function buildWhatsAppUrl(ctx: WhatsAppContext = {}): string | null {
  const number = brand.whatsapp;
  if (!number) return null;

  const lines = [
    "Hola QuisqueyaTech, quiero una evaluación inicial de 15 minutos.",
    ctx.name ? `Nombre: ${ctx.name}` : null,
    ctx.business ? `Negocio: ${ctx.business}` : null,
    ctx.sector ? `Sector: ${ctx.sector}` : null,
    ctx.pain ? `Dolor principal: ${ctx.pain}` : null,
    ctx.message ? `Detalle: ${ctx.message}` : null,
    ctx.source ? `Origen: ${ctx.source}` : null,
  ].filter(Boolean);

  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${number}?text=${text}`;
}

export function whatsappHref(source = "web"): string {
  return (
    buildWhatsAppUrl({ source }) ??
    `https://wa.me/?text=${encodeURIComponent(
      "Hola QuisqueyaTech, quiero una evaluación inicial de 15 minutos.",
    )}`
  );
}
