interface Props { locale: "es" | "en" }

const sections = {
  en: [
    ["Data we collect", "Assessment and booking flows may collect your name, company, role, country, email, mobile number, scheduling preferences, voice recording, transcript, and generated assessment."],
    ["Voice and retention", "Recording requires explicit consent. Audio is retained for up to 30 days, full transcripts for 90 days, and lead summaries for up to 12 months unless an active commercial relationship or deletion request applies."],
    ["How we use data", "We use this information to provide the assessment, manage appointments, contact you, improve service quality, and propose relevant work. We do not sell personal information."],
    ["Service providers", "We may use infrastructure, database, email, scheduling, telephony, anti-abuse, and voice AI providers solely to deliver the service."],
  ],
  es: [
    ["Datos que recopilamos", "La evaluación y la agenda pueden recopilar nombre, empresa, cargo, país, correo, celular, preferencias de horario, grabación de voz, transcripción y evaluación generada."],
    ["Voz y retención", "La grabación requiere consentimiento expreso. El audio se conserva hasta 30 días, la transcripción completa 90 días y el resumen del lead hasta 12 meses, salvo relación comercial activa o solicitud de eliminación."],
    ["Uso de la información", "Usamos estos datos para entregar la evaluación, gestionar citas, contactarte, mejorar el servicio y proponer trabajo relevante. No vendemos información personal."],
    ["Proveedores", "Podemos utilizar proveedores de infraestructura, base de datos, correo, agenda, telefonía, protección contra abuso e IA de voz únicamente para prestar el servicio."],
  ],
} as const;

export function PrivacyPolicy({ locale }: Props) {
  const isEn = locale === "en";
  return (
    <section className="section">
      <div className="container privacy-main motion-reveal">
        <h1>{isEn ? "Privacy policy" : "Política de privacidad"}</h1>
        <p className="privacy-updated">{isEn ? "Last updated: July 2026." : "Última actualización: julio de 2026. QuisqueyaTech opera desde Puerto Plata, República Dominicana."}</p>
        <div className="privacy-sections">
          {sections[locale].map(([title, body]) => <section key={title}><h2>{title}</h2><p>{body}</p></section>)}
          <section>
            <h2>{isEn ? "Contact and deletion" : "Contacto y eliminación"}</h2>
            <p>{isEn ? "To request access or deletion, email" : "Para solicitar acceso o eliminación, escribe a"} <a href="mailto:info@quisqueyatech.com">info@quisqueyatech.com</a>.</p>
          </section>
        </div>
        {!isEn ? <a className="about-link" href="/">← Volver al inicio</a> : null}
      </div>
    </section>
  );
}
