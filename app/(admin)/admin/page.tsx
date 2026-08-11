import { redirect } from "next/navigation";

const legacyAreas: Record<string, string> = {
  agenda: "/admin/agenda",
  assessments: "/admin/evaluaciones",
  content: "/admin/contenido",
  agents: "/admin/agentes",
  configuration: "/admin/configuracion",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const { area } = await searchParams;
  redirect((area && legacyAreas[area]) || "/admin/agenda");
}
