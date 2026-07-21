import { notFound } from "next/navigation";
import { AssessmentDetailPage } from "@/components/admin/assessment-dashboard";

export const metadata = { title: "Detalle de evaluación | Administración" };
export default async function AssessmentPage({ params }: { params: Promise<{ assessmentId: string }> }) {
  const { assessmentId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(assessmentId)) notFound();
  return <AssessmentDetailPage assessmentId={assessmentId} />;
}
