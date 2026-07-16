import { NextResponse } from "next/server";
import { convexQuery } from "@/lib/server/convex";
import { DEFAULT_TIME_ZONE, isValidTimeZone } from "@/lib/scheduling/timezone";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const timezone =
    url.searchParams.get("timezone") || DEFAULT_TIME_ZONE;
  const locale = url.searchParams.get("locale") || "es";
  if (!date || !isCivilDate(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (!isValidTimeZone(timezone)) {
    return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
  }
  if (locale !== "es" && locale !== "en") {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }
  try {
    const slots = await convexQuery("agenda:availability", {
      date,
      timezone,
      locale,
    });
    return NextResponse.json({ configured: true, slots });
  } catch (error) {
    console.error("[scheduling:availability]", error);
    return NextResponse.json(
      { configured: false, slots: [] },
      { status: 503 },
    );
  }
}

function isCivilDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}
