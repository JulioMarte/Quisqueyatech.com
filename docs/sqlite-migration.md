# Convex → SQLite migration

Branch: `feature/convex-to-sqlite`

## Objective

Replace Convex as the persistence/runtime data layer without coupling Astro components directly to SQL.

The migration preserves historical Convex field names (`assessmentId`, `createdAt`, etc.) and stores Convex document `_id` values as `id TEXT PRIMARY KEY`. This minimizes domain churn and keeps references stable while importing backups.

## Architecture

```text
Static public site
Astro → HTML/CSS/JS → Nginx

Stateful runtime
Browser/provider
      ↓
API / worker
      ↓
TypeScript domain services
      ↓
repositories / SQLiteDatabase
      ↓
node:sqlite
      ↓
quisqueyatech.sqlite
```

Visual components must never contain SQL. Public Astro can read SQLite at build time; operational writes require the future API/worker process.

## Why `node:sqlite`

The project requires Node.js 22.20.0+. `node:sqlite` ships with Node and avoids another native database dependency. Database access is centralized in `src/server/db/sqlite.ts`, so changing drivers later does not require changing the domain or UI.

## Schema translation

Versioned migrations:

```text
db/migrations/001_operational.sql
db/migrations/002_content_admin.sql
db/migrations/003_search.sql
db/migrations/004_booking_lead_retention.sql
```

Translations:

- `v.id(...)` → `TEXT` plus foreign keys for application-owned relations;
- `v.any()`, arrays and objects → JSON `TEXT` with `json_valid(...)` constraints;
- booleans → constrained integer `0/1`;
- Convex indexes → SQLite indexes;
- Convex `searchIndex` → FTS5 + synchronization triggers;
- `_storage` → `storageObjects` plus exported files;
- booking→lead now uses `ON DELETE CASCADE`, preventing the orphaned reference state that Convex retention could create.

The migration runner owns transaction boundaries. SQL migration files must not contain their own `BEGIN`/`COMMIT`.

## Behavioral parity matrix

`PORTED` means the historical behavior has a SQLite service/repository and dedicated tests. `ADAPTER` means the capability belongs to a third-party/runtime adapter rather than custom SQL. `PENDING` is not merge-complete.

| Historical Convex surface | SQLite replacement | State |
| --- | --- | --- |
| `schema.ts` | versioned `db/migrations/*` | PORTED |
| public `posts.published*` | `db/repositories/posts.ts` | PORTED |
| content admin/agent/revisions/media/AI/idempotency | `services/content.ts` | PORTED |
| `agenda.ts` / booking persistence | `repositories/bookings.ts` + `services/agenda.ts` | PORTED |
| assessment interview model | `domain/assessment/*` | PORTED |
| assessment persistence/lifecycle/telemetry/recovery | `repositories/assessments.ts` + `services/assessments.ts` | PORTED |
| `webhookDelivery.ts` | repository + lease/retry service | PORTED |
| `webhookHttp.ts` | `services/webhook-http.ts` | PORTED |
| webhook scheduled consumer | `workers/webhook-delivery.ts` | PORTED |
| `settings.ts` | `services/settings.ts` | PORTED |
| `funnel.ts` | `services/funnel.ts` | PORTED |
| `retention.ts` | `services/retention.ts` | PORTED |
| admin install/recovery/content agents/security rate limits | `services/admin-security.ts` | PORTED |
| Better Auth user/session/account/verification storage | Better Auth native SQLite adapter | ADAPTER |
| Better Auth HTTP routes | future API server | PENDING |
| `/machine/runtime` | future API server using `SettingsService.internalRuntime()` | PENDING |
| scheduled cron execution | future worker process/scheduler | PENDING |

Do not call the migration complete while any required runtime row above remains `PENDING`.

## Runtime security boundaries

- Admin settings never return ciphertexts. Only server-internal runtime code can read encrypted secret values.
- Webhook delivery preserves SSRF/DNS-rebinding protection, HMAC signing, pinned DNS resolution, timeout handling and sanitized errors.
- Admin bootstrap and recovery claims use transactional leases.
- Content agents use two-phase activation/rotation and independent rate-limit buckets.
- Better Auth is not reimplemented. Its user/password/session tables should be managed by Better Auth's supported SQLite adapter in the API server.

## Create the database

```bash
npm run db:migrate
```

Default:

```text
data/quisqueyatech.sqlite
```

Override:

```env
SQLITE_DATABASE_PATH=/absolute/path/quisqueyatech.sqlite
```

SQLite, WAL and SHM files are gitignored.

## Export and import Convex

Keep the original Convex export immutable:

```bash
npx convex export --prod --include-file-storage --path snapshot.zip
```

Extract it, then:

```bash
npm install
npm run db:migrate
npm run db:import:convex -- /path/to/extracted-snapshot
```

The importer:

- preserves `_id` → `id`;
- preserves `_creationTime` → `creationTime`;
- serializes nested values explicitly;
- converts booleans to `0/1`;
- materializes `_storage` data;
- rebuilds FTS indexes;
- runs `PRAGMA foreign_key_check` and fails on broken references.

## Validation

```bash
npm run test:sqlite
npm run check
npm run build
```

CI additionally creates a real file-backed database, builds the deployment image and smoke-tests Nginx.

SQLite tests now cover schema/FTS plus domain behavior for agenda, assessments, content, retention, settings, webhook delivery/worker, funnel events and admin security. A green schema test alone is not sufficient; behavioral tests are the migration gate.

## Remaining work before merge

1. Wire Better Auth to SQLite using its supported adapter and generated/migrated auth schema.
2. Replace Convex HTTP routing with a small API server exposing only the required public/admin/machine contracts.
3. Add a long-running/scheduled worker entrypoint for webhook delivery and retention/publish cleanup.
4. Run a real Convex production snapshot through the importer and reconcile every table/file/count before cutover.
5. Perform dual-read/acceptance comparison where practical before disabling the old Convex deployment.

Never expose the SQLite file directly over HTTP and never place database paths, auth secrets or encryption keys in `PUBLIC_*` variables.
