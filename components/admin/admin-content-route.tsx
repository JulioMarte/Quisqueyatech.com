"use client";
import { AdminEditor } from "@/components/admin/editor";
import { useAdminNavigationGuard } from "@/components/admin/admin-shell";
export function AdminContentRoute() {
  const guard = useAdminNavigationGuard();
  return <AdminEditor onDirtyChange={guard.setDirty} saveRef={guard.saveRef} />;
}
