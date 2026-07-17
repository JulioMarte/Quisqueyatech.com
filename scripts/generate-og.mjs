import fs from "node:fs/promises";
import sharp from "sharp";

const cards = [
  {
    file: "home.png",
    eyebrow: "AUTOMATIZACIÓN · IA · SOFTWARE",
    title: "La tecnología correcta, trabajando como un solo sistema.",
    body: "Evaluaciones e implementación para empresas dentro y fuera de República Dominicana.",
  },
  {
    file: "clinicas.png",
    eyebrow: "APLICACIÓN PARA CLÍNICAS",
    title: "Menos carga administrativa alrededor de cada paciente.",
    body: "Una aplicación posible de automatización, agentes de IA e integraciones.",
  },
];

await fs.mkdir("public/og", { recursive: true });
for (const card of cards) {
  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#082F49"/><stop offset="1" stop-color="#0A2138"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><circle cx="1050" cy="80" r="260" fill="#38BDF8" opacity=".12"/><circle cx="70" cy="610" r="230" fill="#F97316" opacity=".13"/><text x="80" y="105" font-family="Arial" font-size="20" font-weight="700" letter-spacing="3" fill="#38BDF8">${card.eyebrow}</text><foreignObject x="80" y="150" width="980" height="250"><div xmlns="http://www.w3.org/1999/xhtml" style="font:700 58px Arial;color:white;line-height:1.08">${card.title}</div></foreignObject><foreignObject x="80" y="420" width="850" height="90"><div xmlns="http://www.w3.org/1999/xhtml" style="font:24px Arial;color:#CBD5E1;line-height:1.4">${card.body}</div></foreignObject><text x="80" y="565" font-family="Arial" font-size="24" font-weight="700" fill="#F97316">QuisqueyaTech</text><text x="80" y="596" font-family="Arial" font-size="17" fill="#BAE6FD">quisqueyatech.com</text></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`public/og/${card.file}`);
}

const heroSocialSvg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="background" x1="100" y1="0" x2="1100" y2="630" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFFFFF"/>
      <stop offset="0.5" stop-color="#FFFAF4"/>
      <stop offset="1" stop-color="#F2F9FF"/>
    </linearGradient>
    <linearGradient id="headline" x1="312" y1="0" x2="890" y2="0" gradientUnits="userSpaceOnUse">
      <stop stop-color="#EA580C"/>
      <stop offset="1" stop-color="#0284C7"/>
    </linearGradient>
    <radialGradient id="amberHalo">
      <stop stop-color="#F97316" stop-opacity=".30"/>
      <stop offset="1" stop-color="#F97316" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="blueHalo">
      <stop stop-color="#38BDF8" stop-opacity=".28"/>
      <stop offset="1" stop-color="#38BDF8" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-30%" width="140%" height="170%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#082F49" flood-opacity=".12"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#background)"/>
  <circle cx="90" cy="-60" r="330" fill="url(#amberHalo)"/>
  <circle cx="1120" cy="625" r="370" fill="url(#blueHalo)"/>
  <g font-family="Arial, Helvetica, sans-serif" text-anchor="middle">
    <text x="600" y="63" font-size="18" font-weight="700" letter-spacing="2.7" fill="#0369A1">AUTOMATIZACIÓN, IA Y SOFTWARE PARA EMPRESAS</text>
    <text x="600" y="133" font-size="49" font-weight="800" fill="#082F49">Tu empresa no necesita más herramientas.</text>
    <text x="600" y="190" font-size="49" font-weight="800" fill="url(#headline)">Necesita que trabajen juntas.</text>
    <text x="600" y="232" font-size="19" fill="#475569">Conectamos procesos, personas y tecnología para que tu empresa avance.</text>
  </g>
  <g font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700" filter="url(#shadow)">
    <rect x="347" y="262" width="235" height="48" rx="24" fill="#F97316"/>
    <text x="464.5" y="292" fill="#FFFFFF" text-anchor="middle">Evaluación inicial sin costo</text>
    <rect x="598" y="262" width="255" height="48" rx="24" fill="#FFFFFF" stroke="#CBD5E1"/>
    <text x="725.5" y="292" fill="#082F49" text-anchor="middle">Disponible en español e inglés</text>
  </g>
  <g font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" text-anchor="middle">
    <path d="M245 405 C330 405 380 470 515 470 M600 405 L600 470 M955 405 C870 405 820 470 685 470" fill="none" stroke="#94A3B8" stroke-width="3" stroke-linecap="round"/>
    <rect x="130" y="368" width="230" height="64" rx="16" fill="#FFFFFF" stroke="#BAE6FD" filter="url(#shadow)"/>
    <text x="245" y="407" fill="#082F49">Automatización</text>
    <rect x="485" y="368" width="230" height="64" rx="16" fill="#FFFFFF" stroke="#FED7AA" filter="url(#shadow)"/>
    <text x="600" y="407" fill="#082F49">Agentes de IA</text>
    <rect x="840" y="368" width="230" height="64" rx="16" fill="#FFFFFF" stroke="#BAE6FD" filter="url(#shadow)"/>
    <text x="955" y="407" fill="#082F49">Software</text>
    <rect x="465" y="466" width="270" height="66" rx="18" fill="#082F49" filter="url(#shadow)"/>
    <text x="600" y="507" fill="#FFFFFF">Un solo sistema</text>
  </g>
  <g font-family="Arial, Helvetica, sans-serif">
    <circle cx="68" cy="580" r="25" fill="#082F49"/>
    <path d="M57 580 L66 589 L81 570" fill="none" stroke="#38BDF8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="107" y="579" font-size="25" font-weight="800" fill="#082F49">Quisqueya<tspan fill="#F97316">Tech</tspan></text>
    <text x="107" y="603" font-size="15" fill="#64748B">quisqueyatech.com</text>
  </g>
</svg>`;

await sharp(Buffer.from(heroSocialSvg))
  .png({ compressionLevel: 9, palette: true, quality: 92 })
  .toFile("public/og/home-hero-v2.png");
