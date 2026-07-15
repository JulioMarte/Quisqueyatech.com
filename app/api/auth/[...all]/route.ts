import { handler } from "@/lib/server/auth-server";

export const GET = handler.GET;

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;
  if (path.endsWith("/sign-in/email") || path.endsWith("/sign-up/email")) {
    return Response.json({ error: "Auth endpoint unavailable" }, { status: 404 });
  }
  return handler.POST(request);
}
