import { randomUUID } from "node:crypto";
import type { Locale } from "../../types/ui";
import type { SQLiteDatabase } from "../db/sqlite";
import type { PostStatus } from "../db/repositories/posts";

export interface ContentActor {
  type: "admin" | "agent" | "system";
  id: string;
  label: string;
  email: string;
}

export interface PostInput {
  locale: Locale;
  slug: string;
  translationKey?: string;
  title: string;
  excerpt: string;
  category?: string;
  body: string;
  imageId?: string;
  imageAlt?: string;
  seoTitle?: string;
  seoDescription?: string;
  readingMinutes?: number;
  featured?: boolean;
  status: PostStatus;
  publishedAt?: number;
}

interface PostRow extends Record<string, unknown> {
  id: string; locale: Locale; slug: string; translationKey: string | null; title: string; excerpt: string;
  category: string | null; body: string; imageId: string | null; imageAlt: string | null;
  seoTitle: string | null; seoDescription: string | null; readingMinutes: number | null;
  featured: number | null; status: PostStatus; publishedAt: number | null; authorEmail: string;
  actorType: ContentActor["type"] | null; actorId: string | null; actorLabel: string | null;
  createdAt: number; updatedAt: number;
}

interface RevisionRow extends Record<string, unknown> {
  id: string; postId: string; snapshot: string; reason: string; actorEmail: string;
  actorType: ContentActor["type"] | null; actorId: string | null; actorLabel: string | null; createdAt: number;
}

const ACCEPTED_IMAGES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function readingMinutes(body: string) {
  return Math.max(1, Math.ceil(body.trim().split(/\s+/).filter(Boolean).length / 220));
}

function editable(post: PostRow) {
  return {
    locale: post.locale,
    slug: post.slug,
    translationKey: post.translationKey,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    body: post.body,
    imageId: post.imageId,
    imageAlt: post.imageAlt,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    readingMinutes: post.readingMinutes,
    featured: post.featured === 1,
    status: post.status,
    publishedAt: post.publishedAt,
  };
}

function normalizeInput(raw: PostInput, now: number, forcedStatus?: PostStatus): PostInput {
  const input = { ...raw, status: forcedStatus ?? raw.status };
  if (!input.slug.trim() || !input.title.trim() || !input.excerpt.trim() || !input.body.trim()) throw new Error("VALIDATION_ERROR: required post fields");
  if (input.status === "published" && input.publishedAt === undefined) input.publishedAt = now;
  if ((input.status === "published" || input.status === "scheduled") && input.imageId && !input.imageAlt?.trim()) {
    throw new Error("VALIDATION_ERROR: cover image alt text is required");
  }
  if (input.status === "scheduled" && (!input.publishedAt || input.publishedAt <= now)) throw new Error("VALIDATION_ERROR: scheduled publication must be in the future");
  if (input.status === "published" && (input.publishedAt ?? now) > now) throw new Error("VALIDATION_ERROR: future publication requires scheduled status");
  return input;
}

export class ContentService {
  constructor(private readonly database: SQLiteDatabase) {}

  list(input: { locale?: Locale; status?: PostStatus; limit?: number; offset?: number } = {}) {
    const clauses: string[] = [];
    const params: Array<string | number> = [];
    if (input.locale) { clauses.push("locale=?"); params.push(input.locale); }
    if (input.status) { clauses.push("status=?"); params.push(input.status); }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    params.push(Math.min(200, Math.max(1, input.limit ?? 50)), Math.max(0, input.offset ?? 0));
    return this.database.prepare(`
      SELECT id,locale,slug,translationKey,title,excerpt,status,publishedAt,updatedAt,imageAlt
      FROM posts ${where} ORDER BY updatedAt DESC,id DESC LIMIT ? OFFSET ?
    `).all(...params);
  }

  search(search: string, locale?: Locale, status?: PostStatus, limit = 50) {
    const clauses = ["postsSearch MATCH ?"];
    const params: Array<string | number> = [search];
    if (locale) { clauses.push("p.locale=?"); params.push(locale); }
    if (status) { clauses.push("p.status=?"); params.push(status); }
    params.push(Math.min(50, Math.max(1, limit)));
    return this.database.prepare(`
      SELECT p.id,p.locale,p.slug,p.translationKey,p.title,p.excerpt,p.status,p.publishedAt,p.updatedAt,p.imageAlt
      FROM postsSearch JOIN posts p ON p.rowid=postsSearch.rowid
      WHERE ${clauses.join(" AND ")} ORDER BY rank LIMIT ?
    `).all(...params);
  }

  get(id: string) {
    return this.database.prepare("SELECT * FROM posts WHERE id=? LIMIT 1").get(id) as PostRow | undefined;
  }

  saveAdmin(input: PostInput & { id?: string; expectedUpdatedAt?: number; idempotencyKey?: string }, actor: ContentActor, now = Date.now()) {
    return this.database.transaction(() => {
      if (!input.id && input.idempotencyKey) {
        const prior = this.idempotencyGet("create-post", input.idempotencyKey, now);
        if (prior) return prior as { id: string; updatedAt: number };
      }
      const normalized = normalizeInput(input, now);
      this.assertUnique(normalized, input.id);
      const values = this.values(normalized, actor, now);
      if (input.id) {
        const current = this.get(input.id);
        if (!current) throw new Error("Post not found");
        if (input.expectedUpdatedAt === undefined || current.updatedAt !== input.expectedUpdatedAt) throw new Error("CONFLICT: stale post revision");
        this.insertRevision(current, "save", actor, now);
        this.updatePost(input.id, values);
        if (normalized.imageId) this.makeMediaPermanent(normalized.imageId, input.id);
        return { id: input.id, updatedAt: now };
      }
      const id = randomUUID();
      this.database.prepare(`
        INSERT INTO posts(
          id,locale,slug,translationKey,title,excerpt,category,body,imageId,imageAlt,seoTitle,seoDescription,
          readingMinutes,featured,status,publishedAt,authorEmail,actorType,actorId,actorLabel,createdAt,updatedAt
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(id, ...this.insertParams(normalized, actor, now));
      if (normalized.imageId) this.makeMediaPermanent(normalized.imageId, id);
      const result = { id, updatedAt: now };
      if (input.idempotencyKey) this.idempotencyPut("create-post", input.idempotencyKey, result, now);
      return result;
    });
  }

  archive(id: string, actor: ContentActor, now = Date.now()) {
    return this.database.transaction(() => {
      const current = this.get(id);
      if (!current) throw new Error("Post not found");
      this.insertRevision(current, "archive", actor, now);
      this.database.prepare("UPDATE posts SET status='archived',actorType=?,actorId=?,actorLabel=?,updatedAt=? WHERE id=?").run(actor.type, actor.id, actor.label, now, id);
    });
  }

  revisions(postId: string, limit = 30) {
    return this.database.prepare("SELECT * FROM postRevisions WHERE postId=? ORDER BY createdAt DESC LIMIT ?").all(postId, Math.min(100, Math.max(1, limit))) as RevisionRow[];
  }

  restore(postId: string, revisionId: string, expectedUpdatedAt: number, actor: ContentActor, now = Date.now()) {
    return this.database.transaction(() => {
      const revision = this.database.prepare("SELECT * FROM postRevisions WHERE id=? LIMIT 1").get(revisionId) as RevisionRow | undefined;
      if (!revision || revision.postId !== postId) throw new Error("VALIDATION_ERROR: revision does not belong to post");
      const current = this.get(postId);
      if (!current) throw new Error("Post not found");
      if (current.updatedAt !== expectedUpdatedAt) throw new Error("CONFLICT: stale post revision");
      this.insertRevision(current, "before-restore", actor, now);
      const snapshot = JSON.parse(revision.snapshot) as PostInput;
      const normalized = normalizeInput(snapshot, now);
      this.assertUnique(normalized, postId);
      this.updatePost(postId, this.values(normalized, actor, now));
      return postId;
    });
  }

  registerMedia(input: { storageId: string; filename: string; contentType: string; purpose: string; ownerEmail: string }, now = Date.now()) {
    const storage = this.database.prepare("SELECT id,size,contentType FROM storageObjects WHERE id=? LIMIT 1").get(input.storageId) as { id: string; size: number | null; contentType: string | null } | undefined;
    if (!storage || (storage.size ?? Infinity) > 5_000_000 || !storage.contentType || storage.contentType !== input.contentType || !ACCEPTED_IMAGES.has(storage.contentType)) {
      throw new Error("Invalid media upload");
    }
    const id = randomUUID();
    this.database.prepare(`
      INSERT INTO media(id,storageId,filename,contentType,purpose,ownerEmail,lifecycle,expiresAt,createdAt)
      VALUES (?,?,?,?,?,?,'temporary',?,?)
    `).run(id,input.storageId,input.filename,input.contentType,input.purpose,input.ownerEmail,now + 86_400_000,now);
    return id;
  }

  recordAiRun(input: { postId?: string; action: string; provider: string; model: string; status: string; warnings: string[]; inputTokens?: number; outputTokens?: number; durationMs: number; actorEmail: string }, now = Date.now()) {
    const id = randomUUID();
    this.database.prepare(`
      INSERT INTO aiRuns(id,postId,action,provider,model,status,warnings,inputTokens,outputTokens,durationMs,actorEmail,createdAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(id,input.postId ?? null,input.action,input.provider,input.model,input.status,JSON.stringify(input.warnings),input.inputTokens ?? null,input.outputTokens ?? null,input.durationMs,input.actorEmail,now);
    return id;
  }

  idempotencyGet(scope: string, key: string, now = Date.now()) {
    const row = this.database.prepare("SELECT id,value,expiresAt FROM apiIdempotency WHERE scope=? AND key=? LIMIT 1").get(scope,key) as { id: string; value: string; expiresAt: number } | undefined;
    if (!row) return null;
    if (row.expiresAt <= now) { this.database.prepare("DELETE FROM apiIdempotency WHERE id=?").run(row.id); return null; }
    return JSON.parse(row.value) as unknown;
  }

  idempotencyPut(scope: string, key: string, value: unknown, now = Date.now()) {
    const existing = this.idempotencyGet(scope,key,now);
    if (existing !== null) return existing;
    this.database.prepare(`INSERT INTO apiIdempotency(id,scope,key,value,expiresAt,createdAt) VALUES (?,?,?,?,?,?)`).run(
      randomUUID(),scope,key,JSON.stringify(value),now + 86_400_000,now,
    );
    return value;
  }

  seed(posts: Array<Omit<PostInput,"status"> & { publishedAt: number }>, actor: ContentActor, now = Date.now()) {
    return this.database.transaction(() => {
      let inserted = 0;
      for (const post of posts) {
        const exists = this.database.prepare("SELECT id FROM posts WHERE locale=? AND slug=? LIMIT 1").get(post.locale,post.slug);
        if (exists) continue;
        const normalized = normalizeInput({ ...post, status: "published" }, now);
        const id = randomUUID();
        this.database.prepare(`
          INSERT INTO posts(id,locale,slug,translationKey,title,excerpt,category,body,imageId,imageAlt,seoTitle,seoDescription,
            readingMinutes,featured,status,publishedAt,authorEmail,actorType,actorId,actorLabel,createdAt,updatedAt)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).run(id,...this.insertParams(normalized,{ ...actor,type:"system" },now));
        inserted += 1;
      }
      return { inserted };
    });
  }

  agentList(status: "draft" | "review_pending", limit = 50, offset = 0) {
    return this.database.prepare(`
      SELECT id,locale,slug,title,excerpt,status,updatedAt,actorLabel FROM posts
      WHERE status=? ORDER BY updatedAt DESC LIMIT ? OFFSET ?
    `).all(status,Math.min(200,Math.max(1,limit)),Math.max(0,offset));
  }

  agentGet(id: string) {
    const post = this.get(id);
    return post && (post.status === "draft" || post.status === "review_pending") ? post : null;
  }

  agentSave(input: Omit<PostInput,"status"|"publishedAt"> & { id?: string; expectedUpdatedAt?: number }, actor: ContentActor, now = Date.now()) {
    if (actor.type !== "agent") throw new Error("Forbidden");
    return this.database.transaction(() => {
      const normalized = normalizeInput({ ...input, status: "draft" }, now, "draft");
      this.assertUnique(normalized,input.id);
      if (input.id) {
        const current = this.get(input.id);
        if (!current || current.status !== "draft") throw new Error("Not found");
        if (input.expectedUpdatedAt !== current.updatedAt) throw new Error("Conflict");
        this.insertRevision(current,"agent-save",actor,now);
        this.updatePost(input.id,this.values(normalized,actor,now));
        return input.id;
      }
      const id = randomUUID();
      this.database.prepare(`
        INSERT INTO posts(id,locale,slug,translationKey,title,excerpt,category,body,imageId,imageAlt,seoTitle,seoDescription,
          readingMinutes,featured,status,publishedAt,authorEmail,actorType,actorId,actorLabel,createdAt,updatedAt)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(id,...this.insertParams(normalized,actor,now));
      return id;
    });
  }

  agentTransition(id: string, expectedUpdatedAt: number, action: "submit" | "reopen", actor: ContentActor, now = Date.now()) {
    if (actor.type !== "agent") throw new Error("Forbidden");
    return this.database.transaction(() => {
      const post = this.get(id);
      if (!post || post.updatedAt !== expectedUpdatedAt) throw new Error(post ? "Conflict" : "Not found");
      const expected = action === "submit" ? "draft" : "review_pending";
      if (post.status !== expected) throw new Error("Not found");
      const next = action === "submit" ? "review_pending" : "draft";
      this.insertRevision(post,`agent-${action}`,actor,now);
      this.database.prepare("UPDATE posts SET status=?,actorType=?,actorId=?,actorLabel=?,updatedAt=? WHERE id=?").run(next,actor.type,actor.id,actor.label,now,id);
      return { id,status:next,updatedAt:now };
    });
  }

  publishDue(now = Date.now()) {
    const result = this.database.prepare("UPDATE posts SET status='published',updatedAt=? WHERE status='scheduled' AND publishedAt<=?").run(now,now);
    return Number(result.changes);
  }

  backfillActors(target: "posts" | "revisions", limit = 100) {
    const table = target === "posts" ? "posts" : "postRevisions";
    const rows = this.database.prepare(`SELECT id FROM ${table} WHERE actorType IS NULL LIMIT ?`).all(Math.min(500,Math.max(1,limit))) as Array<{ id:string }>;
    for (const row of rows) this.database.prepare(`UPDATE ${table} SET actorType='system',actorId='historical',actorLabel='Historical ${target === "posts" ? "content" : "revision"}' WHERE id=?`).run(row.id);
    return rows.length;
  }

  private assertUnique(input: PostInput,id?: string) {
    const slug = this.database.prepare("SELECT id FROM posts WHERE locale=? AND slug=? LIMIT 1").get(input.locale,input.slug) as { id:string }|undefined;
    if (slug && slug.id !== id) throw new Error("A post already uses this slug and locale");
    if (input.translationKey) {
      const translation = this.database.prepare("SELECT id FROM posts WHERE translationKey=? AND locale=? LIMIT 1").get(input.translationKey,input.locale) as { id:string }|undefined;
      if (translation && translation.id !== id) throw new Error("CONFLICT: translation already exists for this locale");
    }
  }

  private values(input: PostInput,actor: ContentActor,now:number) {
    return {
      locale:input.locale,slug:input.slug,translationKey:input.translationKey ?? null,title:input.title,excerpt:input.excerpt,
      category:input.category ?? null,body:input.body,imageId:input.imageId ?? null,imageAlt:input.imageAlt ?? null,
      seoTitle:input.seoTitle ?? null,seoDescription:input.seoDescription ?? null,readingMinutes:input.readingMinutes ?? readingMinutes(input.body),
      featured:input.featured ? 1 : 0,status:input.status,publishedAt:input.publishedAt ?? null,authorEmail:actor.email,
      actorType:actor.type,actorId:actor.id,actorLabel:actor.label,updatedAt:now,
    };
  }

  private insertParams(input: PostInput,actor: ContentActor,now:number) {
    const v=this.values(input,actor,now);
    return [v.locale,v.slug,v.translationKey,v.title,v.excerpt,v.category,v.body,v.imageId,v.imageAlt,v.seoTitle,v.seoDescription,
      v.readingMinutes,v.featured,v.status,v.publishedAt,v.authorEmail,v.actorType,v.actorId,v.actorLabel,now,now] as const;
  }

  private updatePost(id:string,values:ReturnType<ContentService["values"]>) {
    this.database.prepare(`UPDATE posts SET locale=?,slug=?,translationKey=?,title=?,excerpt=?,category=?,body=?,imageId=?,imageAlt=?,
      seoTitle=?,seoDescription=?,readingMinutes=?,featured=?,status=?,publishedAt=?,authorEmail=?,actorType=?,actorId=?,actorLabel=?,updatedAt=? WHERE id=?`).run(
      values.locale,values.slug,values.translationKey,values.title,values.excerpt,values.category,values.body,values.imageId,values.imageAlt,
      values.seoTitle,values.seoDescription,values.readingMinutes,values.featured,values.status,values.publishedAt,values.authorEmail,
      values.actorType,values.actorId,values.actorLabel,values.updatedAt,id,
    );
  }

  private insertRevision(post:PostRow,reason:string,actor:ContentActor,now:number) {
    this.database.prepare(`INSERT INTO postRevisions(id,postId,snapshot,reason,actorEmail,actorType,actorId,actorLabel,createdAt)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(randomUUID(),post.id,JSON.stringify(editable(post)),reason,actor.email,actor.type,actor.id,actor.label,now);
  }

  private makeMediaPermanent(storageId:string,postId:string) {
    this.database.prepare("UPDATE media SET lifecycle='permanent',associatedPostId=?,expiresAt=NULL WHERE storageId=?").run(postId,storageId);
  }
}
