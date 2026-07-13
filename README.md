# Quisqueyatech.com

Sitio bilingüe de QuisqueyaTech construido con Next.js 16, React 19, Convex Cloud y Tailwind CSS. Incluye evaluación por voz, agenda propia sobre Easy!Appointments, recursos editoriales y panel administrativo.

## Desarrollo

```bash
npm install
npx convex dev
npm run dev
```

`npx convex dev` crea o selecciona el deployment personal de desarrollo y completa `.env.local`. Los datos de desarrollo y producción permanecen separados.

La aplicación funciona en modo demostración sin credenciales externas. Copia `.env.example` y configura servicios según se activen.

## Evaluación de voz

`VOICE_PROVIDER` acepta `ultravox` o `livekit`. Ambos implementan la misma interfaz. Sin credenciales, la UI utiliza un modo demostrativo explícitamente identificado.

LiveKit necesita además un worker de Agents conectado a Gemini Live. El sitio crea la sala y el token; el worker se despliega independientemente en LiveKit Cloud o Coolify.

## Easy!Appointments

Easy!Appointments 1.6.0 vive como servicio independiente en el VPS. La UI pública nunca enlaza al frontend predeterminado: consulta disponibilidad y crea reservas mediante su API HTTPS desde el servidor. Este repositorio conserva únicamente la guía de interoperabilidad en `infra/easy-appointments/README.md`.

Configura un webhook hacia:

```text
https://quisqueyatech.com/api/webhooks/easy-appointments
```

y usa `X-EA-Token` con el mismo valor de `EASY_APPOINTMENTS_WEBHOOK_TOKEN`.

## Producción

El workflow `.github/workflows/deploy.yml` valida el proyecto, despliega Convex y después activa Coolify. Desactiva el autodeploy directo de Coolify para evitar despliegues paralelos.

Variables públicas de Next.js deben configurarse como build arguments en Coolify. Los secretos de Easy!Appointments, voz, telefonía y correo son variables runtime y nunca deben incluirse en la imagen.

## Verificación

```bash
npm run lint
npm run build
docker build -t quisqueyatech-coolify .
```
