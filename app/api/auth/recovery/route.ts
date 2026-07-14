import { createHash } from "node:crypto";
import { z } from "zod";
import { convexAction } from "@/lib/server/convex";
import { validOrigin } from "@/lib/server/auth";

const input = z.object({ code: z.string().trim().min(10).max(100), password: z.string().min(14).max(128) });
export async function POST(request: Request) {
  if (!validOrigin(request)) return Response.json({ error: "Solicitud no permitida." }, { status: 403 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Código o contraseña no válidos." }, { status: 400 });
  try {
    await convexAction("auth:recoverAdmin", { codeHash: createHash("sha256").update(parsed.data.code.toUpperCase()).digest("hex"), newPassword: parsed.data.password, now: Date.now() });
    return Response.json({ data: { ok: true } });
  } catch { return Response.json({ error: "Código o contraseña no válidos." }, { status: 401 }); }
}
