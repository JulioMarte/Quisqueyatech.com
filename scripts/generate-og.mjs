import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outDir = path.join(root, "public", "og");
const logoPath = path.join(root, "public", "brand", "logo-mark-512.png");

const cards = [
  {
    file: "home.png",
    eyebrow: "QUISQUEYATECH · RD",
    title: "Ordenamos tu operación antes de venderte tecnología",
    body: "WhatsApp, citas, seguimiento, tareas repetitivas y reportes para PYMES dominicanas.",
    metricA: "24-48h",
    metricB: "Evaluación inicial",
  },
  {
    file: "clinicas.png",
    eyebrow: "CLÍNICAS Y ODONTÓLOGOS · RD",
    title: "Menos pacientes perdidos. Menos huecos en agenda.",
    body: "Citas, recordatorios y seguimiento desde WhatsApp con más orden para recepción.",
    metricA: "7-21 días",
    metricB: "Implementación corta",
  },
];

function esc(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function panel() {
  return `
    <g transform="translate(760 130)">
      <rect width="320" height="350" rx="28" fill="#FFFFFF" opacity="0.96"/>
      <rect x="0" y="0" width="320" height="350" rx="28" fill="none" stroke="#BAE6FD" stroke-width="2"/>
      <text x="32" y="54" font-family="Inter, Arial" font-size="17" font-weight="700" fill="#082F49">Panel de control</text>
      <rect x="32" y="84" width="256" height="58" rx="14" fill="#F8FAFC"/>
      <circle cx="58" cy="113" r="14" fill="#10B981"/>
      <text x="84" y="109" font-family="Inter, Arial" font-size="15" font-weight="700" fill="#0F172A">WhatsApp ordenado</text>
      <text x="84" y="128" font-family="Inter, Arial" font-size="12" fill="#475569">3 casos nuevos</text>
      <rect x="32" y="160" width="256" height="58" rx="14" fill="#F8FAFC"/>
      <circle cx="58" cy="189" r="14" fill="#38BDF8"/>
      <text x="84" y="185" font-family="Inter, Arial" font-size="15" font-weight="700" fill="#0F172A">Agenda conectada</text>
      <text x="84" y="204" font-family="Inter, Arial" font-size="12" fill="#475569">11 citas hoy</text>
      <rect x="32" y="236" width="256" height="58" rx="14" fill="#F8FAFC"/>
      <circle cx="58" cy="265" r="14" fill="#F97316"/>
      <text x="84" y="261" font-family="Inter, Arial" font-size="15" font-weight="700" fill="#0F172A">Seguimiento claro</text>
      <text x="84" y="280" font-family="Inter, Arial" font-size="12" fill="#475569">Próxima acción lista</text>
    </g>`;
}

function textBlock(lines, x, y, size, weight, fill, lineHeight) {
  return `<text x="${x}" y="${y}" font-family="Inter, Arial" font-size="${size}" font-weight="${weight}" fill="${fill}">
    ${lines
      .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${esc(line)}</tspan>`)
      .join("")}
  </text>`;
}

function svg(card) {
  const titleLines =
    card.file === "home.png"
      ? ["Ordenamos tu", "operación antes", "de venderte tecnología"]
      : ["Menos pacientes", "perdidos. Menos", "huecos en agenda."];
  const bodyLines =
    card.file === "home.png"
      ? ["WhatsApp, citas, seguimiento, tareas", "repetitivas y reportes para PYMES dominicanas."]
      : ["Citas, recordatorios y seguimiento desde", "WhatsApp con más orden para recepción."];

  return `
  <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#082F49"/>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <circle cx="1050" cy="70" r="250" fill="#38BDF8" opacity="0.18"/>
    <circle cx="120" cy="575" r="260" fill="#F97316" opacity="0.16"/>
    <rect x="48" y="48" width="1104" height="534" rx="38" fill="#FFFFFF" opacity="0.06" stroke="#FFFFFF" stroke-opacity="0.16"/>
    <text x="150" y="92" font-family="Inter, Arial" font-size="20" font-weight="800" fill="#FFFFFF">QuisqueyaTech</text>
    <text x="150" y="118" font-family="Inter, Arial" font-size="12" font-weight="700" letter-spacing="3" fill="#BAE6FD">CONSULTORÍA OPERATIVA</text>
    <text x="80" y="190" font-family="Inter, Arial" font-size="14" font-weight="800" letter-spacing="3" fill="#FDBA74">${esc(card.eyebrow)}</text>
    ${textBlock(titleLines, 80, 248, 52, 850, "#FFFFFF", 58)}
    ${textBlock(bodyLines, 82, 450, 22, 500, "rgba(255,255,255,.82)", 32)}
    <rect x="82" y="520" width="182" height="46" rx="23" fill="#F97316"/>
    <text x="112" y="550" font-family="Inter, Arial" font-size="16" font-weight="800" fill="#FFFFFF">${esc(card.metricA)}</text>
    <rect x="280" y="520" width="260" height="46" rx="23" fill="#FFFFFF" opacity="0.12" stroke="#FFFFFF" stroke-opacity="0.2"/>
    <text x="306" y="550" font-family="Inter, Arial" font-size="16" font-weight="700" fill="#FFFFFF">${esc(card.metricB)}</text>
    <text x="82" y="594" font-family="Inter, Arial" font-size="18" font-weight="700" fill="#BAE6FD">quisqueyatech.com</text>
    ${panel()}
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630">
        <stop stop-color="#082F49"/>
        <stop offset="0.55" stop-color="#0A2138"/>
        <stop offset="1" stop-color="#0F172A"/>
      </linearGradient>
    </defs>
  </svg>`;
}

await fs.mkdir(outDir, { recursive: true });
const logo = await sharp(logoPath).resize(72, 72).png().toBuffer();

for (const card of cards) {
  const base = await sharp(Buffer.from(svg(card))).png().toBuffer();
  await sharp(base)
    .composite([{ input: logo, left: 76, top: 62 }])
    .png()
    .toFile(path.join(outDir, card.file));
}

console.log(`Generated ${cards.length} Open Graph images in ${outDir}`);
