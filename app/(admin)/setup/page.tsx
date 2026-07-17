import { redirect } from "next/navigation";
import { SetupForm } from "@/components/admin/setup-form";
import { Container, Section } from "@/components/ui/section";
import { convexQuery } from "@/lib/server/convex";

export const metadata = {
  title: "Inicializar administración",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  let setupCodeRequired = false;
  try {
    const state = (await convexQuery("auth:setupStatus", {})) as {
      status: string;
      setupCodeRequired?: boolean;
    } | null;
    if (state?.status === "configured") redirect("/sign-in");
    setupCodeRequired = Boolean(state?.setupCodeRequired);
  } catch {
    // Form still loads; client status endpoint surfaces config probe.
  }
  return (
    <Section className="min-h-[70vh] bg-bg-2">
      <Container className="flex max-w-lg items-center">
        <SetupForm initialSetupCodeRequired={setupCodeRequired} />
      </Container>
    </Section>
  );
}
