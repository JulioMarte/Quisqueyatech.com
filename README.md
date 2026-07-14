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

## Panel administrativo

El panel usa una cuenta propia y sesiones revocables almacenadas en Convex. No depende de Clerk y no permite registro público.

### 1. Generar la contraseña y los secretos

Genera el hash de la contraseña de forma interactiva. La contraseña debe tener al menos 14 caracteres y no se guarda en el proyecto:

```powershell
npm run auth:hash-password
```

El comando imprime una línea `ADMIN_PASSWORD_HASH=...`; copia el valor completo. Después genera dos secretos independientes:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Usa uno como `ADMIN_API_SECRET` y el otro como `AUTH_IP_HASH_SECRET`. No reutilices contraseñas, no publiques estos valores y no los agregues al repositorio.

### 2. Configurar Next.js localmente

Añade estas variables a `.env.local`, conservando también las variables de Convex creadas por `npx convex dev`:

```dotenv
ADMIN_EMAIL=tu-email@example.com
ADMIN_PASSWORD_HASH=scrypt$v1$...
AUTH_SESSION_VERSION=1
AUTH_IP_HASH_SECRET=primer-secreto-aleatorio
ADMIN_API_SECRET=segundo-secreto-aleatorio
TRUST_PROXY_HEADERS=false
```

`AUTH_SESSION_VERSION` puede incrementarse para invalidar inmediatamente todas las sesiones existentes. En desarrollo, deja `TRUST_PROXY_HEADERS=false`.

### 3. Configurar Convex localmente

Convex necesita el mismo `ADMIN_EMAIL` y exactamente el mismo `ADMIN_API_SECRET` configurado en `.env.local`. Para evitar dejar secretos en el historial de PowerShell, copia cada valor al portapapeles y ejecuta:

```powershell
Get-Clipboard | npx convex env set ADMIN_EMAIL
Get-Clipboard | npx convex env set ADMIN_API_SECRET
```

Antes de cada comando, copia al portapapeles únicamente el valor correspondiente. Puedes comprobar qué nombres están configurados con `npx convex env list`; evita compartir su salida porque contiene secretos.

### 4. Iniciar y entrar al panel

```powershell
npm run dev
```

Abre [http://localhost:3000/sign-in](http://localhost:3000/sign-in), introduce `ADMIN_EMAIL` y la contraseña original usada para generar `ADMIN_PASSWORD_HASH`. Después del acceso serás redirigido a [http://localhost:3000/admin](http://localhost:3000/admin).

Si el login falla, confirma que:

- `ADMIN_EMAIL` coincide exactamente en Next.js y Convex.
- `ADMIN_API_SECRET` es idéntico en `.env.local` y Convex.
- `ADMIN_PASSWORD_HASH` se copió completo, incluyendo el prefijo `scrypt$v1$`.
- Reiniciaste `npm run dev` después de cambiar `.env.local`.
- `NEXT_PUBLIC_CONVEX_URL` apunta al deployment de desarrollo correcto.

### Agentes de contenido

Dentro de `/admin`, abre la sección **Agentes** para crear, rotar o revocar credenciales. Cada clave se muestra una sola vez y solamente autentica `/api/content/v1`; los agentes pueden trabajar con borradores y enviarlos a revisión, pero no publicar.

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

Para activar el panel en producción:

1. Configura en Coolify `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `AUTH_SESSION_VERSION`, `AUTH_IP_HASH_SECRET` y `ADMIN_API_SECRET` como variables runtime.
2. Configura `NEXT_PUBLIC_SITE_URL=https://quisqueyatech.com`.
3. Configura `TRUST_PROXY_HEADERS=true` únicamente cuando las peticiones lleguen mediante el proxy confiable de Coolify.
4. Copia el mismo `ADMIN_EMAIL` y `ADMIN_API_SECRET` al deployment de producción de Convex:

```powershell
Get-Clipboard | npx convex env set --prod ADMIN_EMAIL
Get-Clipboard | npx convex env set --prod ADMIN_API_SECRET
```

5. Despliega Convex y la aplicación, y entra en [https://quisqueyatech.com/sign-in](https://quisqueyatech.com/sign-in).

Al rotar la contraseña, genera un nuevo `ADMIN_PASSWORD_HASH` e incrementa `AUTH_SESSION_VERSION`. Al rotar `ADMIN_API_SECRET`, actualiza Next.js y Convex como una sola operación para evitar interrupciones.

## Verificación

```bash
npm run lint
npm run build
docker build -t quisqueyatech-coolify .
```
