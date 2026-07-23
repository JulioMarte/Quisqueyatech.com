import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { currentAdmin } from "@/lib/server/auth";

export default async function AuthenticatedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await currentAdmin())) redirect("/sign-in?returnTo=/admin");
  return <AdminShell>{children}</AdminShell>;
}
