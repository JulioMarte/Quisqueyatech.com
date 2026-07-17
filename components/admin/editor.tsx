"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Archive,
  Bot,
  Check,
  Clock3,
  Copy,
  FilePlus2,
  History,
  ImagePlus,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Eyebrow, Section } from "@/components/ui/section";
import { adminRequest, type AdminPage } from "@/lib/client/admin-response";

const VisualMarkdownEditor = dynamic(() => import("@/components/admin/visual-markdown-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[440px] items-center justify-center rounded-xl border border-line bg-white">
      <Loader2 className="h-5 w-5 animate-spin text-tech" />
    </div>
  ),
});

type Status = "draft" | "review_pending" | "scheduled" | "published" | "archived";
type Post = {
  _id?: string;
  locale: "es" | "en";
  slug: string;
  translationKey?: string;
  title: string;
  excerpt: string;
  category?: string;
  body: string;
  imageId?: string;
  imageUrl?: string | null;
  imageAlt?: string;
  seoTitle?: string;
  seoDescription?: string;
  readingMinutes?: number;
  featured?: boolean;
  status: Status;
  publishedAt?: number;
  updatedAt?: number;
  actorType?: "admin" | "agent" | "system";
  actorLabel?: string;
};
type Proposal = Partial<
  Pick<
    Post,
    "title" | "slug" | "excerpt" | "category" | "body" | "seoTitle" | "seoDescription" | "imageAlt"
  >
> & {
  alternativeTitles?: string[];
  outline?: string[];
  imagePrompt?: string;
  warnings?: string[];
};
type Revision = { _id: string; reason: string; createdAt: number };

const emptyPost = (): Post => ({
  locale: "es",
  slug: "",
  title: "",
  excerpt: "",
  category: "Automatización",
  body: "",
  status: "draft",
  translationKey: crypto.randomUUID(),
});

export function AdminEditor({
  onDirtyChange,
  saveRef,
}: {
  onDirtyChange?: (dirty: boolean) => void;
  saveRef?: React.MutableRefObject<(() => Promise<boolean>) | null>;
}) {
  const changeDialog = useRef<HTMLDialogElement>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [post, setPost] = useState<Post>(emptyPost);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [tab, setTab] = useState<"content" | "seo" | "preview" | "history">("content");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [brief, setBrief] = useState("");
  const [audience, setAudience] = useState("Dueños y líderes de pequeñas y medianas empresas");
  const [objective, setObjective] = useState(
    "Educar con claridad y ayudar a tomar una decisión informada",
  );
  const [sources, setSources] = useState("");
  const [aiAction, setAiAction] = useState("draft");
  const [generating, setGenerating] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [uploading, setUploading] = useState(false);
  const editVersion = useRef(0);
  const createIdempotencyKey = useRef<string | null>(null);
  const objectUrl = useRef<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    | { kind: "new" }
    | { kind: "select"; id: string }
    | { kind: "archive" }
    | { kind: "restore"; revisionId: string }
    | null
  >(null);
  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);
  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  const loadPosts = useCallback(async () => {
    const params = new URLSearchParams({ limit: "50" });
    if (query.trim()) params.set("q", query.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    const page = await adminRequest<AdminPage<Post>>(`/api/admin/v1/posts?${params}`, {
      cache: "no-store",
    });
    setPosts(page.items);
  }, [query, statusFilter]);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(
      () =>
        loadPosts().catch((error) => {
          if (active)
            setMessage(
              error instanceof Error ? error.message : "No se pudieron cargar los recursos.",
            );
        }),
      250,
    );
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadPosts]);

  const update = useCallback(<K extends keyof Post>(key: K, value: Post[K]) => {
    setPost((current) => ({ ...current, [key]: value }));
    editVersion.current += 1;
    setDirty(true);
  }, []);
  const validDraft =
    post.title.length >= 4 &&
    post.slug.length >= 2 &&
    post.excerpt.length >= 10 &&
    post.body.length >= 20;

  const save = useCallback(
    async (silent = false) => {
      if (!validDraft) {
        if (!silent) setMessage("Completa título, slug, resumen y contenido antes de guardar.");
        return false;
      }
      if (saving) return false;
      setSaving(true);
      const versionAtStart = editVersion.current;
      if (!post._id && !createIdempotencyKey.current)
        createIdempotencyKey.current = crypto.randomUUID();
      if (!silent) setMessage("");
      try {
        const payload = await adminRequest<{ id: string; updatedAt: number }>(
          post._id ? `/api/admin/v1/posts/${post._id}` : "/api/admin/v1/posts",
          {
            method: post._id ? "PATCH" : "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": createIdempotencyKey.current || crypto.randomUUID(),
            },
            body: JSON.stringify({ ...post, id: post._id, expectedUpdatedAt: post.updatedAt }),
          },
        );
        setPost((current) => ({
          ...current,
          _id: String(payload.id),
          updatedAt: payload.updatedAt,
        }));
        createIdempotencyKey.current = null;
        if (editVersion.current === versionAtStart) setDirty(false);
        if (!silent) setMessage("Recurso guardado correctamente.");
        await loadPosts();
        return true;
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "No se pudo guardar.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [loadPosts, post, saving, validDraft],
  );
  useEffect(() => {
    if (saveRef) saveRef.current = () => save(false);
    return () => {
      if (saveRef) saveRef.current = null;
    };
  }, [save, saveRef]);

  useEffect(() => {
    if (!dirty || !post._id || !validDraft || post.status !== "draft") return;
    const timer = window.setTimeout(() => void save(true), 2500);
    return () => window.clearTimeout(timer);
  }, [dirty, post._id, post.status, save, saving, validDraft]);

  const visiblePosts = useMemo(
    () =>
      posts.filter(
        (item) =>
          (statusFilter === "all" || item.status === statusFilter) &&
          `${item.title} ${item.category || ""}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [posts, query, statusFilter],
  );
  const checklist = [
    {
      label: "Título y slug",
      done: post.title.length >= 4 && post.slug.length >= 2,
    },
    { label: "Resumen", done: post.excerpt.length >= 10 },
    { label: "Contenido", done: post.body.length >= 20 },
    { label: "SEO", done: Boolean(post.seoTitle && post.seoDescription) },
    {
      label: "Portada accesible",
      done: !post.imageId || Boolean(post.imageAlt),
    },
  ];

  async function generate() {
    if (brief.trim().length < 5) {
      setMessage("Describe primero lo que quieres generar.");
      return;
    }
    setGenerating(true);
    setProposal(null);
    setMessage("");
    try {
      const payload = await adminRequest<{ proposal: Proposal }>("/api/admin/v1/ai/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          action: aiAction,
          postId: post._id,
          locale: post.locale,
          targetLocale: post.locale === "es" ? "en" : "es",
          brief,
          audience,
          objective,
          sources: sources
            .split(/\r?\n/)
            .map((value) => value.trim())
            .filter(Boolean),
          currentContent: post.body,
        }),
      });
      setProposal(payload.proposal);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "La IA no pudo completar la solicitud.");
    } finally {
      setGenerating(false);
    }
  }

  function applyProposal() {
    if (!proposal) return;
    setPost((current) => ({
      ...current,
      ...Object.fromEntries(
        Object.entries(proposal).filter(([key, value]) => value !== undefined && key in current),
      ),
    }));
    setDirty(true);
    setProposal(null);
    setMessage("Propuesta aplicada como borrador. Revísala antes de publicar.");
  }

  async function archive() {
    if (!post._id) return;
    try {
      await adminRequest<{ id: string }>(`/api/admin/v1/posts/${post._id}`, { method: "DELETE" });
      await loadPosts();
      setPost(emptyPost());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo archivar.");
    }
  }
  async function executeAction(action: NonNullable<typeof pendingAction>) {
    if (action.kind === "new") {
      setPost(emptyPost());
      createIdempotencyKey.current = null;
      setDirty(false);
      setTab("content");
      return;
    }
    if (action.kind === "archive") {
      await archive();
      return;
    }
    if (action.kind === "restore") {
      await restore(action.revisionId);
      return;
    }
    try {
      const data = await adminRequest<{ post: Post }>(`/api/admin/v1/posts/${action.id}`);
      setPost(data.post);
      setDirty(false);
      setTab("content");
      setProposal(null);
      requestAnimationFrame(() => document.getElementById("post-editor-main")?.focus());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar el recurso.");
    }
  }
  function requestAction(action: NonNullable<typeof pendingAction>) {
    if (dirty || action.kind === "archive") {
      setPendingAction(action);
      changeDialog.current?.showModal();
      return;
    }
    void executeAction(action);
  }
  async function confirmPending(saveFirst: boolean) {
    if (!pendingAction) return;
    if (saveFirst && !(await save())) return;
    const action = pendingAction;
    setPendingAction(null);
    changeDialog.current?.close();
    if (!saveFirst) setDirty(false);
    await executeAction(action);
  }
  async function seedContent() {
    try {
      await adminRequest<{ inserted: number }>("/api/admin/v1/posts/seed", { method: "POST" });
      await loadPosts();
      setMessage("Contenido inicial migrado sin duplicar recursos existentes.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo migrar el contenido inicial.",
      );
    }
  }
  async function loadHistory() {
    if (!post._id) return;
    setTab("history");
    try {
      const detail = await adminRequest<{ post: Post; revisions?: Revision[] }>(
        `/api/admin/v1/posts/${post._id}?include=revisions`,
      );
      setRevisions(detail.revisions || []);
    } catch (error) {
      setRevisions([]);
      setMessage(error instanceof Error ? error.message : "No se pudo cargar el historial.");
    }
  }
  async function restore(revisionId: string) {
    if (!post._id) return;
    try {
      await adminRequest<{ id: string }>(`/api/admin/v1/posts/${post._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisionId, expectedUpdatedAt: post.updatedAt }),
      });
      const detail = await adminRequest<{ post: Post }>(`/api/admin/v1/posts/${post._id}`);
      setPost(detail.post);
      setDirty(false);
      await loadPosts();
      setMessage("Versión restaurada. Selecciona el recurso para revisarla.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo restaurar la versión.");
    }
  }

  async function upload(file?: File) {
    if (!file) return;
    if (
      file.size > 5_000_000 ||
      !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)
    )
      return setMessage("Usa JPG, PNG, WebP o AVIF de máximo 5 MB.");
    setUploading(true);
    try {
      const first = await adminRequest<{ uploadUrl: string }>("/api/admin/v1/media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const sent = await fetch(first.uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const stored = await sent.json();
      if (!sent.ok) throw new Error("No se pudo subir la imagen");
      await adminRequest<{ id: string }>("/api/admin/v1/media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageId: stored.storageId,
          filename: file.name,
          contentType: file.type,
          purpose: "post-cover",
        }),
      });
      update("imageId", stored.storageId);
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = URL.createObjectURL(file);
      setPost((current) => ({
        ...current,
        imageUrl: objectUrl.current,
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo subir la portada.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Section className="min-h-screen bg-bg-2 py-10">
      <Container className="max-w-[1600px]">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <Eyebrow>Administración editorial</Eyebrow>
            <h1 className="mt-3 font-display text-3xl font-bold text-primary sm:text-4xl">
              Centro de contenido e IA
            </h1>
            <p className="mt-2 text-text-2">
              Crea, revisa, traduce y publica recursos bilingües con trazabilidad.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => requestAction({ kind: "new" })}>
              <FilePlus2 className="h-4 w-4" />
              Nuevo
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!post._id}
              onClick={() => {
                setPost({
                  ...post,
                  _id: undefined,
                  updatedAt: undefined,
                  translationKey: crypto.randomUUID(),
                  title: `${post.title} (copia)`,
                  slug: `${post.slug}-copia`,
                  status: "draft",
                });
                setDirty(true);
              }}
            >
              <Copy className="h-4 w-4" />
              Duplicar
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!post._id}
              onClick={() => {
                setPost({
                  ...post,
                  _id: undefined,
                  updatedAt: undefined,
                  locale: post.locale === "es" ? "en" : "es",
                  slug: "",
                  title: "",
                  excerpt: "",
                  body: "",
                  status: "draft",
                });
                createIdempotencyKey.current = null;
                editVersion.current += 1;
                setDirty(true);
              }}
            >
              <FilePlus2 className="h-4 w-4" />
              Crear traducción
            </Button>
            <Button type="button" disabled={saving || !validDraft} onClick={() => void save()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </Button>
          </div>
        </div>
        <div className="mt-7 grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
          <aside className="rounded-2xl border border-line bg-white p-4 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-mute" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Buscar recursos"
                placeholder="Buscar recursos"
                className="min-h-10 w-full rounded-lg border border-line pl-9 pr-3 text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as Status | "all")}
              aria-label="Filtrar por estado"
              className="mt-3 min-h-10 w-full rounded-lg border border-line px-3 text-sm"
            >
              <option value="all">Todos los estados</option>
              <option value="draft">Borradores</option>
              <option value="review_pending">Pendientes de revisión</option>
              <option value="scheduled">Programados</option>
              <option value="published">Publicados</option>
              <option value="archived">Archivados</option>
            </select>
            {posts.length === 0 ? (
              <button
                type="button"
                onClick={() => void seedContent()}
                className="mt-4 min-h-11 w-full cursor-pointer rounded-lg border border-dashed border-tech px-3 text-sm font-semibold text-tech hover:bg-larimar-soft"
              >
                Migrar recursos iniciales
              </button>
            ) : null}
            <div className="mt-4 space-y-1">
              {visiblePosts.map((item) => (
                <button
                  type="button"
                  key={item._id}
                  onClick={() => item._id && requestAction({ kind: "select", id: item._id })}
                  className={`block min-h-11 w-full cursor-pointer rounded-xl px-3 py-2 text-left transition-colors ${item._id === post._id ? "bg-primary text-white" : "hover:bg-bg-2"}`}
                >
                  <span className="block line-clamp-2 text-sm font-semibold">{item.title}</span>
                  <span
                    className={`mt-1 block text-xs ${item._id === post._id ? "text-white/70" : "text-mute"}`}
                  >
                    {item.locale.toUpperCase()} · {item.status}
                  </span>
                  {item.actorLabel ? (
                    <span
                      className={`mt-1 block text-xs ${item._id === post._id ? "text-white/70" : "text-mute"}`}
                    >
                      Último cambio: {item.actorLabel}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </aside>
          <main id="post-editor-main" tabIndex={-1} className="min-w-0 focus:outline-none">
            <div className="flex overflow-x-auto rounded-xl border border-line bg-white p-1">
              {(["content", "seo", "preview"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  className={`min-h-10 flex-1 cursor-pointer rounded-lg px-3 text-sm font-semibold ${tab === item ? "bg-primary text-white" : "text-text-2 hover:bg-bg-2"}`}
                >
                  {item === "content"
                    ? "Contenido"
                    : item === "seo"
                      ? "SEO y publicación"
                      : "Vista previa"}
                </button>
              ))}
              <button
                type="button"
                disabled={!post._id}
                onClick={() => void loadHistory()}
                className={`min-h-10 flex-1 cursor-pointer rounded-lg px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${tab === "history" ? "bg-primary text-white" : "text-text-2 hover:bg-bg-2"}`}
              >
                Historial
              </button>
            </div>
            {tab === "content" ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2">
                  <SelectField
                    label="Idioma"
                    value={post.locale}
                    onChange={(value) => update("locale", value as Post["locale"])}
                    options={["es", "en"]}
                  />
                  <Field
                    label="Categoría"
                    value={post.category || ""}
                    onChange={(value) => update("category", value)}
                  />
                  <Field
                    label="Título"
                    value={post.title}
                    onChange={(value) => {
                      update("title", value);
                      if (!post._id) update("slug", slugify(value));
                    }}
                    wide
                  />
                  <Field
                    label="Slug"
                    value={post.slug}
                    onChange={(value) => update("slug", slugify(value))}
                    wide
                  />
                  <Field
                    label="Resumen"
                    value={post.excerpt}
                    onChange={(value) => update("excerpt", value)}
                    textarea
                    wide
                  />
                </div>
                <VisualMarkdownEditor
                  value={post.body}
                  onChange={(value) => update("body", value)}
                />
              </div>
            ) : null}
            {tab === "seo" ? (
              <div className="mt-4 space-y-5 rounded-2xl border border-line bg-white p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Título SEO"
                    value={post.seoTitle || ""}
                    onChange={(value) => update("seoTitle", value)}
                    hint={`${post.seoTitle?.length || 0}/70`}
                  />
                  <Field
                    label="Descripción SEO"
                    value={post.seoDescription || ""}
                    onChange={(value) => update("seoDescription", value)}
                    textarea
                    hint={`${post.seoDescription?.length || 0}/170`}
                  />
                  <SelectField
                    label="Estado"
                    value={post.status}
                    onChange={(value) => update("status", value as Status)}
                    options={["draft", "review_pending", "scheduled", "published", "archived"]}
                  />
                  <Field
                    label="Fecha de publicación"
                    type="datetime-local"
                    value={post.publishedAt ? localDateTime(post.publishedAt) : ""}
                    onChange={(value) =>
                      update("publishedAt", value ? new Date(value).getTime() : undefined)
                    }
                  />
                </div>
                <div>
                  <span className="mb-2 block text-sm font-medium">Portada</span>
                  <label className="flex min-h-28 cursor-pointer items-center justify-center rounded-xl border border-dashed border-line-2 bg-bg-2 p-4 text-center text-sm font-semibold text-tech">
                    {uploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="mr-2 h-4 w-4" />
                    )}
                    Subir imagen
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      className="sr-only"
                      onChange={(event) => void upload(event.target.files?.[0])}
                    />
                  </label>
                  {post.imageUrl ? (
                    <div className="relative mt-3 aspect-[16/7] overflow-hidden rounded-xl">
                      <Image
                        src={post.imageUrl}
                        alt={post.imageAlt || ""}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                  <Field
                    label="Texto alternativo"
                    value={post.imageAlt || ""}
                    onChange={(value) => update("imageAlt", value)}
                  />
                </div>
                <div className="rounded-xl bg-bg-2 p-4">
                  <h2 className="text-sm font-bold text-primary">Checklist de publicación</h2>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {checklist.map((item) => (
                      <span
                        key={item.label}
                        className="flex items-center gap-2 text-sm text-text-2"
                      >
                        {item.done ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Clock3 className="h-4 w-4 text-mute" />
                        )}
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>
                {post._id ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => requestAction({ kind: "archive" })}
                  >
                    <Archive className="h-4 w-4" />
                    Archivar recurso
                  </Button>
                ) : null}
              </div>
            ) : null}
            {tab === "preview" ? (
              <article className="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
                {post.imageUrl ? (
                  <div className="relative aspect-[16/7]">
                    <Image
                      src={post.imageUrl}
                      alt={post.imageAlt || ""}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <div className="p-6 sm:p-10">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-deep">
                    {post.category}
                  </span>
                  <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-primary">
                    {post.title || "Vista previa"}
                  </h1>
                  <p className="mt-4 text-lg text-text-2">{post.excerpt}</p>
                  <div className="prose mt-8 max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
                  </div>
                </div>
              </article>
            ) : null}
            {tab === "history" ? (
              <div className="mt-4 rounded-2xl border border-line bg-white p-5">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-tech" />
                  <h2 className="font-display text-xl font-bold">Historial de revisiones</h2>
                </div>
                <div className="mt-4 divide-y divide-line">
                  {revisions.length ? (
                    revisions.map((revision) => (
                      <div
                        key={revision._id}
                        className="flex min-h-14 items-center justify-between gap-4 py-2"
                      >
                        <div>
                          <span className="block text-sm font-semibold">{revision.reason}</span>
                          <time className="text-xs text-mute">
                            {new Date(revision.createdAt).toLocaleString()}
                          </time>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            requestAction({ kind: "restore", revisionId: revision._id })
                          }
                        >
                          <RefreshCw className="h-4 w-4" />
                          Restaurar
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="py-8 text-center text-text-2">Aún no hay revisiones.</p>
                  )}
                </div>
              </div>
            ) : null}
          </main>
          <aside className="rounded-2xl border border-line bg-white p-5 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display font-bold text-primary">Asistente editorial</h2>
                <p className="text-xs text-mute">Genera propuestas, nunca publica.</p>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              <SelectField
                label="Acción"
                value={aiAction}
                onChange={setAiAction}
                options={[
                  "outline",
                  "draft",
                  "rewrite",
                  "summary",
                  "titles",
                  "seo",
                  "translate",
                  "alt-text",
                  "image-prompt",
                ]}
              />
              <Field label="Qué quieres crear" value={brief} onChange={setBrief} textarea />
              <Field label="Audiencia" value={audience} onChange={setAudience} />
              <Field label="Objetivo" value={objective} onChange={setObjective} textarea />
              <Field
                label="Fuentes verificables (una URL por línea)"
                value={sources}
                onChange={setSources}
                textarea
              />
              <Button
                type="button"
                className="w-full"
                disabled={generating}
                onClick={() => void generate()}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generar propuesta
              </Button>
            </div>
            {proposal ? (
              <div className="mt-5 rounded-xl border border-tech/25 bg-larimar-soft p-4">
                <h3 className="text-sm font-bold text-primary">Propuesta lista para revisar</h3>
                {proposal.title ? (
                  <p className="mt-2 text-sm font-semibold">{proposal.title}</p>
                ) : null}
                {proposal.alternativeTitles?.length ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold uppercase text-mute">
                      Títulos alternativos
                    </p>
                    {proposal.alternativeTitles.map((title) => (
                      <div
                        key={title}
                        className="flex items-center justify-between gap-2 rounded-lg bg-white p-2 text-sm"
                      >
                        <span>{title}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => update("title", title)}
                        >
                          Aplicar
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}
                {proposal.outline ? (
                  <>
                    <ul className="mt-2 list-disc pl-5 text-sm text-text-2">
                      {proposal.outline.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(proposal.outline!.map((item) => `## ${item}`).join("\n\n"))
                          .catch(() => setMessage("No se pudo copiar el outline."))
                      }
                    >
                      Copiar outline
                    </Button>
                  </>
                ) : null}
                {proposal.imagePrompt ? (
                  <div className="mt-3 rounded-lg bg-white p-3 text-sm">
                    <p className="font-semibold">Prompt de imagen</p>
                    <p className="mt-1 text-text-2">{proposal.imagePrompt}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(proposal.imagePrompt!)
                          .catch(() => setMessage("No se pudo copiar el prompt."))
                      }
                    >
                      Copiar prompt
                    </Button>
                  </div>
                ) : null}
                {proposal.warnings?.length ? (
                  <div className="mt-3 rounded-lg bg-amber-soft p-3 text-xs text-amber-deep">
                    {proposal.warnings.join(" ")}
                  </div>
                ) : null}
                <Button type="button" size="sm" className="mt-4 w-full" onClick={applyProposal}>
                  Aplicar al borrador
                </Button>
              </div>
            ) : null}
            {message ? (
              <p role="status" className="mt-4 rounded-lg bg-bg-2 p-3 text-sm text-text-2">
                {message}
              </p>
            ) : null}
            <div className="mt-4 flex items-center gap-2 text-xs text-mute">
              {dirty ? (
                <>
                  <Clock3 className="h-3.5 w-3.5" />
                  Cambios sin guardar
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 text-success" />
                  Cambios guardados
                </>
              )}
            </div>
          </aside>
        </div>
      </Container>
      <dialog
        ref={changeDialog}
        onCancel={() => setPendingAction(null)}
        className="fixed inset-0 z-50 m-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-xl backdrop:bg-primary/70"
      >
        <h2 className="font-display text-xl font-bold text-primary">
          {pendingAction?.kind === "archive" ? "Archivar recurso" : "Cambios sin guardar"}
        </h2>
        <p className="mt-3 text-text-2">
          {pendingAction?.kind === "archive"
            ? "El recurso dejará de estar visible. Puedes guardar primero los cambios pendientes o archivar la versión guardada."
            : "Guarda, descarta o cancela antes de cambiar de recurso."}
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setPendingAction(null);
              changeDialog.current?.close();
            }}
          >
            Cancelar
          </Button>
          {dirty ? (
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => void confirmPending(true)}
            >
              Guardar y continuar
            </Button>
          ) : null}
          <Button type="button" disabled={saving} onClick={() => void confirmPending(false)}>
            {pendingAction?.kind === "archive" ? "Archivar" : "Descartar"}
          </Button>
        </div>
      </dialog>
    </Section>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
  wide,
  hint,
  type = "text",
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  textarea?: boolean;
  wide?: boolean;
  hint?: string;
  type?: string;
}) {
  const classes = `min-h-11 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-tech focus:ring-2 focus:ring-larimar/20 ${textarea ? "min-h-24 resize-y" : ""}`;
  return (
    <label className={`block text-sm font-medium ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 flex justify-between gap-2">
        <span>{label}</span>
        {hint ? <span className="text-xs font-normal text-mute">{hint}</span> : null}
      </span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={classes}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={classes}
        />
      )}
    </label>
  );
}
function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  options: string[];
}) {
  return (
    <label className="block text-sm font-medium">
      <span className="mb-1.5 block">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-lg border border-line bg-white px-3"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}
function localDateTime(value: number) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}
