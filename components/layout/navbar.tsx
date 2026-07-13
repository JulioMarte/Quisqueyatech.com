"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useState } from "react";
import { BrandLockup } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/section";
import {
  alternatePath,
  localeFromPath,
  uiCopy,
  withLocale,
} from "@/lib/i18n";
import { cn } from "@/lib/utils";

const solutionLinks = {
  es: [
    ["/soluciones/automatizacion", "Automatización de procesos", "Reduce trabajo manual y errores repetidos."],
    ["/soluciones/agentes-de-ia", "Agentes de IA", "Conversaciones y tareas con control humano."],
    ["/soluciones/software-e-integraciones", "Software e integraciones", "Conecta herramientas y datos aislados."],
    ["/soluciones/clinicas", "Soluciones para clínicas", "Aplicaciones para recepción y seguimiento."],
  ],
  en: [
    ["/solutions/automation", "Process automation", "Reduce manual work and recurring errors."],
    ["/solutions/ai-agents", "AI agents", "Conversations and tasks with human oversight."],
    ["/solutions/software-and-integrations", "Software and integrations", "Connect isolated tools and data."],
    ["/solutions/clinics", "Solutions for clinics", "Applications for intake and follow-up."],
  ],
} as const;

export function Navbar() {
  const pathname = usePathname();
  const locale = localeFromPath(pathname);
  const copy = uiCopy[locale];
  const [open, setOpen] = useState(false);

  const mainLinks = [
    { href: locale === "es" ? "/como-trabajamos" : "/en/how-we-work", label: copy.method },
    { href: withLocale(locale, "/recursos"), label: copy.resources },
    { href: locale === "es" ? "/nosotros" : "/en/about", label: copy.about },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur-md">
      <Container className="flex h-[72px] items-center justify-between">
        <Link href={withLocale(locale)} aria-label="QuisqueyaTech" onClick={() => setOpen(false)}>
          <BrandLockup priority />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label={locale === "es" ? "Principal" : "Main"}>
          <div className="group relative">
            <Link
              href={locale === "es" ? "/soluciones" : "/en/solutions"}
              className="inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-sm font-medium text-text-2 hover:bg-bg-2 hover:text-text"
            >
              {copy.solutions} <ChevronDown className="h-4 w-4" />
            </Link>
            <div className="invisible absolute left-0 top-full w-[390px] translate-y-1 rounded-xl border border-line bg-white p-2 opacity-0 shadow-xl transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
              {solutionLinks[locale].map(([href, label, description]) => (
                <Link
                  key={href}
                  href={locale === "es" ? href : href}
                  className="block rounded-lg px-4 py-3 hover:bg-bg-2"
                >
                  <span className="block text-sm font-semibold text-text">{label}</span>
                  <span className="mt-0.5 block text-xs text-mute">{description}</span>
                </Link>
              ))}
            </div>
          </div>
          {mainLinks.map((link) => (
            <Link key={link.href} href={link.href} className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-text-2 hover:bg-bg-2 hover:text-text">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href={alternatePath(pathname)} className="inline-flex h-11 min-w-11 items-center justify-center rounded-md text-sm font-semibold text-text-2 hover:bg-bg-2" hrefLang={locale === "es" ? "en" : "es"}>
            {copy.language}
          </Link>
          <ButtonLink href={locale === "es" ? "/evaluacion" : "/en/assessment"}>{copy.assessment}</ButtonLink>
        </div>

        <button type="button" className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-md border border-line text-text lg:hidden" aria-expanded={open} aria-label={open ? copy.close : copy.menu} onClick={() => setOpen((value) => !value)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </Container>

      <div className={cn("border-t border-line bg-white lg:hidden", open ? "block" : "hidden")}>
        <Container className="max-h-[calc(100vh-72px)] overflow-y-auto py-4">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-mute">{copy.solutions}</p>
          {solutionLinks[locale].map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-text-2 hover:bg-bg-2">{label}</Link>
          ))}
          <div className="my-3 border-t border-line" />
          {mainLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-text-2 hover:bg-bg-2">{link.label}</Link>
          ))}
          <div className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr]">
            <ButtonLink href={alternatePath(pathname)} variant="outline" onClick={() => setOpen(false)}>{copy.language}</ButtonLink>
            <ButtonLink href={locale === "es" ? "/evaluacion" : "/en/assessment"} onClick={() => setOpen(false)}>{copy.assessment}</ButtonLink>
          </div>
        </Container>
      </div>
    </header>
  );
}
