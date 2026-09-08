# SQLite runtime deployment

The static website, SQLite operational runtime, and LiveKit voice worker are intentionally separate deployments.

## Topology

```text
Internet
  |
  +--> quisqueyatech.com --------------------> Astro/Nginx image (Dockerfile)
  |
  +--> api.quisqueyatech.com or /api --------> Node API image (Dockerfile.runtime)
  |                                                |
  |                                                +--> /data/quisqueyatech.sqlite
  |                                                +--> /uploads
  |
  +--> LiveKit --------------------------------> external assessment agent
                                                    |
                                                    +--> HTTPS calls back to Node API

Internal runtime worker (same Dockerfile.runtime)
  |
  +--> same /data/quisqueyatech.sqlite
  +--> same /uploads when retention/storage jobs need it
```

There are **two different workers** and they must not be conflated:

- `npm run worker:start` is the internal SQLite maintenance/outbox worker. It handles webhook delivery, scheduled publishing, retention and cleanup.
- The LiveKit assessment agent is an external voice-agent service. It connects to LiveKit and calls the assessment API with `ASSESSMENT_WORKER_SECRET`.

The API and internal worker may use the same runtime image. The internal worker overrides the default command with:

```bash
npm run worker:start
```

The static Nginx image must never contain the SQLite database or provider secrets.

## Persistent volumes

At minimum, mount persistent storage for:

```text
/data
/uploads
```

Recommended environment:

```env
SQLITE_DATABASE_PATH=/data/quisqueyatech.sqlite
SQLITE_MEDIA_OUTPUT_PATH=/uploads
```

`/data` must persist across deploys and container replacement. Do not place it on the container writable layer.

## Migration step

Run migrations explicitly before starting a new runtime release:

```bash
npm run db:migrate
npm run db:migrate:auth
```

Both commands must target the same `SQLITE_DATABASE_PATH`.

Do not configure both API and worker containers to independently auto-run migrations during simultaneous startup. The current application migrator owns transactions correctly, but two independently starting processes can both decide that a migration is pending before either commits it.

Recommended deployment order:

```text
1. stop/freeze operational writes when a schema migration requires it
2. run one migration job against the persistent volume
3. start/replace API container
4. start/replace internal worker container
5. run health and contract smoke checks
6. start/replace the external LiveKit agent only after the API contract is healthy
```

## Runtime image

Build:

```bash
docker build -f Dockerfile.runtime -t quisqueyatech-runtime .
```

The default command starts the API:

```bash
npm run api:start
```

Internal worker command:

```bash
npm run worker:start
```

## API environment

Required production values:

```env
NODE_ENV=production
API_PORT=8787
SQLITE_DATABASE_PATH=/data/quisqueyatech.sqlite
SQLITE_MEDIA_OUTPUT_PATH=/uploads
BETTER_AUTH_SECRET=<minimum 32 chars>
BETTER_AUTH_URL=https://api.quisqueyatech.com
AUTH_TRUSTED_ORIGINS=https://www.quisqueyatech.com,https://quisqueyatech.com
ADMIN_API_SECRET=<minimum 24 chars>
ADMIN_SETUP_CODE=<recommended for first-admin bootstrap>
CONFIG_ENCRYPTION_KEY=<32-byte key encoded as expected by the application>
ASSESSMENT_WORKER_SECRET=<long random secret shared only with the LiveKit agent>
ASSESSMENT_TOKEN_SECRET=<minimum 32 chars; distinct HMAC key for browser capability tokens>
TURNSTILE_SECRET_KEY=<Cloudflare Turnstile production secret>
TURNSTILE_ALLOWED_HOSTNAMES=quisqueyatech.com,www.quisqueyatech.com
```

Optional assessment values:

```env
LIVEKIT_AGENT_READY_TIMEOUT_MS=60000
ASSESSMENT_REPORT_MODEL=gemini-2.5-flash
```

`ASSESSMENT_TOKEN_SECRET`, `ASSESSMENT_WORKER_SECRET`, `BETTER_AUTH_SECRET` and `ADMIN_API_SECRET` are separate authorities and must use independent random values. Do not reuse one secret for multiple roles.

Provider credentials such as `livekitApiKey`, `livekitApiSecret` and `geminiApiKey` remain encrypted in `secretSettings` and are decrypted only by server-side runtime code. Do not convert them into `PUBLIC_*` Astro variables.

## Assessment API boundary

The Node API owns the browser-facing assessment lifecycle:

```text
POST /api/assessment/start
POST /api/assessment/progress
GET  /api/assessment/session-status
POST /api/assessment/client-diagnostic
POST /api/assessment/complete
POST /api/assessment/recover
```

`/start` is protected by Turnstile plus persistent rate limits. Successful start issues two signed capabilities:

- a short-lived `progress` token scoped to one `assessmentId`;
- a 24-hour `resume` token whose hash is stored in SQLite and consumed once.

The external LiveKit worker uses these authenticated server-to-server contracts:

```text
GET  /api/assessment/worker-config
GET  /api/assessment/prompt
POST /api/assessment/progress
POST /api/assessment/session-status
POST /api/assessment/worker-diagnostic
POST /api/assessment/provider-finalize
```

The worker authenticates with `Authorization: Bearer <ASSESSMENT_WORKER_SECRET>`. Provider keys are never returned to an unauthenticated/browser request.

## External LiveKit assessment worker

The deployed voice agent is not the internal SQLite worker. Its minimum environment is conceptually:

```env
NODE_ENV=production
ASSESSMENT_APP_URL=https://api.quisqueyatech.com
ASSESSMENT_WORKER_SECRET=<same value configured on the API>
LIVEKIT_URL=<worker-side LiveKit connection URL if required by the agent runtime>
LIVEKIT_API_KEY=<worker deployment credential if required by LiveKit worker registration>
LIVEKIT_API_SECRET=<worker deployment credential if required by LiveKit worker registration>
```

The API also stores its own encrypted LiveKit server credentials in SQLite so it can create dispatches, issue participant JWTs, delete failed rooms and perform recovery. Keep the deployment-level worker credentials and the SQLite settings operationally synchronized where they represent the same LiveKit project, but do not expose either to the browser.

## Internal worker environment

The internal worker needs:

```env
NODE_ENV=production
SQLITE_DATABASE_PATH=/data/quisqueyatech.sqlite
SQLITE_MEDIA_OUTPUT_PATH=/uploads
CONFIG_ENCRYPTION_KEY=<same key used for encrypted runtime settings>
```

Add provider/network settings only when an internal-worker responsibility needs them.

The internal worker does not need to expose a public port.

## Reverse proxy

Only intentional API health/auth/application endpoints should be routed to port `8787`.

The SQLite file and `/uploads` filesystem directory must not be directly exposed by the reverse proxy. Uploaded public assets should be served through an intentional media surface or copied to the static/CDN publication location; never serve arbitrary paths from the runtime volume.

## Client IP detection

Both Better Auth and public assessment/scheduling rate limits need an authoritative client IP signal. Do not blindly trust a client-supplied `X-Forwarded-For` header.

Set `TRUSTED_CLIENT_IP_HEADERS` only after confirming Cloudflare/Coolify overwrites or sanitizes the selected header. Until then the API intentionally falls back to `socket.remoteAddress`.

Better Auth may additionally need `advanced.ipAddress.ipAddressHeaders` or exact trusted proxies depending on the final proxy chain. Confirm the actual production forwarding behavior before enabling either setting.

## Health and contract checks

API:

```text
GET /healthz -> 200
```

The health check confirms that the API process can execute a SQLite query, but it is not sufficient to prove assessment readiness.

Minimum deployment smoke checks:

```text
GET /admin/setup/status                 -> 200
GET /machine/runtime                    -> 401 without bearer
GET /api/assessment/worker-config       -> 401 without worker bearer
GET /api/assessment/worker-config       -> 200 with worker bearer after provider config is installed
POST /api/assessment/start              -> controlled 4xx/503 before provider config; never 404
```

Before enabling public assessment traffic, run a real staging conference through:

```text
start -> LiveKit dispatch -> worker-config -> prompt -> progress
      -> session-status -> provider-finalize -> completed SQLite state
```

Also exercise recovery once and verify a duplicate recovery request does not create a second replacement session.

A successful API health check does not prove either worker is running. Monitor the internal worker through supervisor/logs and outbox progress; monitor the LiveKit agent through LiveKit worker/dispatch health and assessment telemetry.

## Backups

A backup must account for SQLite WAL mode. Prefer one of:

1. SQLite backup API / `VACUUM INTO` from a controlled maintenance process;
2. stop writers, checkpoint WAL, then copy the DB;
3. filesystem snapshot that atomically captures DB/WAL/SHM.

Do not copy only `quisqueyatech.sqlite` while writes continue and assume the copy is consistent.

Back up `/uploads` independently and record that its lifecycle is tied to database references.

## Coolify model

Recommended Coolify resources:

```text
quisqueyatech-web
  Dockerfile: Dockerfile
  public: yes
  persistent SQLite volume: no

quisqueyatech-api
  Dockerfile: Dockerfile.runtime
  command: npm run api:start
  public: yes, API hostname/path only
  persistent volume: /data
  optional shared media volume: /uploads

quisqueyatech-worker
  Dockerfile: Dockerfile.runtime
  command: npm run worker:start
  public: no
  same persistent /data volume
  same /uploads volume when required

quisqueyatech-livekit-agent
  separate LiveKit agent image/service
  public HTTP port: no
  outbound HTTPS access to quisqueyatech-api: yes
  ASSESSMENT_WORKER_SECRET: same secret as API

quisqueyatech-migrate
  one-shot/manual job using Dockerfile.runtime
  command: npm run db:migrate && npm run db:migrate:auth
  same /data volume
```

Do not create two independent SQLite volumes for API and internal worker. They must point to the same canonical database file. The external LiveKit agent does not mount the SQLite volume and reaches state only through the authenticated API contract.
