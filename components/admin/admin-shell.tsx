"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  Bot,
  CalendarDays,
  ClipboardList,
  FileText,
  Loader2,
  LogOut,
  Menu,
  Settings,
  X,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

type Guard = {
  dirty: boolean;
  setDirty(value: boolean): void;
  saveRef: React.MutableRefObject<(() => Promise<boolean>) | null>;
};
const GuardContext = createContext<Guard | null>(null);
export function useAdminNavigationGuard() {
  const value = useContext(GuardContext);
  if (!value) throw new Error("Admin navigation guard is unavailable");
  return value;
}

const groups = [
  {
    label: "Operación",
    items: [
      ["/admin/agenda", "Agenda", CalendarDays],
      ["/admin/evaluaciones", "Evaluaciones", ClipboardList],
    ],
  },
  {
    label: "Publicación",
    items: [
      ["/admin/contenido", "Contenido", FileText],
      ["/admin/agentes", "Agentes", Bot],
    ],
  },
  { label: "Sistema", items: [["/admin/configuracion", "Configuración", Settings]] },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false),
    [dirty, setDirty] = useState(false),
    [pending, setPending] = useState<string | null>(null);
  const [saving, setSaving] = useState(false),
    [loggingOut, setLoggingOut] = useState(false),
    [error, setError] = useState("");
  const saveRef = useRef<(() => Promise<boolean>) | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  function navigate(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (!dirty) {
      setOpen(false);
      return;
    }
    event.preventDefault();
    setPending(href);
    setOpen(false);
    dialogRef.current?.showModal();
  }
  async function logout() {
    setLoggingOut(true);
    setError("");
    const result = await authClient.signOut();
    if (result.error) {
      setError(result.error.message || "No se pudo cerrar la sesión.");
      setLoggingOut(false);
      return;
    }
    window.location.assign("/sign-in");
  }
  const navigation = (
    <>
      {groups.map((group) => (
        <div key={group.label} className="mb-6">
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-mute">
            {group.label}
          </p>
          <ul className="space-y-1">
            {group.items.map(([href, label, Icon]) => {
              const active =
                href === "/admin/evaluaciones" ? pathname.startsWith(href) : pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={(event) => navigate(event, href)}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors ${active ? "bg-larimar-soft text-primary before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-tech" : "text-text-2 hover:bg-bg-2 hover:text-primary"}`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
  return (
    <GuardContext.Provider value={{ dirty, setDirty, saveRef }}>
      <a
        href="#admin-content"
        className="fixed left-3 top-3 z-[60] -translate-y-20 rounded-lg bg-primary px-4 py-3 font-semibold text-white focus:translate-y-0"
      >
        Saltar al contenido
      </a>
      <div className="admin-shell min-h-screen bg-bg-2 lg:pl-64">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-line bg-white lg:flex lg:flex-col">
          <div className="border-b border-line p-5">
            <p className="font-display text-lg font-bold text-primary">QuisqueyaTech</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-mute">
              Administración
            </p>
          </div>
          <nav aria-label="Navegación administrativa" className="flex-1 overflow-y-auto p-4">
            {navigation}
          </nav>
          <div className="border-t border-line p-4">
            <button
              onClick={() => void logout()}
              disabled={loggingOut}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-text-2 hover:bg-bg-2"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? "Saliendo…" : "Cerrar sesión"}
            </button>
            {error ? (
              <p role="alert" className="mt-2 text-xs text-rose-800">
                {error}
              </p>
            ) : null}
          </div>
        </aside>
        <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur lg:hidden">
          <button
            ref={menuRef}
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="admin-mobile-menu"
            className="flex min-h-11 items-center gap-2 rounded-lg px-2 font-semibold"
          >
            <Menu className="h-5 w-5" />
            Menú
          </button>
          <span className="font-display font-bold text-primary">Administración</span>
        </header>
        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              aria-label="Cerrar menú"
              className="absolute inset-0 bg-primary/55"
              onClick={() => {
                setOpen(false);
                requestAnimationFrame(() => menuRef.current?.focus());
              }}
            />
            <aside
              id="admin-mobile-menu"
              className="relative flex h-full w-[min(86vw,320px)] flex-col bg-white shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-line p-4">
                <div>
                  <p className="font-display font-bold text-primary">QuisqueyaTech</p>
                  <p className="text-xs text-mute">Administración</p>
                </div>
                <button
                  aria-label="Cerrar menú"
                  className="min-h-11 min-w-11 rounded-lg hover:bg-bg-2"
                  onClick={() => {
                    setOpen(false);
                    requestAnimationFrame(() => menuRef.current?.focus());
                  }}
                >
                  <X className="mx-auto h-5 w-5" />
                </button>
              </div>
              <nav aria-label="Navegación administrativa" className="flex-1 overflow-y-auto p-4">
                {navigation}
              </nav>
              <div className="border-t border-line p-4">
                <button
                  onClick={() => void logout()}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 font-semibold"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
            </aside>
          </div>
        ) : null}
        <main id="admin-content" tabIndex={-1}>
          {children}
        </main>
      </div>
      <dialog
        ref={dialogRef}
        className="fixed inset-0 z-50 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-6 shadow-xl backdrop:bg-primary/70"
      >
        <h2 className="font-display text-xl font-bold text-primary">Cambios sin guardar</h2>
        <p className="mt-3 text-text-2">Guarda, descarta o cancela antes de cambiar de sección.</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            className="min-h-11 rounded-lg border border-line px-4 font-semibold"
            onClick={() => {
              setPending(null);
              dialogRef.current?.close();
            }}
          >
            Cancelar
          </button>
          <button
            className="min-h-11 rounded-lg border border-line px-4 font-semibold"
            onClick={() => {
              setDirty(false);
              dialogRef.current?.close();
              if (pending) router.push(pending);
            }}
          >
            Descartar
          </button>
          <button
            disabled={saving}
            className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-white disabled:opacity-60"
            onClick={() =>
              void (async () => {
                setSaving(true);
                const saved = await saveRef.current?.();
                setSaving(false);
                if (saved && pending) {
                  setDirty(false);
                  dialogRef.current?.close();
                  router.push(pending);
                }
              })()
            }
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar y continuar"}
          </button>
        </div>
      </dialog>
    </GuardContext.Provider>
  );
}
