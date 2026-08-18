# Convex → SQLite migration

Branch: `feature/convex-to-sqlite`

## Objective

Replace Convex as the persistence layer without coupling Astro components directly to SQL.

The migration preserves the historical Convex field names (`assessmentId`, `createdAt`, etc.) and stores Convex document `_id` values as `id TEXT PRIMARY KEY`. This minimizes domain-level code churn and keeps references stable while importing a Convex backup.

## Architecture

```text
Astro / application code
        ↓
TypeScript repositories
        ↓
SQLiteDatabase
        ↓
node:sqlite
        ↓
SQLite file
```

SQL must not be embedded in visual components.

## Runtime boundary

The current `development` architecture produces a static Astro site served by Nginx. A static Nginx container cannot mutate SQLite in response to browser requests.

Therefore this branch deliberately separates two use cases:

1. **Build-time/public content** — posts and categories can be read from SQLite while Astro builds static pages.
2. **Operational writes** — leads, assessments, bookings, webhooks, admin mutations and other stateful flows require a server process/API if they are re-enabled.

The SQLite schema includes the operational tables so historical Convex data can be preserved and the future API can use the same database, but this branch does not pretend that Nginx itself replaces the old Convex function runtime.

## Why `node:sqlite`

The project already requires Node.js 22.20.0+. `node:sqlite` is included in Node and does not require a native npm dependency. `DatabaseSync` is acceptable here because static builds and the intended lightweight administrative/API workload do not need a high-concurrency database driver abstraction at this stage.

Database access is centralized in `src/server/db/sqlite.ts`, so moving to another SQLite driver later does not require rewriting UI code.

## Schema translation

Convex tables are translated in:

```text
db/migrations/001_operational.sql
db/migrations/002_content_admin.sql
db/migrations/003_search.sql
```

Important translations:

- `v.id(...)` → `TEXT` plus foreign keys where the target is an application table.
- `v.any()`, arrays and objects → JSON encoded as `TEXT` with `json_valid(...)` checks.
- booleans → `INTEGER` constrained to `0/1`.
- Convex indexes → SQLite indexes.
- Convex `searchIndex` for bookings/posts → SQLite FTS5 virtual tables + synchronization triggers.
- `_storage` metadata → `storageObjects`; exported files are copied into `public/uploads` for static publication.

## Create the database

```bash
npm run db:migrate
```

Default location:

```text
data/quisqueyatech.sqlite
```

Override it with:

```env
SQLITE_DATABASE_PATH=/absolute/path/quisqueyatech.sqlite
```

The local SQLite database, WAL and SHM files are gitignored.

## Export Convex

From the old Convex project/deployment, create a snapshot. For production data:

```bash
npx convex export --prod --include-file-storage --path snapshot.zip
```

Keep the original ZIP as an immutable backup before importing anything.

Extract the ZIP. Convex snapshots contain one directory per table and `documents.jsonl` inside each table directory.

## Import the snapshot

First create/migrate SQLite:

```bash
npm run db:migrate
```

Then import the extracted directory:

```bash
npm run db:import:convex -- /path/to/extracted-snapshot
```

The importer:

- preserves `_id` as `id`;
- preserves `_creationTime` as `creationTime`;
- serializes nested Convex JSON values;
- converts booleans to SQLite `0/1`;
- copies `_storage` files into `public/uploads`;
- rebuilds FTS indexes;
- runs `PRAGMA foreign_key_check` after import and fails on broken references.

The importer intentionally does not silently accept an unextracted ZIP.

## Public post repository

The old public Convex queries:

```text
posts.published
posts.publishedBySlug
```

are represented by:

```text
src/server/db/repositories/posts.ts
```

with:

```ts
getPublishedPosts(locale)
getPublishedPost(locale, slug)
searchPosts(...)
```

Only published posts whose `publishedAt <= Date.now()` are returned, preserving the old publication semantics.

## Tests

Run:

```bash
npm run test:sqlite
```

Tests verify:

- expected Convex tables exist in SQLite;
- locale and foreign-key constraints reject invalid data;
- FTS5 search works for posts and bookings.

CI additionally runs a file-backed migration smoke test.

## Remaining application migration

The schema/data migration is not equivalent to porting every historical Convex function. The old code also supplied transaction boundaries, authentication context, scheduled jobs, storage APIs and server-side function execution.

Before re-enabling those capabilities, port each domain behind a repository/service boundary:

```text
posts/content      → SQLite repositories (started)
bookings/agenda    → booking service + SQLite repository
assessments        → assessment service + SQLite repository
webhooks/outbox    → worker/service + SQLite repository
auth/admin         → server auth layer; never browser-to-SQLite
scheduled cleanup  → cron/worker process
```

Do not expose the SQLite file directly over HTTP and do not move database credentials/paths into `PUBLIC_*` variables.
