import { redirect } from "next/navigation";
import { AdminWorkspace, type AdminArea } from "@/components/admin/workspace";
import { currentAdmin } from "@/lib/server/auth";

export const metadata = { title: "Administración", robots: { index: false, follow: false } };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  if (!(await currentAdmin())) redirect("/sign-in?returnTo=/admin");
  const requested = (await searchParams).area;
  const initialArea: AdminArea = requested === "content" || requested === "agents" || requested === "agenda" || requested === "configuration" ? requested : "agenda";
  return <AdminWorkspace initialArea={initialArea} />;
}
