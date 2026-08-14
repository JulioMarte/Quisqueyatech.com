# QuisqueyaTech.com

Sitio público estático de QuisqueyaTech construido con Astro.

## Requisitos

- Node.js 22.12.0 o superior.
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

## Contenido

Las páginas públicas ES/EN, navegación, identidad, SEO, privacidad, sitemap y assets viven en este repositorio. Los artículos históricos que estaban solo en Convex requieren exportarse a una fuente de contenido disponible durante el build para mantener el sitio 100% estático.
