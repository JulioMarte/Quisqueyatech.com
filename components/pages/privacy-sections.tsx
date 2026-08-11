import Link from "next/link";
import { brand } from "@/lib/brand";

export function PrivacySections({ english = false }: { english?: boolean }) {
  const sections = english
    ? [
        [
          "Information we collect",
          "Our assessment and booking flows may collect your name, company, role, country, email address, mobile number, scheduling preferences, voice recording, transcript, and generated assessment. We only request information needed to provide and follow up on the service.",
        ],
        [
          "How we use information",
          "We use this information to provide the assessment, manage appointments, send authorized service communications, prevent abuse, maintain security, improve service quality, and follow up on your request. Appointment messaging is operational only and is not used for promotions.",
        ],
        [
          "Voice, AI, and retention",
          "A voice assessment is recorded and processed only after explicit consent. Audio is retained for up to 30 days, full transcripts for up to 90 days, and contact records and assessment summaries for up to 12 months, unless an active commercial relationship, legal obligation, or deletion request requires a different period.",
        ],
        [
          "SMS and WhatsApp consent",
          "Mobile opt-in information and consent are used only to send appointment confirmations, reminders, changes, and related service messages. We do not sell mobile information or share mobile opt-in data or consent with third parties for their own marketing or promotional purposes. You may withdraw consent at any time.",
        ],
        [
          "Service providers and transfers",
          "We may use vetted providers for hosting, databases, email, scheduling, telephony, SMS, WhatsApp, anti-abuse controls, and voice AI solely to operate the service. These providers process information under their own contractual and security obligations, and processing may occur outside your country.",
        ],
        [
          "Security and your choices",
          "We use administrative and technical safeguards appropriate to the service. You may decline appointment messaging and receive operational communications by email instead. You may also request access, correction, deletion, or withdrawal of consent, subject to applicable legal and operational requirements.",
        ],
      ]
    : [
        [
          "Información que recopilamos",
          "Los flujos de evaluación y agenda pueden recopilar nombre, empresa, cargo, país, correo electrónico, número móvil, preferencias de horario, grabación de voz, transcripción y evaluación generada. Solo solicitamos información necesaria para prestar el servicio y dar seguimiento.",
        ],
        [
          "Cómo usamos la información",
          "Usamos estos datos para entregar la evaluación, gestionar citas, enviar comunicaciones operativas autorizadas, prevenir abuso, mantener la seguridad, mejorar el servicio y dar seguimiento a tu solicitud. La mensajería de citas es exclusivamente operativa y no se utiliza para promociones.",
        ],
        [
          "Voz, inteligencia artificial y retención",
          "La evaluación por voz se graba y procesa únicamente después de obtener consentimiento expreso. El audio se conserva hasta 30 días, la transcripción completa hasta 90 días y la ficha de contacto y el resumen de la evaluación hasta 12 meses, salvo que una relación comercial activa, obligación legal o solicitud de eliminación requiera otro plazo.",
        ],
        [
          "Consentimiento para SMS y WhatsApp",
          "La información de opt-in móvil y el consentimiento se usan únicamente para confirmaciones, recordatorios, cambios y otros mensajes relacionados con la cita. No vendemos la información móvil ni compartimos los datos o el consentimiento de opt-in con terceros para fines propios de marketing o promoción. Puedes retirar tu consentimiento en cualquier momento.",
        ],
        [
          "Proveedores y transferencias",
          "Podemos utilizar proveedores evaluados de infraestructura, base de datos, correo, agenda, telefonía, SMS, WhatsApp, protección contra abuso e IA de voz únicamente para operar el servicio. Estos proveedores procesan la información bajo sus propias obligaciones contractuales y de seguridad, y el procesamiento puede ocurrir fuera de tu país.",
        ],
        [
          "Seguridad y tus opciones",
          "Aplicamos medidas administrativas y técnicas apropiadas para el servicio. Puedes rechazar la mensajería de citas y recibir las comunicaciones operativas por correo. También puedes solicitar acceso, corrección, eliminación o retiro del consentimiento, sujeto a requisitos legales y operativos aplicables.",
        ],
      ];

  const messagingHref = english ? "/en/messaging-terms" : "/terminos-de-mensajeria";
  return (
    <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-text-2">
      {sections.map(([title, body]) => (
        <section key={title}>
          <h2 className="font-display text-xl font-bold text-text">{title}</h2>
          <p className="mt-2">{body}</p>
        </section>
      ))}
      <section>
        <h2 className="font-display text-xl font-bold text-text">
          {english ? "Messaging choices" : "Opciones de mensajería"}
        </h2>
        <p className="mt-2">
          {english
            ? "For program details and opt-out instructions, read our "
            : "Para conocer los detalles del programa y cómo cancelar, consulta los "}
          <Link className="font-semibold text-tech underline" href={messagingHref}>
            {english ? "Messaging Terms" : "Términos de mensajería"}
          </Link>
          .
        </p>
      </section>
      <section>
        <h2 className="font-display text-xl font-bold text-text">
          {english ? "Contact and requests" : "Contacto y solicitudes"}
        </h2>
        <p className="mt-2">
          {english
            ? "To exercise a privacy right, withdraw consent, or ask a question, email"
            : "Para ejercer un derecho de privacidad, retirar el consentimiento o hacer una consulta, escribe a"}{" "}
          <a className="font-semibold text-tech underline" href={`mailto:${brand.publicEmail}`}>
            {brand.publicEmail}
          </a>
          .
        </p>
      </section>
    </div>
  );
}
