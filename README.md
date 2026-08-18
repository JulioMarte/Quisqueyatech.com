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
npm run check
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

La instancia self-hosted oficial es:

```text
https://umami.quisqueyatech.com
```

### Desarrollo local

El modo de desarrollo incluye un Website ID separado para localhost:

```text
script: https://umami.quisqueyatech.com/script.js
website id: 73646329-42c9-4e31-96a8-ae04366b62fb
domains: localhost,127.0.0.1
```

Ese ID nunca se usa como fallback de producción.

Para probarlo:

```bash
npm run dev
```

Abre `http://localhost:4221`. Si Astro usa otro puerto, el tracking local sigue funcionando porque Umami filtra por hostname, no por puerto.

En DevTools puedes verificar:

```js
typeof window.umami
```

Debe devolver `"object"` después de cargar el tracker.

### Producción

El Website ID oficial de QuisqueyaTech es:

```text
925defd4-10b8-4cc9-99ea-e7a271967e56
```

`BaseLayout.astro` contiene defaults seguros para los dos hosts canónicos:

```text
quisqueyatech.com
www.quisqueyatech.com
```

Cuando `PUBLIC_SITE_URL` apunta a uno de esos hosts y no existen overrides `PUBLIC_UMAMI_*`, Astro genera automáticamente el tracker equivalente a:

```html
<script
  async
  src="https://umami.quisqueyatech.com/script.js"
  data-website-id="925defd4-10b8-4cc9-99ea-e7a271967e56"
  data-domains="quisqueyatech.com,www.quisqueyatech.com"
></script>
```

El tracker se carga con prioridad baja para no competir con LCP.

### Preview y staging

Los builds cuyo `PUBLIC_SITE_URL` no sea `quisqueyatech.com` ni `www.quisqueyatech.com` **no reciben automáticamente el Website ID de producción**. Esto evita contaminar analytics de producción con tráfico de preview.

Para instrumentar `preview.quisqueyatech.com`, crea preferiblemente otro Website en Umami y proporciona sus valores durante el build:

```env
PUBLIC_SITE_URL=https://preview.quisqueyatech.com
PUBLIC_UMAMI_SCRIPT_URL=https://umami.quisqueyatech.com/script.js
PUBLIC_UMAMI_WEBSITE_ID=<website-id-separado-de-preview>
PUBLIC_UMAMI_DOMAINS=preview.quisqueyatech.com
PUBLIC_UMAMI_HOST_URL=
```

### Coolify

Umami forma parte del build estático de Astro. Las variables `PUBLIC_*` deben estar disponibles durante el Docker build; cambiar una variable requiere rebuild/redeploy.

Para producción basta con:

```env
PUBLIC_SITE_URL=https://www.quisqueyatech.com
PUBLIC_CONTACT_EMAIL=info@quisqueyatech.com
```

porque el script, Website ID y dominios oficiales ya tienen defaults seguros en el código.

Si prefieres configuración explícita en Coolify, usa:

```env
PUBLIC_SITE_URL=https://www.quisqueyatech.com
PUBLIC_UMAMI_SCRIPT_URL=https://umami.quisqueyatech.com/script.js
PUBLIC_UMAMI_WEBSITE_ID=925defd4-10b8-4cc9-99ea-e7a271967e56
PUBLIC_UMAMI_DOMAINS=quisqueyatech.com,www.quisqueyatech.com
PUBLIC_UMAMI_HOST_URL=
```

Las variables `PUBLIC_UMAMI_*` siempre tienen prioridad sobre los defaults del código. El `Dockerfile` ya las declara como `ARG` y `ENV` antes de `npm run build`.

### Cobertura de eventos

El sitio no se limita a pageviews. La capa `site-analytics.js` registra las interacciones relevantes y usa una taxonomía tipada definida en `src/types/analytics.ts`.

Se instrumentan explícitamente:

- CTA de evaluación;
- intención de iniciar evaluación;
- apertura real de LiveKit;
- intención de agendar;
- apertura real del scheduler;
- navegación desktop y móvil;
- mega-menu de soluciones;
- cambio ES/EN;
- cards de soluciones;
- Recursos;
- Nosotros/fundador;
- email;
- redes sociales;
- privacidad.

Además existe cobertura automática para cualquier enlace, botón, `summary`, elemento `role="button"`, submit de formulario, enlace externo, `mailto:`, `tel:` y descarga que no tenga metadata semántica propia.

La referencia completa de eventos, propiedades, Goals y Funnels recomendados está en:

```text
docs/analytics.md
```

### Verificación después del deployment

Después del redeploy:

1. Abre `https://www.quisqueyatech.com`.
2. Abre DevTools y entra en `Network`.
3. Busca `script.js`.
4. Confirma que carga desde `https://umami.quisqueyatech.com/script.js` con estado 200.
5. Confirma una solicitud de recopilación de Umami.
6. Revisa el dashboard de Umami y confirma la visita y los eventos.

Desde la consola:

```js
typeof window.umami
```

Debe devolver:

```text
object
```

Para probar la capa semántica del sitio:

```js
QuisqueyaAnalytics.track("ui_click", {
  location: "page",
  label: "diagnostic"
})
```

Si `script.js` aparece bloqueado por el navegador, revisa extensiones de privacidad, ad blockers y protección antirrastreo antes de asumir un problema del sitio.

### Seguridad

El Website ID y la URL de `script.js` son valores públicos que el navegador necesita para enviar telemetría.

No guardes en este repositorio:

- contraseñas de Umami;
- credenciales administrativas;
- `DATABASE_URL` de la instancia Umami;
- secretos del servidor;
- tokens privados.

No envíes PII como propiedades de eventos o sesión.

## Contenido

Las páginas públicas ES/EN, navegación, identidad, SEO, privacidad, sitemap y assets viven en este repositorio. Los artículos históricos que estaban solo en Convex requieren exportarse a una fuente de contenido disponible durante el build para mantener el sitio 100% estático.
