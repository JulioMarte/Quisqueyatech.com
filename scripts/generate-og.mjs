import fs from "node:fs/promises";
import sharp from "sharp";

const cards = [
  { file: "home.png", eyebrow: "AUTOMATIZACIÓN · IA · SOFTWARE", title: "La tecnología correcta, trabajando como un solo sistema.", body: "Evaluaciones e implementación para empresas dentro y fuera de República Dominicana." },
  { file: "clinicas.png", eyebrow: "APLICACIÓN PARA CLÍNICAS", title: "Menos carga administrativa alrededor de cada paciente.", body: "Una aplicación posible de automatización, agentes de IA e integraciones." },
];

await fs.mkdir("public/og", { recursive: true });
for (const card of cards) {
  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#082F49"/><stop offset="1" stop-color="#0A2138"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><circle cx="1050" cy="80" r="260" fill="#38BDF8" opacity=".12"/><circle cx="70" cy="610" r="230" fill="#F97316" opacity=".13"/><text x="80" y="105" font-family="Arial" font-size="20" font-weight="700" letter-spacing="3" fill="#38BDF8">${card.eyebrow}</text><foreignObject x="80" y="150" width="980" height="250"><div xmlns="http://www.w3.org/1999/xhtml" style="font:700 58px Arial;color:white;line-height:1.08">${card.title}</div></foreignObject><foreignObject x="80" y="420" width="850" height="90"><div xmlns="http://www.w3.org/1999/xhtml" style="font:24px Arial;color:#CBD5E1;line-height:1.4">${card.body}</div></foreignObject><text x="80" y="565" font-family="Arial" font-size="24" font-weight="700" fill="#F97316">QuisqueyaTech</text><text x="80" y="596" font-family="Arial" font-size="17" fill="#BAE6FD">quisqueyatech.com</text></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`public/og/${card.file}`);
}
