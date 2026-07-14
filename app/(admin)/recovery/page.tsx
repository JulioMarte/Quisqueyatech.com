import { RecoveryForm } from "@/components/admin/recovery-form";
import { Container, Section } from "@/components/ui/section";
export const metadata = { title: "Recuperar administración", robots: { index: false, follow: false } };
export default function RecoveryPage() { return <Section className="min-h-[70vh] bg-bg-2"><Container className="flex max-w-lg items-center"><RecoveryForm /></Container></Section>; }
