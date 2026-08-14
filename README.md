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

El sitio soporta una instancia Umami self-hosted sin añadir un backend al sitio. Configura los valores públicos durante el build:

```env
PUBLIC_UMAMI_SCRIPT_URL=https://analytics.example.com/script.js
PUBLIC_UMAMI_WEBSITE_ID=
PUBLIC_UMAMI_DOMAINS=quisqueyatech.com,www.quisqueyatech.com
PUBLIC_UMAMI_HOST_URL=
```

`PUBLIC_UMAMI_SCRIPT_URL` y `PUBLIC_UMAMI_WEBSITE_ID` son obligatorios para activar analytics. Si falta cualquiera de los dos, el sitio no carga el tracker.

`PUBLIC_UMAMI_DOMAINS` limita la recopilación a producción y evita contaminar las métricas con `localhost`. `PUBLIC_UMAMI_HOST_URL` es opcional y solo hace falta cuando el script y el endpoint de recolección viven en hosts distintos.

No guardes contraseñas, tokens administrativos ni credenciales de base de datos de Umami en este repositorio.

## Contenido

Las páginas públicas ES/EN, navegación, identidad, SEO, privacidad, sitemap y assets viven en este repositorio. Los artículos históricos que estaban solo en Convex requieren exportarse a una fuente de contenido disponible durante el build para mantener el sitio 100% estático.
