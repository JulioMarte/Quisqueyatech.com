import { convexQuery } from "@/lib/server/convex";

export async function GET() {
  try {
    return Response.json(
      { data: await convexQuery("auth:setupStatus", {}) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Convex no está configurado para autenticación." },
      { status: 503 },
    );
  }
}
