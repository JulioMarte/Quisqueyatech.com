import "server-only";
import { currentAdmin, validOrigin } from "@/lib/server/auth";
export async function authorizeContentRequest(request: Request) { if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !validOrigin(request)) return null; return currentAdmin(); }
export function requestId(request: Request) { return request.headers.get("x-request-id")?.slice(0, 100) || crypto.randomUUID(); }
