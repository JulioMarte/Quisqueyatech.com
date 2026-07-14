import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { AdminEditor } from "@/components/admin/editor";
import { Container, Section } from "@/components/ui/section";
import { brand } from "@/lib/brand";

export const metadata = { title: "Administración", robots: { index: false, follow: false } };

export default async function AdminPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) return <Section><Container className="max-w-2xl"><h1 className="font-display text-4xl font-bold text-primary">Panel editorial preparado</h1><p className="mt-4 text-text-2">Configura Clerk y Convex para activar el acceso de {brand.editorEmail}. Las variables requeridas están documentadas en <code>.env.example</code>.</p></Container></Section>;
  const { userId } = await auth(); if (!userId) redirect("/sign-in?redirect_url=/admin");
  const user = await currentUser(); const email = user?.emailAddresses.find((item) => item.id === user.primaryEmailAddressId)?.emailAddress.toLowerCase();
  if (email !== brand.editorEmail) return <Section><Container className="max-w-xl"><h1 className="font-display text-3xl font-bold">Acceso no autorizado</h1><p className="mt-3 text-text-2">Este panel está limitado a la cuenta editorial configurada.</p></Container></Section>;
  return <AdminEditor />;
}
