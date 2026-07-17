import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { currentAdmin, safeReturnTo } from "@/lib/server/auth";
import { Container, Section } from "@/components/ui/section";
import { convexQuery } from "@/lib/server/convex";
export const metadata = { title: "Acceso administrativo", robots: { index: false, follow: false } };
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const target = safeReturnTo((await searchParams).returnTo);
  const setup = (await convexQuery("auth:setupStatus", {})) as { status: string } | null;
  if (setup?.status === "uninitialized") redirect("/setup");
  if (await currentAdmin()) redirect(target);
  return (
    <Section className="min-h-[70vh] bg-bg-2">
      <Container className="flex max-w-lg items-center">
        <LoginForm returnTo={target} />
      </Container>
    </Section>
  );
}
