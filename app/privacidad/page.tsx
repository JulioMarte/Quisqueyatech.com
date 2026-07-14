import type { Metadata } from "next";
import Link from "next/link";
import { Container, Section } from "@/components/ui/section";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Privacidad", description: "Política de privacidad y retención de datos de QuisqueyaTech." };

export default function PrivacyPage() {
  return <Section><Container className="max-w-3xl"><h1 className="font-display text-4xl font-bold text-primary">Política de privacidad</h1><p className="mt-4 text-text-2">Última actualización: julio de 2026. QuisqueyaTech opera desde {brand.location}.</p><PrivacySections /><Link href="/" className="mt-10 inline-block font-semibold text-amber-deep">← Volver al inicio</Link></Container></Section>;
}

export function PrivacySections({ english = false }: { english?: boolean }) {
  const sections = english ? [
    ["Data we collect", "Assessment and booking flows may collect your name, company, role, country, email, mobile number, scheduling preferences, voice recording, transcript, and generated assessment."],
    ["Voice and retention", "Recording requires explicit consent. Audio is retained for up to 30 days, full transcripts for 90 days, and lead summaries for up to 12 months unless an active commercial relationship or deletion request applies."],
    ["How we use data", "We use this information to provide the assessment, manage appointments, contact you, improve service quality, and propose relevant work. We do not sell personal information."],
    ["Service providers", "We may use infrastructure, database, email, scheduling, telephony, anti-abuse, and voice AI providers solely to deliver the service."],
  ] : [
    ["Datos que recopilamos", "La evaluación y la agenda pueden recopilar nombre, empresa, cargo, país, correo, celular, preferencias de horario, grabación de voz, transcripción y evaluación generada."],
    ["Voz y retención", "La grabación requiere consentimiento expreso. El audio se conserva hasta 30 días, la transcripción completa 90 días y el resumen del lead hasta 12 meses, salvo relación comercial activa o solicitud de eliminación."],
    ["Uso de la información", "Usamos estos datos para entregar la evaluación, gestionar citas, contactarte, mejorar el servicio y proponer trabajo relevante. No vendemos información personal."],
    ["Proveedores", "Podemos utilizar proveedores de infraestructura, base de datos, correo, agenda, telefonía, protección contra abuso e IA de voz únicamente para prestar el servicio."],
  ];
  return <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-text-2">{sections.map(([title, body]) => <section key={title}><h2 className="font-display text-xl font-bold text-text">{title}</h2><p className="mt-2">{body}</p></section>)}<section><h2 className="font-display text-xl font-bold text-text">{english ? "Contact and deletion" : "Contacto y eliminación"}</h2><p className="mt-2">{english ? "To request access or deletion, email" : "Para solicitar acceso o eliminación, escribe a"} <a className="text-tech underline" href={`mailto:${brand.publicEmail}`}>{brand.publicEmail}</a>.</p></section></div>;
}
