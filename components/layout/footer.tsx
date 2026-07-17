"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLockup } from "@/components/brand/logo";
import { Container } from "@/components/ui/section";
import { brand } from "@/lib/brand";
import { localeFromPath } from "@/lib/i18n";
import { SiFacebook, SiInstagram, SiX } from "react-icons/si";
import { FaLinkedinIn } from "react-icons/fa6";

export function Footer() {
  const locale = localeFromPath(usePathname());
  const isEs = locale === "es";
  const socialLinks = [
    { label: "Instagram", href: brand.social.instagram, Icon: SiInstagram },
    { label: "Facebook", href: brand.social.facebook, Icon: SiFacebook },
    { label: "X", href: brand.social.x, Icon: SiX },
    { label: "LinkedIn", href: brand.founder.linkedIn, Icon: FaLinkedinIn },
  ];
  return (
    <footer className="border-t border-line bg-white py-9 text-sm text-mute lg:py-10">
      <Container>
        <div className="grid gap-x-8 gap-y-9 md:grid-cols-2 lg:grid-cols-[1.35fr_.8fr_.72fr_1.08fr_.95fr] lg:gap-x-10">
          <div>
            <BrandLockup />
            <p className="mt-3 max-w-[32ch] text-text-2">
              {isEs
                ? "Automatización, agentes de IA y software para empresas que quieren operar con más claridad."
                : "Automation, AI agents, and software for companies that want clearer operations."}
            </p>
          </div>
          <FooterGroup
            title={isEs ? "Soluciones" : "Solutions"}
            links={
              isEs
                ? [
                    ["/soluciones/automatizacion", "Automatización"],
                    ["/soluciones/agentes-de-ia", "Agentes de IA"],
                    ["/soluciones/software-e-integraciones", "Software e integraciones"],
                  ]
                : [
                    ["/en/solutions/automation", "Automation"],
                    ["/en/solutions/ai-agents", "AI agents"],
                    ["/en/solutions/software-and-integrations", "Software and integrations"],
                  ]
            }
          />
          <FooterGroup
            title={isEs ? "Compañía" : "Company"}
            links={
              isEs
                ? [
                    ["/como-trabajamos", "Cómo trabajamos"],
                    ["/nosotros", "Nosotros"],
                    ["/recursos", "Recursos"],
                  ]
                : [
                    ["/en/how-we-work", "How we work"],
                    ["/en/about", "About"],
                    ["/en/recursos", "Resources"],
                  ]
            }
          />
          <div>
            <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-primary">
              {isEs ? "Contacto" : "Contact"}
            </h2>
            <a
              href={`mailto:${brand.publicEmail}`}
              className="block py-1.5 text-text-2 hover:text-amber-deep"
            >
              {brand.publicEmail}
            </a>
            <span className="block py-1.5 text-text-2">{brand.location}</span>
            <p className="mt-3 max-w-[30ch] text-xs leading-relaxed text-mute">
              {isEs
                ? "Atención directa desde República Dominicana para proyectos locales e internacionales."
                : "Direct support from the Dominican Republic for local and international projects."}
            </p>
          </div>
          <div>
            <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-primary">
              {isEs ? "Síguenos" : "Follow us"}
            </h2>
            <div
              className="grid grid-cols-2 gap-2"
              aria-label={isEs ? "Redes sociales" : "Social networks"}
            >
              {socialLinks.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${label} de QuisqueyaTech`}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line bg-bg-2 px-3 text-xs font-semibold text-text-2 transition-colors hover:border-tech hover:bg-larimar-soft hover:text-primary lg:px-2"
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-line pt-5 text-xs">
          <span>
            © {new Date().getFullYear()} QuisqueyaTech · {brand.location}
          </span>
          <Link href={isEs ? "/privacidad" : "/en/privacy"} className="hover:text-amber-deep">
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
      <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-primary">
        {title}
      </h2>
      {links.map(([href, label]) => (
        <Link key={href} href={href} className="block py-1.5 text-text-2 hover:text-amber-deep">
          {label}
        </Link>
      ))}
    </div>
  );
}
