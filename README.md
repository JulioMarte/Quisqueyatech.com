# Quisqueyatech.com

Sitio bilingüe de QuisqueyaTech construido con Next.js 16, React 19, Convex Cloud y Tailwind CSS. Incluye evaluación por voz, agenda propia sobre Easy!Appointments, recursos editoriales y panel administrativo.

## Desarrollo

```bash
npm install
npm run dev
```

`npx convex dev --once` crea o selecciona el deployment personal de desarrollo, publica las funciones actuales y completa `.env.local`. Vuelve a ejecutarlo después de cambiar funciones, validadores o el esquema de Convex. Los datos de desarrollo y producción permanecen separados.

Nota local actual: `npm run dev` ejecuta solo Next.js y usa las URLs de Convex
Cloud definidas en `.env.local`. Completa `NEXT_PUBLIC_CONVEX_URL`,
`NEXT_PUBLIC_CONVEX_SITE_URL` y los secretos runtime locales para probar contra
Cloud. `CONVEX_URL` y `CONVEX_SITE_URL` son opcionales si las variables
`NEXT_PUBLIC_*` ya apuntan al mismo deployment. Para probar el worker local con
`npm run agent:dev`, `.env.local` tambien debe incluir `LIVEKIT_URL`,
`LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `ASSESSMENT_WORKER_SECRET` y,
opcionalmente, `ASSESSMENT_APP_URL=http://localhost:3000`. Usa
`npm run dev:local` solamente cuando quieras levantar Convex local de forma
explicita.

Para comprobar la ruta completa antes de probar con usuarios, levanta Next y el
worker, luego ejecuta `npm run assessment:doctor`. Si existe
`ASSESSMENT_HEALTH_PROBE_TOKEN`, el script tambien ejecuta el probe activo de
LiveKit; para un preview o produccion usa `ASSESSMENT_DOCTOR_URL=https://...`.

## Observabilidad con OpenTelemetry

La app Next.js y el worker LiveKit inicializan OpenTelemetry en Node.js y
exportan trazas y metricas por OTLP HTTP/protobuf. Configura estas variables en
Coolify, Docker o `.env.local`:

```bash
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.example.com
OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer <token>"
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_DEPLOYMENT_ENVIRONMENT=production
```

El servicio web usa `OTEL_SERVICE_NAME=quisqueyatech-web` por defecto. Los
scripts del worker fijan `OTEL_SERVICE_NAME=quisqueyatech-livekit-agent`.
Usa `OTEL_ENABLED=false` o `OTEL_SDK_DISABLED=true` para desactivar la
instrumentacion sin cambiar el build.

Para Grafana Cloud puedes usar el endpoint base OTLP, o fijar endpoints por
señal si tu collector los exige:

```bash
GRAFANA_CLOUD_OTLP_ENDPOINT=https://otlp-gateway-prod-REGION.grafana.net/otlp
GRAFANA_CLOUD_BASIC_AUTH_HEADER="Basic <base64 instance-id:token>"
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="${GRAFANA_CLOUD_OTLP_ENDPOINT}/v1/traces"
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT="${GRAFANA_CLOUD_OTLP_ENDPOINT}/v1/metrics"
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT="${GRAFANA_CLOUD_OTLP_ENDPOINT}/v1/logs"
OTEL_EXPORTER_OTLP_HEADERS="authorization=${GRAFANA_CLOUD_BASIC_AUTH_HEADER}"
```

`npx convex codegen` solamente genera los bindings y comprueba tipos locales. No publica las funciones en Convex Cloud y no sustituye a `npx convex dev --once`.

La aplicación funciona en modo demostración sin credenciales externas. Copia `.env.example` y configura servicios según se activen.

## Panel administrativo

El panel usa Better Auth dentro de Convex Cloud. No depende de Clerk, no permite registro público y admite exactamente un administrador. La primera cuenta se crea en `/setup`; después esa ruta queda cerrada.

**Bootstrap de baja fricción:** si `ADMIN_SETUP_CODE` **no** está definido en Convex (o tiene menos de 24 caracteres), el primer admin se crea **sin código de instalación** (first-admin-wins). Si defines un `ADMIN_SETUP_CODE` ≥ 24 caracteres, el formulario lo exige. Tras crear la cuenta, elimina el código de Convex si lo usaste.

### 1. Generar secretos

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Usa valores distintos para `BETTER_AUTH_SECRET`, `ADMIN_SETUP_CODE` y `AUTH_IP_HASH_SECRET`. No los publiques ni los agregues al repositorio. `BETTER_AUTH_SECRET` debe conservarse permanentemente; `ADMIN_SETUP_CODE` se elimina después de crear la cuenta.

### 2. Configurar Convex Cloud

Estas variables pertenecen a Convex, no a Docker. Copia cada valor individualmente al portapapeles y configura el deployment de desarrollo:

```powershell
Get-Clipboard | npx convex env set BETTER_AUTH_SECRET
Get-Clipboard | npx convex env set ADMIN_SETUP_CODE
Get-Clipboard | npx convex env set AUTH_IP_HASH_SECRET
"http://localhost:3000" | npx convex env set SITE_URL
```

Para producción añade `--prod` a cada comando y usa la URL pública exacta, por ejemplo `https://quisqueyatech.com`. Desarrollo y producción son instalaciones independientes.

Comprueba solamente los nombres, sin imprimir secretos:

Si el equipo prueba contra el deployment cloud de produccion desde Next.js
local, conserva `SITE_URL` en la URL publica y configura una sola vez los
origenes loopback permitidos en Convex:

```powershell
npx convex env set AUTH_TRUSTED_ORIGINS "http://localhost:*,http://127.0.0.1:*" --prod
```

No agregues IPs LAN ni comodines de dominios externos. Esta variable pertenece
a Convex Cloud, no a `.env.local` ni a Coolify.

```powershell
npx convex env list --names-only
npx convex env list --prod --names-only
```

### 3. Configurar Next.js y Coolify

`npx convex dev` crea `CONVEX_DEPLOYMENT` y `NEXT_PUBLIC_CONVEX_URL` en `.env.local`. Añade también:

```dotenv
NEXT_PUBLIC_CONVEX_SITE_URL=https://tu-deployment.convex.site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
AUTH_IP_HASH_SECRET=otro-secreto-aleatorio
TRUST_PROXY_HEADERS=false
```

En Coolify configura como build arguments `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL` y `NEXT_PUBLIC_SITE_URL`. Configura `AUTH_IP_HASH_SECRET` como variable runtime y activa `TRUST_PROXY_HEADERS=true` solamente detrás del proxy confiable. `ADMIN_API_SECRET` se conserva temporalmente para API keys de agentes y otras comunicaciones servicio–servicio; ya no autentica el login humano.

### 4. Iniciar y entrar al panel

```powershell
npm run dev
```

Abre [http://localhost:3000/setup](http://localhost:3000/setup) (o `https://www.quisqueyatech.com/setup` en prod). Si hay `ADMIN_SETUP_CODE` en Convex, introdúcelo; si no, crea la cuenta directamente. Guarda los ocho códigos de recuperación: se muestran una sola vez. Luego entra por `/sign-in`.

Si el setup devuelve 503 con un `code` (p. ej. `MISSING_ADMIN_API_SECRET`, `CONVEX_UNAUTHORIZED`), el mensaje indica qué variable falta o no coincide entre Coolify y Convex.

Cuando confirmes el acceso, elimina el código temporal:

```powershell
npx convex env remove ADMIN_SETUP_CODE
# Producción:
npx convex env remove --prod ADMIN_SETUP_CODE
```

### Resetear la instalación administrativa

Si necesitas reemplazar completamente la única cuenta administrativa, despliega primero esta versión y ejecuta uno de estos comandos desde una terminal interactiva:

```powershell
# Deployment de desarrollo seleccionado
npm run admin:reset-setup -- --deployment dev

# Producción (exige escribir RESET PRODUCTION)
npm run admin:reset-setup -- --prod
```

El comando nunca infiere el destino. Crea una autorización de reset aleatoria que caduca en cinco minutos, revoca sesiones, elimina la identidad Better Auth y los códigos de recuperación, y configura un `ADMIN_SETUP_CODE` nuevo que muestra una sola vez. Conserva contenido, evaluaciones, medios y credenciales de agentes. Si se interrumpe, se puede ejecutar de nuevo con seguridad.

Abre `/setup`, crea la nueva cuenta, guarda los ocho códigos de recuperación y elimina inmediatamente el setup code:

```powershell
npx convex env remove ADMIN_SETUP_CODE --deployment dev
npx convex env remove ADMIN_SETUP_CODE --prod
```

Si el login crea sesiones pero `/api/auth/convex/token` falla porque cambió `BETTER_AUTH_SECRET`, regenera únicamente JWKS sin borrar la cuenta:

```powershell
npm run admin:repair-auth -- --deployment dev
# Producción, solo si presenta el mismo error:
npm run admin:repair-auth -- --prod
```

El comando conserva usuario, contraseña, sesiones y códigos de recuperación. Necesita al menos una sesión existente para validar la emisión JWT; si no existe, intenta iniciar sesión una vez y repite el comando. Mantén `BETTER_AUTH_SECRET` estable después de la reparación.

Si la página carga indefinidamente o devuelve 503, confirma que:

- `NEXT_PUBLIC_CONVEX_URL` apunta al deployment de desarrollo correcto.
- `NEXT_PUBLIC_CONVEX_SITE_URL` corresponde al mismo deployment y termina en `.convex.site`.
- `SITE_URL` coincide con el dominio canonico; para usar produccion desde localhost, `AUTH_TRUSTED_ORIGINS` incluye los patrones loopback documentados arriba.
- `BETTER_AUTH_SECRET` existe en ese mismo deployment de Convex.
- Reiniciaste Next.js después de cambiar variables locales.
- En producción, la cookie se está enviando por HTTPS.

Si Convex devuelve `ArgumentValidationError` indicando que falta un argumento que el código local ya no utiliza, sincroniza y comprueba el contrato remoto:

```powershell
npx convex dev --once
npx convex function-spec
```

En desarrollo ambos comandos usan `CONVEX_DEPLOYMENT` desde `.env.local`. Reinicia `npm run dev` después de publicar y recarga el navegador con `Ctrl+Shift+R`.

### Agentes de contenido

Las tablas legacy `adminSessions` y `authLoginAttempts` se eliminaron del esquema. Si aún aparecen filas huérfanas en un deployment antiguo, puedes borrarlas desde el dashboard de Convex; la aplicación ya no las referencia.

La configuración cifrada de runtime (`/machine/runtime` en `*.convex.site`) solo se expone al BFF de Next con `Authorization: Bearer ADMIN_API_SECRET`. No uses queries públicas para secretos.

Dentro de `/admin`, abre la sección **Agentes** para crear, rotar o revocar credenciales. Cada clave se muestra una sola vez y solamente autentica `/api/content/v1`; los agentes pueden trabajar con borradores y enviarlos a revisión, pero no publicar.

## Evaluación de voz

`VOICE_PROVIDER` acepta `ultravox` o `livekit`. Ambos implementan la misma interfaz. Sin credenciales, la UI utiliza un modo demostrativo explícitamente identificado.

LiveKit necesita además un worker de Agents conectado a Gemini Live. El sitio crea la sala y el token; el worker se despliega independientemente en LiveKit Cloud o Coolify.

## Agenda interna y compatibilidad con Easy!Appointments

La disponibilidad y las reservas nuevas usan la agenda transaccional interna de Convex. Easy!Appointments queda fuera del camino activo y se conserva temporalmente como referencia histórica y para diagnóstico de webhooks heredados; `externalId` no es la fuente de verdad de una cita nueva.

Configura un webhook hacia:

```text
https://quisqueyatech.com/api/webhooks/easy-appointments
```

y usa `X-EA-Token` con el mismo valor de `EASY_APPOINTMENTS_WEBHOOK_TOKEN`.

## Producción

Hay **dos métodos** de despliegue de la app Next.js. El mismo `Dockerfile` sirve para ambos.

| Método                        | Quién construye        | Coolify hace                 | Uso                                |
| ----------------------------- | ---------------------- | ---------------------------- | ---------------------------------- |
| **A — GHCR (recomendado)**    | GitHub Actions         | Solo `docker pull` + restart | Producción                         |
| **B — Dockerfile en Coolify** | Coolify en el servidor | `docker build` + run         | Fallback / staging / si GHCR falla |

Nunca actives **los dos a la vez** sobre la misma app (doble deploy). Usa una app Coolify por método, o cambia el source de la app cuando cambies de método.

### Método A — GHCR + Coolify pull (recomendado)

El workflow `.github/workflows/deploy.yml` en `main`:

1. Valida lint / format / typecheck / tests.
2. Despliega Convex (`CONVEX_DEPLOY_KEY`).
3. Construye la imagen con el `Dockerfile` y la publica en **GHCR**:
   - `ghcr.io/juliomarte/quisqueyatech.com:latest`
   - `ghcr.io/juliomarte/quisqueyatech.com:sha-<corto>`
   - `ghcr.io/juliomarte/quisqueyatech.com:<commit-sha>`
4. Llama al webhook de Coolify para pull + restart (**sin** build en el servidor).

**Coolify (app producción):**

1. Source: **Docker Image** (no Dockerfile / no Nixpacks).
2. Image: `ghcr.io/juliomarte/quisqueyatech.com`
3. Tag: `latest`
4. Port: `3000`
5. Autodeploy por git: **OFF**
6. Runtime env: secretos (`ADMIN_API_SECRET`, `ASSESSMENT_*`, `AUTH_IP_HASH_SECRET`, `CONFIG_ENCRYPTION_KEY`, `TURNSTILE_SECRET_KEY`, `TRUST_PROXY_HEADERS=true`, Resend, Twilio…). **No** copies `BETTER_AUTH_SECRET` a Coolify.
7. Webhook de deploy → secret GitHub `COOLIFY_WEBHOOK_URL` (y `COOLIFY_TOKEN` si hace falta).
8. Si GHCR es privado, en el servidor:

```bash
echo TU_PAT | docker login ghcr.io -u JulioMarte --password-stdin
# PAT con read:packages
```

Los `NEXT_PUBLIC_*` se **hornean en el build de GitHub** (build-args del workflow). Coolify no reconstruye Next.

### Método B — Coolify construye el Dockerfile

Úsalo como respaldo o en un environment de staging.

1. Source: **Dockerfile** (base directory `/`, Dockerfile `Dockerfile`).
2. Autodeploy por git: **ON** (o webhook de git).
3. **Build-time variables** (crítico): en cada variable `NEXT_PUBLIC_*` marca **Available at Buildtime** / Build Argument. Si no, el build deja Convex vacío y el sitio sale roto o falla el compile.

| Variable / Build arg             | Valor                                    | Buildtime |
| -------------------------------- | ---------------------------------------- | --------- |
| `NEXT_PUBLIC_SITE_URL`           | `https://www.quisqueyatech.com`          | sí        |
| `NEXT_PUBLIC_CONTACT_EMAIL`      | `info@quisqueyatech.com`                 | sí        |
| `NEXT_PUBLIC_CONVEX_URL`         | URL prod `.convex.cloud`                 | sí        |
| `NEXT_PUBLIC_CONVEX_SITE_URL`    | URL prod `.convex.site`                  | sí        |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Site key del widget Cloudflare Turnstile | sí        |

4. Runtime env: los mismos secretos que el método A (Available at Runtime).
5. Port: `3000`
6. **RAM del servidor**: el `next build` necesita ~3 GB libres. Si el VPS tiene 2 GB, el build muere con `exit 255` sin mensaje de Next (OOM). En ese caso usa **Método A** (build en GitHub) o sube la RAM.
7. Si usas método B en prod, deja `COOLIFY_WEBHOOK_URL` vacío en GitHub para no reiniciar dos veces.

### Secrets de GitHub Actions

| Secret                           | Dónde obtenerlo                  | Método                        |
| -------------------------------- | -------------------------------- | ----------------------------- |
| `CONVEX_DEPLOY_KEY`              | Convex → Production → Deploy key | A y B                         |
| `NEXT_PUBLIC_CONVEX_URL`         | Convex → `.convex.cloud`         | A (build)                     |
| `NEXT_PUBLIC_CONVEX_SITE_URL`    | Convex → `.convex.site`          | A (build)                     |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile             | A (build obligatorio)         |
| `COOLIFY_WEBHOOK_URL`            | Coolify → Webhooks → Deploy      | Solo A                        |
| `COOLIFY_TOKEN`                  | Coolify → API token `deploy`     | Solo A si el webhook lo exige |

`GITHUB_TOKEN` publica en GHCR solo (permiso `packages:write`).

### Cloudflare Turnstile

La evaluación pública requiere las dos claves del mismo widget de Turnstile. En
Cloudflare autoriza `quisqueyatech.com` y `www.quisqueyatech.com`. Configura
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` durante el build y `TURNSTILE_SECRET_KEY`
exclusivamente en runtime. Una imagen ya construida no incorpora una site key
nueva al reiniciarse: debe reconstruirse y desplegarse nuevamente.

En `npm run dev` no se necesitan esas variables: la aplicacion selecciona en el
cliente y en el servidor las claves de prueba oficiales de Cloudflare, que
funcionan en `localhost` y ejercitan el flujo completo de Siteverify. Aunque
`.env.local` contenga claves reales, desarrollo no las usara. Nunca copies las
claves de prueba a Coolify; produccion sigue fallando cerrada si faltan sus
credenciales reales y no autoriza `localhost`.

Las respuestas dummy de Cloudflare usan un hostname y una accion sinteticos.
Por esa razon desarrollo comprueba que Siteverify acepte el token, mientras que
la validacion estricta de `hostname` y `action` se mantiene en produccion.

### Probar el Dockerfile en local

Con Docker Desktop instalado y variables en `.env` / entorno:

```bash
# Build local (método B local)
npm run docker:build
npm run docker:up

# O pull de la imagen de GHCR (método A local)
# docker login ghcr.io
npm run docker:pull
```

Health: `http://localhost:3000/api/health` debe responder `ok: true` si Convex URL pública está bien configurada en el build.

`SITE_URL` en Convex debe ser exactamente `https://www.quisqueyatech.com`. Abre `/setup` una sola vez, guarda los códigos de recuperación y elimina `ADMIN_SETUP_CODE` del deployment de producción.

Después de desplegar el esquema ampliado, clasifica los medios históricos por lotes. Ejecuta primero el dry-run y solo después la migración real:

```bash
npx convex run migrations:classifyExistingMedia '{"dryRun":true}' --prod
npx convex run migrations:classifyExistingMedia --prod
```

La agenda usa una migración widen–migrate–narrow para reemplazar fechas ISO almacenadas por timestamps numéricos. Después de desplegar la fase ampliada, ejecuta:

```bash
npx convex run migrations:backfillBookingTimestamps '{"dryRun":true}' --prod
npx convex run migrations:backfillBookingTimestamps --prod
npx convex run migrations:backfillBookingSearchText '{"dryRun":true}' --prod
npx convex run migrations:backfillBookingSearchText --prod
```

No elimines todavía `start`, `end` ni sus índices antiguos. Primero confirma desde el panel o con `agenda:adminTimestampMigrationStatus` que no quede ninguna cita sin `startAt` o `endAt`; el estrechamiento del esquema requiere un despliegue posterior y solo debe realizarse después de una verificación exitosa en producción.

Las credenciales de agentes se preparan y se activan en dos pasos. Una clave pendiente no autentica y la clave anterior continúa activa hasta confirmar la activación. Si se pierde la respuesta, deja expirar la pendiente o revócala; no rote repetidamente.

## Verificación

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run docker:build
```

Las pruebas E2E anónimas no necesitan credenciales. La suite completa es destructiva (crea contenido y agentes, cambia la contraseña y consume un código), por lo que solo debe ejecutarse contra un deployment preview aislado. Si el preview está vacío usa `E2E_ADMIN_SETUP_CODE`; si ya está configurado proporciona además la cuenta y un código de recuperación:

```powershell
$env:E2E_BASE_URL="https://preview.example.com"
$env:E2E_ADMIN_SETUP_CODE="código-efímero-del-preview"
# Para un preview ya configurado:
$env:E2E_ADMIN_EMAIL="admin-de-prueba@ejemplo.com"
$env:E2E_ADMIN_PASSWORD="contraseña-efímera"
$env:E2E_ADMIN_RECOVERY_CODE="código-de-recuperación-efímero"
npm run test:e2e
```

No guardes esas variables en `.env.local`, CI ni el repositorio. En producción ejecuta primero el smoke test anónimo; crea la cuenta mediante `/setup`, elimina `ADMIN_SETUP_CODE` y solo entonces ejecuta el flujo autenticado.
