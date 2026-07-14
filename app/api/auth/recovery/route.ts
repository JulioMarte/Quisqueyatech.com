import { createHash } from "node:crypto";
import { z } from "zod";
import { convexAction } from "@/lib/server/convex";
import { requestFingerprint, validOrigin } from "@/lib/server/auth";
import { allowRequest } from "@/lib/server/rate-limit";

const input = z.object({ code: z.string().trim().min(10).max(100), password: z.string().min(14).max(128) });
export async function POST(request: Request) {
  if (!validOrigin(request)) return Response.json({ error: "Solicitud no permitida." }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 4_096) return Response.json({ error: "Solicitud demasiado grande." }, { status: 413 });
  try { if (!allowRequest(requestFingerprint(request, "admin-recovery"), 5, 60 * 60_000)) return Response.json({ error: "Código o contraseña no válidos." }, { status: 429 }); }
  catch { return Response.json({ error: "El servicio de autenticación no está configurado." }, { status: 503 }); }
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Código o contraseña no válidos." }, { status: 400 });
  try {
    await convexAction("auth:recoverAdmin", { codeHash: createHash("sha256").update(parsed.data.code.toUpperCase()).digest("hex"), newPassword: parsed.data.password, now: Date.now() });
    console.info(JSON.stringify({ scope: "auth", operation: "recovery", status: "success" }));
    return Response.json({ data: { ok: true } });
  } catch { console.warn(JSON.stringify({ scope: "auth", operation: "recovery", status: "rejected" })); return Response.json({ error: "Código o contraseña no válidos." }, { status: 401 }); }
}
