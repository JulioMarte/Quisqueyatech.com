import { authConfigProbe } from "@/lib/server/auth";
import { convexQuery } from "@/lib/server/convex";

export async function GET() {
  const probe = authConfigProbe();
  try {
    const data = (await convexQuery("auth:setupStatus", {})) as {
      status: string;
      setupCodeRequired?: boolean;
    };
    return Response.json(
      {
        data: {
          status: data.status,
          setupCodeRequired: Boolean(data.setupCodeRequired),
          config: probe,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        scope: "auth:setup:status",
        message: error instanceof Error ? error.message : String(error),
        config: probe,
      }),
    );
    return Response.json(
      {
        error: "Convex no está configurado para autenticación.",
        code: "MISSING_CONVEX_URL",
        data: { status: "unknown", setupCodeRequired: true, config: probe },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
