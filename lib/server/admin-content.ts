import "server-only";
import { timingSafeEqual } from "node:crypto";
import { currentUser } from "@clerk/nextjs/server";
import { brand } from "@/lib/brand";

function equalSecret(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function authorizeContentRequest(request: Request) {
  const expected = process.env.CONTENT_API_TOKEN;
  const authorization = request.headers.get("authorization");
  if (expected && authorization?.startsWith("Bearer ") && equalSecret(expected, authorization.slice(7))) return { kind: "token" as const, email: brand.editorEmail };
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) return null;
  const user = await currentUser();
  const email = user?.emailAddresses.find((item) => item.id === user.primaryEmailAddressId)?.emailAddress.toLowerCase();
  return email === brand.editorEmail ? { kind: "clerk" as const, email } : null;
}

export function requestId(request: Request) {
  return request.headers.get("x-request-id")?.slice(0, 100) || crypto.randomUUID();
}

export function adminSecret() {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) throw new Error("Editorial storage is not configured");
  return secret;
}
