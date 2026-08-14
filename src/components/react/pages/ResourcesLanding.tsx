interface Props { locale: "es" | "en" }

export function ResourcesLanding({ locale }: Props) {
  const isEn = locale === "en";
  return (
    <section className="section resources-main">
      <div className="container">
        <div className="section-head motion-reveal">
          <span className="eyebrow">{isEn ? "Resources" : "Recursos"}</span>
          <h2>{isEn ? "Practical ideas to improve how your company operates." : "Ideas prácticas para mejorar cómo opera tu empresa."}</h2>
          <p>{isEn ? "Verifiable guides about automation, AI agents, and integrations, written for better decisions." : "Guías verificables sobre automatización, agentes de IA e integraciones, escritas para tomar mejores decisiones."}</p>
        </div>
        <div className="resources-empty">{isEn ? "Published articles stored only in the previous database runtime are pending export to Astro static content." : "Los artículos publicados que solo existen en el runtime anterior de base de datos están pendientes de exportarse a contenido estático de Astro."}</div>
      </div>
    </section>
  );
}
