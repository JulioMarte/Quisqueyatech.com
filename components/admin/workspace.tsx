"use client";
import { useEffect, useState } from "react";
import { Bot, ClipboardList, FileText, Loader2, LogOut } from "lucide-react";
import { AdminEditor } from "@/components/admin/editor";
import { AssessmentAdmin } from "@/components/admin/assessment-admin";
import { AgentManager } from "@/components/admin/agent-manager";
import { authClient } from "@/lib/auth-client";

type Area = "assessments" | "content" | "agents";
const validArea = (value: string | null): value is Area => value === "assessments" || value === "content" || value === "agents";

export function AdminWorkspace() {
  const [area, setArea] = useState<Area>("assessments");
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  useEffect(() => {
    const sync = () => { const value = new URL(window.location.href).searchParams.get("area"); setArea(validArea(value) ? value : "assessments"); };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  function selectArea(next: Area) {
    setArea(next);
    const url = new URL(window.location.href);
    url.searchParams.set("area", next);
    window.history.pushState({}, "", url);
  }
  const tab = (id: typeof area, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => selectArea(id)}
      aria-pressed={area === id}
      className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tech ${area === id ? "bg-primary text-white" : "hover:bg-bg-2"}`}
    >
      {icon}
      {label}
    </button>
  );
  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message || "No se pudo cerrar la sesión.");
      window.location.assign("/sign-in");
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "No se pudo cerrar la sesión.");
      setLoggingOut(false);
    }
  }
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 px-3 py-2 backdrop-blur sm:px-4">
        <div className="mx-auto flex max-w-[1600px] items-center gap-2">
          <nav aria-label="Secciones administrativas" className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
            {tab("assessments", "Evaluaciones", <ClipboardList className="h-4 w-4" />)}
            {tab("content", "Contenido", <FileText className="h-4 w-4" />)}
            {tab("agents", "Agentes", <Bot className="h-4 w-4" />)}
          </nav>
          <button
            type="button"
            onClick={() => void logout()}
            disabled={loggingOut}
            className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-bg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tech disabled:cursor-wait disabled:opacity-60 sm:px-4"
          >
            {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogOut className="h-4 w-4" aria-hidden="true" />}
            <span className="hidden sm:inline">{loggingOut ? "Saliendo…" : "Salir"}</span>
            <span className="sr-only sm:hidden">{loggingOut ? "Cerrando sesión" : "Salir"}</span>
          </button>
        </div>
        {logoutError ? <p role="alert" className="mx-auto mt-2 max-w-[1600px] rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{logoutError}</p> : null}
      </header>
      {area === "assessments" ? (
        <AssessmentAdmin />
      ) : area === "content" ? (
        <AdminEditor />
      ) : (
        <AgentManager />
      )}
    </>
  );
}
