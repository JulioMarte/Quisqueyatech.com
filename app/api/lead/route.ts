import { NextResponse } from "next/server";
import {
  leadSchema,
  painLabels,
  sectorLabels,
} from "@/lib/validations/lead";

/**
 * Lead intake endpoint.
 * v1: valida + log. Listo para Convex / email (Resend o SMTP) después.
 * El cliente también abre WhatsApp con el mismo payload.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = leadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    if (data.website) {
      return NextResponse.json({ ok: true }); // honeypot
    }

    const lead = {
      ...data,
      sectorLabel: sectorLabels[data.sector],
      painLabel: painLabels[data.pain],
      receivedAt: new Date().toISOString(),
    };

    // Temporary: server log. Swap for Convex mutation or SMTP later.
    console.info("[lead]", JSON.stringify(lead));

    // TODO: Convex — insert lead when CONVEX_URL is configured
    // TODO: Email — admin@quisqueyatech.com or info@ via Resend/SMTP

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
