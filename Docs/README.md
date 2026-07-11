# QuisqueyaTech.com

Sitio web de **QuisqueyaTech** — consultora operativa para PYMES dominicanas.

## Estructura

| Ruta | Contenido |
|------|-----------|
| `web/` | App **Next.js 16** (homepage, landing clínicas, form leads) |
| `variante-f-consultora-premium.html` | Mockup de referencia |
| `identidad de la marca quisqueyatech.docx` | Manual de marca |

## Arrancar

```bash
cd web
cp .env.example .env.local
# NEXT_PUBLIC_WHATSAPP_NUMBER=1809XXXXXXX
npm install
npm run dev
```

→ http://localhost:3000

## Oferta v1

1. Evaluación inicial gratis (15 min)
2. Diagnóstico Operativo Inteligente (pagado)
3. Sprint 7–21 días / Sistema Operativo PYME

## Pendiente de configurar

- Número WhatsApp de empresa (`NEXT_PUBLIC_WHATSAPP_NUMBER`)
- Email leads (`admin@` / `info@`) — Resend o SMTP después
- Convex cuando quieras persistir leads en DB
- Dominio `quisqueyatech.com` en Vercel (root dir: `web`)
