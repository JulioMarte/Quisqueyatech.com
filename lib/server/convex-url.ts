export function resolveConvexUrl() {
  const server = process.env.CONVEX_URL?.trim();
  const publicUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  return process.env.NODE_ENV === "production" ? server || publicUrl || "" : publicUrl || server || "";
}

export function resolveConvexSiteUrl() {
  const server = process.env.CONVEX_SITE_URL?.trim();
  const publicUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim();
  const selected =
    process.env.NODE_ENV === "production" ? server || publicUrl || "" : publicUrl || server || "";
  return selected.replace(/\/$/, "");
}
