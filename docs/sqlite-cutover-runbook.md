# Convex → SQLite cutover runbook

This runbook is intentionally conservative. The migration is not complete merely because schema and service tests pass. Production cutover requires an immutable Convex export, deterministic import, reconciliation and a tested rollback path.

## Invariants

1. Do not delete or mutate the source Convex deployment during cutover.
2. Do not accept writes in both Convex and SQLite without an explicit replication design.
3. The final production export must be taken after operational writes are frozen.
4. Never declare cutover successful if reconciliation reports an error.
5. Keep the original Convex export ZIP immutable and separately backed up.
6. SQLite, its WAL/SHM files, imported media and application secrets must live on persistent storage outside the static Nginx image.
7. API and worker processes must use the same canonical `SQLITE_DATABASE_PATH`.

## Prerequisites

Before scheduling a cutover:

- PR CI is green for SQLite tests, Better Auth schema migration, Astro check/build and deployment image smoke tests.
- `npm run db:reconcile:convex` is green against a representative export.
- API server and runtime worker have persistent process supervision and health checks.
- The SQLite directory is writable by API/worker but not exposed by the web server.
- `BETTER_AUTH_SECRET`, `ADMIN_API_SECRET`, `CONFIG_ENCRYPTION_KEY` and provider secrets exist in the deployment secret store.
- A backup destination exists for the SQLite database and imported media.
- DNS/reverse proxy routing for the API can be changed independently from the static site.

## Phase 0 — rehearse with a non-production snapshot

1. Export a current non-production or copied Convex snapshot.
2. Create an empty SQLite database.
3. Run operational migrations.
4. Run Better Auth migrations.
5. Import Convex.
6. Run reconciliation.
7. Start API and worker against that database.
8. Exercise admin login/recovery, bookings, assessment lifecycle, webhook worker and scheduled publication.
9. Destroy the rehearsal database and repeat from the same immutable snapshot. The result must be deterministic.

## Phase 1 — freeze source writes

Choose a short maintenance window.

Before the final export, prevent new operational writes to the Convex deployment. The exact mechanism depends on which legacy endpoints remain exposed, but the invariant is simple:

```text
freeze begins
→ no accepted Convex writes
→ final export
→ SQLite import/reconciliation
→ new API enabled
```

Do not rely on "nobody should be writing". The application must make source writes impossible or visibly reject them during the window.

Record:

- freeze timestamp in UTC;
- final Convex deployment identifier;
- application commit SHA;
- migration commit SHA;
- operator performing the cutover.

## Phase 2 — immutable final export

Create the final source snapshot:

```bash
npx convex export --prod --include-file-storage --path convex-final.zip
```

Immediately compute and record a checksum:

```bash
sha256sum convex-final.zip
```

Store the ZIP and checksum outside the application host as well as on the cutover host.

Extract to a new directory. Never modify the extracted source files in-place.

## Phase 3 — build a fresh SQLite target

Use a new database path rather than importing over an older rehearsal database:

```bash
export SQLITE_DATABASE_PATH=/persistent/quisqueyatech/quisqueyatech-cutover.sqlite
npm run db:migrate
npm run db:migrate:auth
```

The Better Auth schema migration must run against the same file as the application migrations.

## Phase 4 — import

```bash
export SQLITE_MEDIA_OUTPUT_PATH=/persistent/quisqueyatech/uploads
npm run db:import:convex -- /path/to/extracted-convex-final
```

The import must finish without foreign-key violations.

Do not start the API or worker yet.

## Phase 5 — mandatory reconciliation

Run:

```bash
npm run db:reconcile:convex -- /path/to/extracted-convex-final
```

The command must exit `0` and report:

- `integrity: ok`;
- zero foreign-key violations;
- exact document counts for every mapped Convex table;
- no missing imported storage files;
- FTS row counts matching their source tables;
- an empty `errors` array.

Any non-zero exit aborts cutover. Investigate and restart from a fresh SQLite target; do not patch production data manually to make the report green.

## Phase 6 — pre-switch backup

Before enabling any SQLite writes:

1. copy/checkpoint the reconciled SQLite database;
2. back up imported media;
3. record SHA-256 checksums;
4. preserve the final Convex ZIP.

At this point there must be three recoverable artifacts:

```text
Convex final export
reconciled pre-write SQLite database
imported media backup
```

## Phase 7 — start runtime in dark mode

Start the API and worker with the new SQLite path but do not route public write traffic yet.

Required checks:

```text
GET /healthz                → 200
GET /admin/setup/status     → expected state
GET /machine/runtime        → 401 without bearer
GET /machine/runtime        → 200 with exact bearer
```

Verify:

- Better Auth can read the expected admin state;
- the worker starts without migration or secret errors;
- no unexpected webhook deliveries are emitted merely by startup;
- WAL/SHM files are created on persistent storage, not in an ephemeral container layer.

## Phase 8 — switch traffic

Route the operational endpoints from Convex to the Node API.

Keep the public Astro/Nginx deployment independent. Static assets do not need to move with the operational cutover.

Immediately run one controlled transaction for every write-critical domain that is enabled in production:

- create/read a booking through the new API path;
- verify duplicate-slot protection;
- perform an assessment lifecycle smoke test if enabled;
- enqueue and process a test webhook destination owned by the project;
- verify admin authentication/session behavior;
- verify scheduled/maintenance worker health.

Do not use a third-party webhook URL that you do not control for cutover tests.

## Phase 9 — observation window

For the initial observation window:

- keep Convex frozen but available for rollback;
- monitor API errors and process restarts;
- inspect SQLite lock/busy errors;
- inspect webhook retry/dead-letter state;
- monitor disk growth for DB/WAL/media;
- take frequent SQLite backups;
- compare key operational counts against expected traffic.

Do not delete the source deployment during this period.

## Rollback

Rollback is allowed while Convex still represents the final pre-cutover state plus no post-cutover writes that must be preserved.

If rollback is required immediately after switch and before meaningful SQLite writes:

1. disable routing to the Node API;
2. stop the runtime worker;
3. restore routing to Convex;
4. unfreeze Convex writes;
5. preserve the failed SQLite database for diagnosis.

If SQLite has already accepted business writes, a blind rollback would lose those writes. In that case:

1. freeze SQLite writes;
2. export the post-cutover delta from SQLite;
3. reconcile which records do not exist in Convex;
4. migrate/replay that delta deliberately;
5. only then reopen Convex writes.

Never solve this by running both systems writable and hoping to reconcile later.

## Completion criteria

Convex may be considered removable only after all of the following are true:

- reconciliation was green from the final export;
- production operational traffic has run on SQLite without unexplained errors;
- backup/restore of SQLite and media has been tested;
- API and worker restart safely against the persistent database;
- all still-used legacy Convex endpoints have verified replacements;
- no deployed frontend/service points at Convex URLs;
- the observation window has completed;
- rollback artifacts are archived according to the retention policy.

Removal of Convex is a separate change after the cutover, not part of the cutover transaction itself.
