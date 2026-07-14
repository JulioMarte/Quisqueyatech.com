import { redirect } from "next/navigation";
import { AdminWorkspace } from "@/components/admin/workspace";
import { currentAdmin } from "@/lib/server/auth";
export const metadata = { title: "Administración", robots: { index: false, follow: false } };
export default async function AdminPage() { if (!(await currentAdmin())) redirect("/sign-in?returnTo=/admin"); return <AdminWorkspace />; }
