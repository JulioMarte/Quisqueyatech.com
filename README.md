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

### Desarrollo local

El modo de desarrollo incluye un tracker de prueba para localhost:

```text
script: https://umami.quisqueyatech.com/script.js
website id: 73646329-42c9-4e31-96a8-ae04366b62fb
domains: localhost,127.0.0.1
```

Ese fallback solo se usa cuando `import.meta.env.DEV` es verdadero. No se usa como fallback durante un build de producción.

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

### Producción con Coolify

Umami se configura en este proyecto durante el **build estático de Astro**. Por eso las variables deben estar disponibles durante el build de Docker. No basta con añadirlas solamente como variables runtime después de que `npm run build` ya terminó.

Antes del deployment, crea un Website nuevo en tu instancia de Umami para el dominio de producción. Usa el Website ID de ese sitio, no el ID de localhost.

En Coolify abre la aplicación de QuisqueyaTech y añade estas variables de entorno/build:

```env
PUBLIC_SITE_URL=https://www.quisqueyatech.com
PUBLIC_UMAMI_SCRIPT_URL=https://umami.quisqueyatech.com/script.js
PUBLIC_UMAMI_WEBSITE_ID=ID-REAL-DE-QUISQUEYATECH
PUBLIC_UMAMI_DOMAINS=quisqueyatech.com,www.quisqueyatech.com
PUBLIC_UMAMI_HOST_URL=
```

También configura las demás variables públicas necesarias para el sitio:

```env
PUBLIC_CONTACT_EMAIL=info@quisqueyatech.com
PUBLIC_LIVEKIT_ASSESSMENT_URL=
PUBLIC_ASSESSMENT_SCHEDULE_URL=
```

#### Configuración recomendada en Coolify

1. Selecciona la aplicación de QuisqueyaTech.
2. Abre la sección de variables de entorno.
3. Añade cada variable `PUBLIC_*` con su valor de producción.
4. Asegúrate de que Coolify exponga esas variables durante el Docker build.
5. Guarda los cambios.
6. Ejecuta un redeploy completo para reconstruir la imagen.

Un cambio de `PUBLIC_UMAMI_WEBSITE_ID`, dominio o script requiere un rebuild. Astro inserta esa configuración en los archivos estáticos durante `npm run build`.

El `Dockerfile` ya declara estas variables como `ARG` y `ENV` antes de ejecutar el build, por lo que no hace falta modificar el Dockerfile para un deployment normal en Coolify.

### Valores de producción

La configuración típica debe quedar así:

```env
PUBLIC_UMAMI_SCRIPT_URL=https://umami.quisqueyatech.com/script.js
PUBLIC_UMAMI_WEBSITE_ID=<website-id-creado-en-umami-para-quisqueyatech.com>
PUBLIC_UMAMI_DOMAINS=quisqueyatech.com,www.quisqueyatech.com
PUBLIC_UMAMI_HOST_URL=
```

`PUBLIC_UMAMI_SCRIPT_URL` apunta al tracker público de la instancia self-hosted.

`PUBLIC_UMAMI_WEBSITE_ID` identifica el Website de producción dentro de Umami.

`PUBLIC_UMAMI_DOMAINS` evita enviar telemetría desde dominios no autorizados. Incluye tanto el dominio raíz como `www` si ambos pueden servir el sitio.

`PUBLIC_UMAMI_HOST_URL` es opcional. Déjalo vacío cuando `script.js` y el endpoint de recopilación pertenecen a la misma instancia de Umami.

Las variables `PUBLIC_UMAMI_*` siempre tienen prioridad sobre los valores de prueba de desarrollo.

### Verificación después del deployment

Después del redeploy:

1. Abre `https://www.quisqueyatech.com`.
2. Abre DevTools y entra en `Network`.
3. Busca `script.js`.
4. Confirma que carga desde `https://umami.quisqueyatech.com/script.js` con estado 200.
5. Busca la solicitud de recopilación de Umami.
6. Revisa el dashboard de Umami y confirma una visita nueva.

También puedes comprobar desde la consola:

```js
typeof window.umami
```

Debe devolver:

```text
object
```

Para una prueba manual puedes ejecutar:

```js
umami.track("production-diagnostic")
```

Luego verifica ese evento en Umami.

Si `script.js` aparece bloqueado por el navegador, revisa extensiones de privacidad, ad blockers y protección antirrastreo antes de asumir un problema del sitio.

### Seguridad

El Website ID y la URL de `script.js` son valores públicos que el navegador necesita para enviar telemetría.

No guardes en este repositorio:

- contraseñas de Umami;
- credenciales administrativas;
- `DATABASE_URL` de la instancia Umami;
- secretos del servidor;
- tokens privados.

## Contenido

Las páginas públicas ES/EN, navegación, identidad, SEO, privacidad, sitemap y assets viven en este repositorio. Los artículos históricos que estaban solo en Convex requieren exportarse a una fuente de contenido disponible durante el build para mantener el sitio 100% estático.
