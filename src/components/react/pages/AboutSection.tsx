import { ArrowRight } from "lucide-react";
import { analyticsAttributes } from "../../../lib/analytics";

interface Props { locale: "es" | "en" }

const linkedIn = "https://www.linkedin.com/in/julio-alberto-marte-balbuena-5454a072";

export function AboutSection({ locale }: Props) {
  const isEn = locale === "en";
  return (
    <section className="section">
      <div className="container about-main">
        <img className="motion-reveal" src="/team/julio-marte.jpeg" alt="Julio Alberto Marte Balbuena" />
        <div className="motion-reveal">
          <span className="eyebrow">{isEn ? "About" : "Nosotros"}</span>
          <h1>Julio Alberto Marte Balbuena</h1>
          <p className="about-role">{isEn ? "Founder and automation & AI consultant" : "Fundador y consultor de automatización e IA"}</p>
          <p className="body-lg">{isEn ? "Julio leads QuisqueyaTech and works directly on assessment, solution design, and every company relationship. The firm operates from Puerto Plata, Dominican Republic, with an international outlook and a simple principle: understand the operation before recommending technology." : "Julio dirige QuisqueyaTech y participa directamente en la evaluación, el diseño de soluciones y la relación con cada empresa. La firma trabaja desde Puerto Plata, República Dominicana, con una visión internacional y un principio sencillo: entender la operación antes de recomendar tecnología."}</p>
          <p className="body">{isEn ? "This biography is intentionally brief while public professional information is being updated. We do not present experience, customers, or credentials that cannot yet be verified." : "Esta biografía es deliberadamente breve mientras se actualiza la información profesional pública. No presentamos experiencia, clientes ni credenciales que todavía no puedan verificarse."}</p>
          <a className="about-link" href={linkedIn} target="_blank" rel="noopener noreferrer" {...analyticsAttributes({ event: "social_click", location: "founder", label: "LinkedIn", destination: linkedIn, locale, channel: "linkedin" })}>LinkedIn <ArrowRight size={16} aria-hidden="true" /></a>
        </div>
      </div>
    </section>
  );
}
