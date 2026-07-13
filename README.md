# Quisqueyatech.com

## Deploy en Coolify

Esta app esta preparada para desplegarse en Coolify usando el build pack
`Dockerfile`.

Configuracion recomendada:

- Build Pack: `Dockerfile`
- Dockerfile path: `Dockerfile`
- Port Exposes: `3000`
- Healthcheck path en la UI, si se configura ahi: `/api/health`
- Dominio de produccion: `quisqueyatech.com`

Variables requeridas en Coolify, marcadas como Build + Runtime:

```env
NEXT_PUBLIC_SITE_URL=https://quisqueyatech.com
NEXT_PUBLIC_WHATSAPP_NUMBER=
NEXT_PUBLIC_CONTACT_EMAIL=admin@quisqueyatech.com
```

Las variables `NEXT_PUBLIC_*` se incrustan durante `next build`, asi que
cualquier cambio en ellas requiere redeploy.

Variables opcionales para futuras integraciones:

```env
RESEND_API_KEY=
LEAD_TO_EMAIL=admin@quisqueyatech.com
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
```

### Verificacion local

```bash
npm run lint
npm run build
docker build -t quisqueyatech-coolify .
docker run --rm -p 3000:3000 --env NEXT_PUBLIC_SITE_URL=http://localhost:3000 quisqueyatech-coolify
```

Despues de levantar el contenedor, revisar:

- `http://localhost:3000/`
- `http://localhost:3000/clinicas`
- `http://localhost:3000/privacidad`
- `http://localhost:3000/sitemap.xml`
- `http://localhost:3000/robots.txt`
- `http://localhost:3000/api/health`
