import Link from "next/link";
import { brand } from "@/lib/brand";
import type { Locale } from "@/lib/i18n";

export function MessagingTerms({ locale }: { locale: Locale }) {
  const es = locale === "es";
  const sections = es
    ? [
        [
          "Programa",
          "QuisqueyaTech envía confirmaciones, recordatorios, cambios y otros mensajes operativos relacionados con las citas solicitadas por sus usuarios. El programa no incluye publicidad ni promociones.",
        ],
        [
          "Consentimiento y alternativas",
          "La participación es voluntaria y requiere marcar el checkbox de SMS y WhatsApp al agendar. El consentimiento no es una condición para reservar ni comprar. Si no aceptas, enviaremos las comunicaciones operativas por correo electrónico.",
        ],
        [
          "Frecuencia y tarifas",
          "La frecuencia de los mensajes varía según el estado de la cita. Pueden aplicar tarifas de mensajes y datos conforme a tu plan móvil.",
        ],
        [
          "Cancelar o pedir ayuda",
          "Para dejar de recibir SMS, responde STOP. Para obtener ayuda por SMS, responde HELP. En WhatsApp puedes solicitar dejar de recibir mensajes en cualquier momento. También puedes escribirnos por correo.",
        ],
        [
          "Entrega y operadores",
          "Los operadores móviles y las plataformas de mensajería no son responsables por mensajes tardíos o no entregados. La disponibilidad puede variar según el país, dispositivo y proveedor.",
        ],
      ]
    : [
        [
          "Program",
          "QuisqueyaTech sends confirmations, reminders, changes, and other operational messages related to appointments requested by users. The program does not include advertising or promotional messages.",
        ],
        [
          "Consent and alternatives",
          "Participation is voluntary and requires checking the SMS and WhatsApp box when booking. Consent is not a condition of booking or purchase. If you do not agree, operational communications will be sent by email.",
        ],
        [
          "Frequency and charges",
          "Message frequency varies based on appointment status. Message and data rates may apply under your mobile plan.",
        ],
        [
          "Opt out or get help",
          "To stop SMS messages, reply STOP. For SMS help, reply HELP. On WhatsApp, you may ask us to stop messaging you at any time. You may also contact us by email.",
        ],
        [
          "Delivery and carriers",
          "Mobile carriers and messaging platforms are not liable for delayed or undelivered messages. Availability may vary by country, device, and provider.",
        ],
      ];
  return (
    <>
      <h1 className="font-display text-4xl font-bold text-primary">
        {es ? "Términos de mensajería" : "Messaging Terms"}
      </h1>
      <p className="mt-4 text-text-2">
        {es ? "Última actualización: julio de 2026." : "Last updated: July 2026."}
      </p>
      <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-text-2">
        {sections.map(([title, body]) => (
          <section key={title}>
            <h2 className="font-display text-xl font-bold text-text">{title}</h2>
            <p className="mt-2">{body}</p>
          </section>
        ))}
        <section>
          <h2 className="font-display text-xl font-bold text-text">
            {es ? "Contacto y privacidad" : "Contact and privacy"}
          </h2>
          <p className="mt-2">
            {es ? "Ayuda: " : "Support: "}
            <a className="font-semibold text-tech underline" href={`mailto:${brand.publicEmail}`}>
              {brand.publicEmail}
            </a>
            . {es ? "Consulta también nuestra " : "See also our "}
            <Link
              className="font-semibold text-tech underline"
              href={es ? "/privacidad" : "/en/privacy"}
            >
              {es ? "Política de privacidad" : "Privacy Policy"}
            </Link>
            .
          </p>
        </section>
      </div>
    </>
  );
}
