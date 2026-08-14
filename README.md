# QuisqueyaTech.com

Sitio público estático de QuisqueyaTech construido con Astro.

## Requisitos

- Node.js 22.20.0 o superior.
- Usa una versión par de Node.js.
- npm.

## Desarrollo local

Si esta copia del repositorio se usó antes con Next.js, elimina primero las dependencias antiguas.

### Git Bash

```bash
node -v
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### PowerShell

```powershell
node -v
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
npm install
npm run dev
```

El servidor local de Astro usa `http://localhost:4221` para coincidir con el sitio de pruebas configurado en Umami.

Después de la primera instalación limpia, conserva el nuevo `package-lock.json` generado por npm.

## Build

```bash
npm run build
npm run preview
```

Astro genera el sitio en `dist/`. Producción sirve esos archivos con Nginx y no necesita un servidor Node.js.

## Evaluación por voz

El sitio no contiene el backend del agente, credenciales de LiveKit ni lógica de creación de salas. Configura solo URLs públicas y estables durante el build:

```env
PUBLIC_LIVEKIT_ASSESSMENT_URL=
PUBLIC_ASSESSMENT_SCHEDULE_URL=
```

Las credenciales privadas de LiveKit pertenecen al servicio externo que crea o administra las invitaciones.

## Umami analytics

El modo de desarrollo incluye un tracker de prueba para `localhost:4221`:

```text
script: https://umami.quisqueyatech.com/script.js
website id: 73646329-42c9-4e31-96a8-ae04366b62fb
domain: localhost
```

Ese fallback solo se usa cuando `import.meta.env.DEV` es verdadero. No se usa como fallback durante un build de producción.

Para producción crea un `.env` local o configura las mismas variables como build variables en Coolify:

```env
PUBLIC_UMAMI_SCRIPT_URL=https://umami.quisqueyatech.com/script.js
PUBLIC_UMAMI_WEBSITE_ID=ID-DEL-SITIO-DE-PRODUCCION
PUBLIC_UMAMI_DOMAINS=quisqueyatech.com,www.quisqueyatech.com
PUBLIC_UMAMI_HOST_URL=
```

Las variables `PUBLIC_UMAMI_*` siempre tienen prioridad sobre los valores de prueba. De esta forma puedes sustituir el Website ID de localhost por el Website ID real de producción sin modificar el código.

`PUBLIC_UMAMI_HOST_URL` es opcional. Úsalo solamente cuando el script y el endpoint de recolección vivan en hosts diferentes.

No guardes contraseñas, tokens administrativos ni credenciales de base de datos de Umami en este repositorio.

## Contenido

Las páginas públicas ES/EN, navegación, identidad, SEO, privacidad, sitemap y assets viven en este repositorio. Los artículos históricos que estaban solo en Convex requieren exportarse a una fuente de contenido disponible durante el build para mantener el sitio 100% estático.
