"use client";
import { useState } from "react";
import { Bot, ClipboardList, FileText, LogOut } from "lucide-react";
import { AdminEditor } from "@/components/admin/editor";
import { AssessmentAdmin } from "@/components/admin/assessment-admin";
import { AgentManager } from "@/components/admin/agent-manager";

export function AdminWorkspace() {
  const [area, setArea] = useState<"assessments" | "content" | "agents">(
    "assessments",
  );
  const tab = (id: typeof area, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setArea(id)}
      className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tech ${area === id ? "bg-primary text-white" : "hover:bg-bg-2"}`}
    >
      {icon}
      {label}
    </button>
  );
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/sign-in");
  }
  return (
    <>
      <div className="sticky top-[68px] z-30 border-b border-line bg-white/95 px-4 py-2 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap gap-2">
          {tab(
            "assessments",
            "Evaluaciones",
            <ClipboardList className="h-4 w-4" />,
          )}
          {tab("content", "Contenido", <FileText className="h-4 w-4" />)}
          {tab("agents", "Agentes", <Bot className="h-4 w-4" />)}
          <button
            type="button"
            onClick={() => void logout()}
            className="ml-auto inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-4 text-sm font-semibold hover:bg-bg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tech"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </div>
      </div>
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
