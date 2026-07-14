import { NextResponse } from "next/server";
import { EasyAppointmentsProvider, easyAppointmentsConfigured } from "@/lib/server/scheduling";

export async function GET(request: Request) {
  const url = new URL(request.url); const date = url.searchParams.get("date"); const timezone = url.searchParams.get("timezone") || "America/Santo_Domingo";
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  if (!easyAppointmentsConfigured()) return NextResponse.json({ configured: false, slots: [] });
  try { const slots = await new EasyAppointmentsProvider().listAvailability(date, timezone); return NextResponse.json({ configured: true, slots }); }
  catch (error) { console.error("[scheduling:availability]", error); return NextResponse.json({ configured: false, slots: [] }); }
}
