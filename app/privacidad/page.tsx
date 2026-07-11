import type { Metadata } from "next";
import Link from "next/link";
import { Container, Section } from "@/components/ui/section";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Privacidad",
  description: "Política de privacidad de QuisqueyaTech.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <Section>
      <Container className="max-w-3xl">
        <h1 className="font-display text-4xl font-bold text-primary">
          Política de privacidad
        </h1>
        <p className="mt-4 text-text-2">
          Última actualización: julio 2026. QuisqueyaTech ({brand.domain})
          opera desde {brand.location}.
        </p>
        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-text-2">
          <section>
            <h2 className="font-display text-xl font-bold text-text">
              Datos que recopilamos
            </h2>
            <p className="mt-2">
              Cuando envías el formulario de evaluación o nos escribes por
              WhatsApp, podemos recibir: nombre, negocio, sector, número de
              WhatsApp, descripción del problema y origen de la consulta.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl font-bold text-text">Uso</h2>
            <p className="mt-2">
              Usamos esos datos solo para responderte, calificar el lead y, si
              hay acuerdo, prestar servicios de consultoría e implementación.
              No vendemos tu información a terceros.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl font-bold text-text">Contacto</h2>
            <p className="mt-2">
              Para ejercer derechos de acceso o eliminación, escribe a{" "}
              <a className="text-tech underline" href={`mailto:${brand.email}`}>
                {brand.email}
              </a>
              .
            </p>
          </section>
        </div>
        <Link href="/" className="mt-10 inline-block text-sm font-semibold text-amber-deep">
          ← Volver al inicio
        </Link>
      </Container>
    </Section>
  );
}
