import { redirect } from "next/navigation";
import { SetupForm } from "@/components/admin/setup-form";
import { Container, Section } from "@/components/ui/section";
import { convexQuery } from "@/lib/server/convex";
export const metadata = { title: "Inicializar administración", robots: { index: false, follow: false } };
export default async function SetupPage() { const state = await convexQuery("auth:setupStatus", {}) as { status: string } | null; if (state?.status === "configured") redirect("/sign-in"); return <Section className="min-h-[70vh] bg-bg-2"><Container className="flex max-w-lg items-center"><SetupForm /></Container></Section>; }
