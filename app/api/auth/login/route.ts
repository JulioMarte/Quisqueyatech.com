import { handler } from "@/lib/server/auth-server";
import { validOrigin } from "@/lib/server/auth";

export async function POST(request: Request) {
  if (!validOrigin(request)) return Response.json({ message: "Solicitud no permitida." }, { status: 403 });
  const url = new URL(request.url);
  url.pathname = "/api/auth/sign-in/email";
  return handler.POST(new Request(url, request));
}
