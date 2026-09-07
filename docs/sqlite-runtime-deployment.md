# SQLite runtime deployment

The static website and the operational runtime are intentionally separate deployments.

## Topology

```text
Internet
  |
  +--> quisqueyatech.com --------------------> Astro/Nginx image (Dockerfile)
  |
  +--> api.quisqueyatech.com or /api --------> Node API image (Dockerfile.runtime)
                                                   |
                                                   +--> /data/quisqueyatech.sqlite
                                                   +--> /uploads

Runtime worker image (same Dockerfile.runtime)
  |
  +--> same /data/quisqueyatech.sqlite
  +--> same /uploads when retention/storage jobs need it
```

The API and worker may use the same runtime image. The worker overrides the default command with:

```bash
npm run worker:start
```

The static Nginx image must never contain the SQLite database.

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
4. start/replace worker container
5. run health checks
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

Worker command:

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
```

Provider-specific encrypted values belong in `secretSettings`/the deployment secret store as designed by `SettingsService`; do not convert them into `PUBLIC_*` Astro variables.

## Worker environment

The worker needs:

```env
NODE_ENV=production
SQLITE_DATABASE_PATH=/data/quisqueyatech.sqlite
SQLITE_MEDIA_OUTPUT_PATH=/uploads
CONFIG_ENCRYPTION_KEY=<same key used for encrypted runtime settings>
```

Add provider/network settings only when a worker responsibility needs them.

The worker does not need to expose a public port.

## Reverse proxy

Only the API health/auth/application endpoints should be routed to port `8787`.

The SQLite file and `/uploads` filesystem directory must not be directly exposed by the reverse proxy. Uploaded public assets should be served through an intentional media surface or copied to the static/CDN publication location; never serve arbitrary paths from the runtime volume.

## Better Auth client IP detection

Better Auth rate limiting should receive a client IP from a header set and sanitized by the trusted reverse proxy. Do not blindly trust a client-supplied forwarding header.

If the production proxy sets a single authoritative header, configure Better Auth `advanced.ipAddress.ipAddressHeaders` for that header. If using a proxy chain, configure the exact trusted proxy addresses/CIDRs instead. Confirm the actual Coolify/Cloudflare proxy behavior before enabling either setting.

## Health checks

API:

```text
GET /healthz -> 200
```

The health check confirms that the API process can execute a SQLite query.

Additional deployment smoke checks:

```text
GET /admin/setup/status  -> 200
GET /machine/runtime     -> 401 without bearer
```

A successful API health check is necessary but does not prove the worker is running. Monitor the worker process separately through its supervisor/logs and by checking outbox progress.

## Backups

A backup must account for SQLite WAL mode. Prefer one of:

1. SQLite backup API / VACUUM INTO from a controlled maintenance process;
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

quisqueyatech-migrate
  one-shot/manual job using Dockerfile.runtime
  command: npm run db:migrate && npm run db:migrate:auth
  same /data volume
```

Do not create two independent SQLite volumes for API and worker. They must point to the same canonical database file.
