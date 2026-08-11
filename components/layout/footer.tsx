"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone } from "lucide-react";
import { BrandLockup } from "@/components/brand/logo";
import { Container } from "@/components/ui/section";
import { brand } from "@/lib/brand";
import { localeFromPath } from "@/lib/i18n";
import { routePath } from "@/lib/routes";
import { SiFacebook, SiInstagram, SiX } from "react-icons/si";
import { FaLinkedinIn } from "react-icons/fa6";

export function Footer() {
  const locale = localeFromPath(usePathname());
  const isEs = locale === "es";
  const contactHref = brand.publicPhoneHref || `mailto:${brand.publicEmail}`;
  const contactLabel = brand.publicPhoneDisplay || (isEs ? "Hablar con nosotros" : "Talk to us");
  const contactAnchor = isEs ? "contacto" : "contact";
  const socialLinks = [
    { label: "Instagram", href: brand.social.instagram, Icon: SiInstagram },
    { label: "Facebook", href: brand.social.facebook, Icon: SiFacebook },
    { label: "X", href: brand.social.x, Icon: SiX },
    { label: "LinkedIn", href: brand.founder.linkedIn, Icon: FaLinkedinIn },
  ];

  return (
    <footer lang={locale} className="border-t border-line bg-white py-10 text-sm text-mute lg:py-12">
      <Container>
        <div className="grid gap-x-10 gap-y-9 md:grid-cols-2 lg:grid-cols-[1.4fr_.85fr_.85fr_1.15fr]">
          <div>
            <BrandLockup />
            <p className="mt-3 max-w-[34ch] leading-relaxed text-text-2">
              {isEs
                ? "Entendemos cómo funciona tu negocio y construimos la tecnología que elimina fricción: web, automatización, IA y software específico."
                : "We learn how your business works and build the technology that removes friction: web, automation, AI, and focused software."}
            </p>
          </div>

          <FooterGroup
            title={isEs ? "Explorar" : "Explore"}
            links={[
              [routePath("solutions", locale), isEs ? "Servicios" : "Services"],
              [routePath("caseStudies", locale), isEs ? "Casos" : "Case studies"],
              [routePath("resources", locale), isEs ? "Recursos" : "Resources"],
            ]}
          />

          <FooterGroup
            title={isEs ? "Compañía" : "Company"}
            links={[
              [routePath("method", locale), isEs ? "Cómo trabajamos" : "How we work"],
              [routePath("about", locale), isEs ? "Nosotros" : "About"],
              [`${routePath("home", locale)}#${contactAnchor}`, isEs ? "Contacto" : "Contact"],
            ]}
          />

          <div>
            <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-primary">
              {isEs ? "Contacto directo" : "Direct contact"}
            </h2>
            <a href={contactHref} className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary hover:text-amber-deep">
              <Phone className="h-4 w-4" aria-hidden="true" />
              {contactLabel}
            </a>
            <a href={`mailto:${brand.publicEmail}`} className="block py-1.5 text-text-2 hover:text-amber-deep">
              {brand.publicEmail}
            </a>
            <span className="block py-1.5 text-text-2">{brand.location}</span>
            <div className="mt-4 flex flex-wrap gap-2" aria-label={isEs ? "Redes sociales" : "Social networks"}>
              {socialLinks.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${label} de QuisqueyaTech`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-bg-2 text-text-2 transition-colors hover:border-tech hover:bg-larimar-soft hover:text-primary"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-line pt-5 text-xs">
          <span>© {new Date().getFullYear()} QuisqueyaTech · {brand.location}</span>
          <Link href={routePath("privacy", locale)} className="hover:text-amber-deep">
            {isEs ? "Privacidad" : "Privacy"}
          </Link>
        </div>
      </Container>
    </footer>
  );
}

function FooterGroup({
  title,
  links,
}: {
  title: string;
  links: readonly (readonly [string, string])[];
}) {
  return (
    <div>
      <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-primary">{title}</h2>
      {links.map(([href, label]) => (
        <Link key={href} href={href} className="block py-1.5 text-text-2 hover:text-amber-deep">
          {label}
        </Link>
      ))}
    </div>
  );
}
