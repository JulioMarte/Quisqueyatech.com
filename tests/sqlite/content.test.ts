import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { SQLiteDatabase } from "../../src/server/db/sqlite";
import { ContentService, type ContentActor, type PostInput } from "../../src/server/services/content";

const NOW = 1_800_000_000_000;
const admin: ContentActor = { type: "admin", id: "admin-1", label: "Admin", email: "admin@example.com" };
const agent: ContentActor = { type: "agent", id: "agent-1", label: "Writer Agent", email: "writer-agent" };

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "quisqueya-content-"));
  const database = new SQLiteDatabase({ path: join(directory, "test.sqlite") });
  return { database, service: new ContentService(database), close() { database.close(); rmSync(directory, { recursive: true, force: true }); } };
}

function post(overrides: Partial<PostInput> = {}): PostInput {
  return {
    locale: "es", slug: "automatizacion-clinicas", translationKey: "automation-clinics", title: "Automatización para clínicas",
    excerpt: "Una guía práctica", category: "Automatización", body: "contenido ".repeat(500), imageAlt: "Flujo de automatización",
    status: "draft", ...overrides,
  };
}

test("admin create is idempotent and enforces slug/translation uniqueness", () => {
  const f = fixture();
  try {
    const first = f.service.saveAdmin({ ...post(), idempotencyKey: "create-1" }, admin, NOW);
    const replay = f.service.saveAdmin({ ...post({ title: "ignored replay" }), idempotencyKey: "create-1" }, admin, NOW + 1);
    assert.deepEqual(replay, first);
    assert.equal((f.database.prepare("SELECT count(*) AS count FROM posts").get() as { count: number }).count, 1);
    assert.throws(() => f.service.saveAdmin({ ...post({ translationKey: "other" }) }, admin, NOW + 2), /slug/);
    assert.throws(() => f.service.saveAdmin({ ...post({ slug: "otro" }) }, admin, NOW + 2), /translation/);
  } finally { f.close(); }
});

test("optimistic updates create revisions and reject stale writes", () => {
  const f = fixture();
  try {
    const created = f.service.saveAdmin(post(), admin, NOW);
    const updated = f.service.saveAdmin({ ...post({ title: "Nueva versión" }), id: created.id, expectedUpdatedAt: created.updatedAt }, admin, NOW + 100);
    assert.equal(f.service.get(created.id)?.title, "Nueva versión");
    assert.equal(f.service.revisions(created.id).length, 1);
    assert.throws(() => f.service.saveAdmin({ ...post({ title: "Stale" }), id: created.id, expectedUpdatedAt: created.updatedAt }, admin, NOW + 200), /stale/);
    assert.equal(updated.updatedAt, NOW + 100);
  } finally { f.close(); }
});

test("restore validates revision ownership and saves current state before restore", () => {
  const f = fixture();
  try {
    const created = f.service.saveAdmin(post({ title: "V1" }), admin, NOW);
    const v2 = f.service.saveAdmin({ ...post({ title: "V2" }), id: created.id, expectedUpdatedAt: created.updatedAt }, admin, NOW + 10);
    const revision = f.service.revisions(created.id)[0]!;
    f.service.restore(created.id, revision.id, v2.updatedAt, admin, NOW + 20);
    assert.equal(f.service.get(created.id)?.title, "V1");
    assert.equal(f.service.revisions(created.id).length, 2);
  } finally { f.close(); }
});

test("scheduled publication and FTS move with post updates", () => {
  const f = fixture();
  try {
    const created = f.service.saveAdmin(post({ status: "scheduled", publishedAt: NOW + 1000, title: "Tecnología dental avanzada" }), admin, NOW);
    assert.equal(f.service.publishDue(NOW + 999), 0);
    assert.equal(f.service.publishDue(NOW + 1000), 1);
    assert.equal(f.service.get(created.id)?.status, "published");
    assert.equal((f.service.search("dental") as Array<{ id:string }>)[0]?.id, created.id);
  } finally { f.close(); }
});

test("agent workflow only edits drafts and transitions draft ↔ review_pending with revisions", () => {
  const f = fixture();
  try {
    const id = f.service.agentSave({ ...post(), status: undefined as never, publishedAt: undefined as never }, agent, NOW);
    const draft = f.service.get(id)!;
    const submitted = f.service.agentTransition(id, draft.updatedAt, "submit", agent, NOW + 10);
    assert.equal(submitted.status, "review_pending");
    assert.equal(f.service.agentGet(id)?.status, "review_pending");
    assert.throws(() => f.service.agentSave({ ...post({ title: "Should fail" }), id, expectedUpdatedAt: submitted.updatedAt, status: undefined as never, publishedAt: undefined as never }, agent, NOW + 20), /Not found/);
    const reopened = f.service.agentTransition(id, submitted.updatedAt, "reopen", agent, NOW + 30);
    assert.equal(reopened.status, "draft");
    assert.ok(f.service.revisions(id).length >= 2);
  } finally { f.close(); }
});

test("media is validated then becomes permanent when attached to a post", () => {
  const f = fixture();
  try {
    f.database.prepare("INSERT INTO storageObjects(id,size,contentType,path) VALUES ('image-1',1000,'image/webp','/tmp/image.webp')").run();
    const mediaId = f.service.registerMedia({ storageId: "image-1", filename: "cover.webp", contentType: "image/webp", purpose: "post-cover", ownerEmail: admin.email }, NOW);
    assert.equal((f.database.prepare("SELECT lifecycle FROM media WHERE id=?").get(mediaId) as { lifecycle:string }).lifecycle, "temporary");
    f.service.saveAdmin(post({ imageId: "image-1", status: "published", publishedAt: NOW }), admin, NOW);
    const media = f.database.prepare("SELECT lifecycle,expiresAt,associatedPostId FROM media WHERE id=?").get(mediaId) as Record<string, unknown>;
    assert.equal(media.lifecycle, "permanent");
    assert.equal(media.expiresAt, null);
    assert.ok(media.associatedPostId);
  } finally { f.close(); }
});

test("archive, AI audit, generic idempotency and seed retain historical semantics", () => {
  const f = fixture();
  try {
    const created = f.service.saveAdmin(post(), admin, NOW);
    f.service.archive(created.id, admin, NOW + 1);
    assert.equal(f.service.get(created.id)?.status, "archived");
    assert.equal(f.service.revisions(created.id)[0]?.reason, "archive");
    f.service.recordAiRun({ postId: created.id, action: "rewrite", provider: "openai", model: "model", status: "ok", warnings: [], durationMs: 10, actorEmail: admin.email }, NOW + 2);
    assert.equal((f.database.prepare("SELECT count(*) AS count FROM aiRuns").get() as { count:number }).count, 1);
    assert.deepEqual(f.service.idempotencyPut("scope", "key", { ok: true }, NOW), { ok: true });
    assert.deepEqual(f.service.idempotencyPut("scope", "key", { ok: false }, NOW + 1), { ok: true });
    assert.deepEqual(f.service.seed([{ ...post({ slug: "seed", translationKey: "seed-key" }), publishedAt: NOW - 1 }], admin, NOW + 3), { inserted: 1 });
    assert.deepEqual(f.service.seed([{ ...post({ slug: "seed", translationKey: "seed-key" }), publishedAt: NOW - 1 }], admin, NOW + 4), { inserted: 0 });
  } finally { f.close(); }
});
