"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { AnimatePresence, m } from "framer-motion";
import { useEffect, useId, useState } from "react";
import { BrandLockup } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/section";
import { alternatePath, localeFromPath, uiCopy, withLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const solutionLinks = {
  es: [
    [
      "/soluciones/automatizacion",
      "Automatización de procesos",
      "Reduce trabajo manual y errores repetidos.",
    ],
    ["/soluciones/agentes-de-ia", "Agentes de IA", "Conversaciones y tareas con control humano."],
    [
      "/soluciones/software-e-integraciones",
      "Software e integraciones",
      "Conecta herramientas y datos aislados.",
    ],
    [
      "/soluciones/clinicas",
      "Soluciones para clínicas",
      "Aplicaciones para recepción y seguimiento.",
    ],
  ],
  en: [
    ["/en/solutions/automation", "Process automation", "Reduce manual work and recurring errors."],
    ["/en/solutions/ai-agents", "AI agents", "Conversations and tasks with human oversight."],
    [
      "/en/solutions/software-and-integrations",
      "Software and integrations",
      "Connect isolated tools and data.",
    ],
    ["/en/solutions/clinics", "Solutions for clinics", "Applications for intake and follow-up."],
  ],
} as const;

export function Navbar() {
  const pathname = usePathname();
  const locale = localeFromPath(pathname);
  const copy = uiCopy[locale];
  const [open, setOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const mobileMenuId = useId();
  const mobileSolutionsId = useId();

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setSolutionsOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const mainLinks = [
    { href: locale === "es" ? "/como-trabajamos" : "/en/how-we-work", label: copy.method },
    { href: withLocale(locale, "/recursos"), label: copy.resources },
    { href: locale === "es" ? "/nosotros" : "/en/about", label: copy.about },
  ];
  const solutionsHref = locale === "es" ? "/soluciones" : "/en/solutions";
  const assessmentHref = locale === "es" ? "/evaluacion" : "/en/assessment";
  const isSolutionsActive = pathname === solutionsHref || pathname.startsWith(`${solutionsHref}/`);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const closeMobileMenu = () => {
    setOpen(false);
    setSolutionsOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur-md">
      <Container className="grid h-[68px] grid-cols-[auto_1fr_auto] items-center gap-4">
        <Link href={withLocale(locale)} aria-label="QuisqueyaTech" onClick={closeMobileMenu}>
          <BrandLockup priority showDescriptor={false} />
        </Link>

        <nav
          className="hidden items-center justify-self-center gap-1 xl:flex"
          aria-label={locale === "es" ? "Principal" : "Main"}
        >
          <div className="group relative">
            <Link
              href={solutionsHref}
              aria-haspopup="true"
              className={cn(
                "relative inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-md px-3 text-sm font-medium transition-colors hover:bg-bg-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep",
                isSolutionsActive ? "bg-bg-2 text-primary" : "text-text-2",
              )}
            >
              {copy.solutions}
              <ChevronDown
                className="h-4 w-4 transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180"
                aria-hidden="true"
              />
              {isSolutionsActive && (
                <m.span
                  layoutId="nav-active-indicator"
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-amber"
                  aria-hidden="true"
                />
              )}
            </Link>
            <div className="invisible absolute left-1/2 top-full w-[620px] -translate-x-1/2 translate-y-3 pt-2 opacity-0 transition duration-200 ease-[cubic-bezier(.16,1,.3,1)] group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
              <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
                <div className="grid grid-cols-2 gap-1 p-2">
                  {solutionLinks[locale].map(([href, label, description]) => (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "block rounded-xl px-4 py-3.5 transition-colors hover:bg-bg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-larimar-deep",
                        isActive(href) && "bg-larimar-soft",
                      )}
                    >
                      <span className="block text-sm font-semibold text-text">{label}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-mute">
                        {description}
                      </span>
                    </Link>
                  ))}
                </div>
                <Link
                  href={solutionsHref}
                  className="flex min-h-11 items-center justify-between border-t border-line bg-bg-2 px-5 text-sm font-semibold text-primary transition-colors hover:bg-larimar-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-larimar-deep"
                >
                  <span>{locale === "es" ? "Ver todas las soluciones" : "View all solutions"}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "relative inline-flex min-h-11 cursor-pointer items-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-bg-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep",
                isActive(link.href) ? "bg-bg-2 text-primary" : "text-text-2",
              )}
            >
              {link.label}
              {isActive(link.href) && (
                <m.span
                  layoutId="nav-active-indicator"
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-amber"
                  aria-hidden="true"
                />
              )}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center justify-self-end gap-3 xl:flex">
          <LanguageSwitch locale={locale} alternateHref={alternatePath(pathname)} />
          <ButtonLink href={assessmentHref}>{copy.assessment}</ButtonLink>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center justify-self-end rounded-lg border border-line bg-white text-text transition-colors hover:bg-bg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep xl:hidden"
          aria-expanded={open}
          aria-controls={mobileMenuId}
          aria-label={open ? copy.close : copy.menu}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </Container>

      <AnimatePresence initial={false}>
        {open ? (
          <m.div
            id={mobileMenuId}
            initial={{ height: 0, opacity: 0, y: -8 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-line bg-white shadow-lg xl:hidden"
          >
            <Container className="max-h-[calc(100dvh-68px)] overflow-y-auto py-4">
              <button
                type="button"
                className={cn(
                  "flex min-h-11 w-full cursor-pointer items-center justify-between rounded-lg px-3 text-sm font-semibold transition-colors hover:bg-bg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep",
                  isSolutionsActive ? "text-primary" : "text-text",
                )}
                aria-expanded={solutionsOpen}
                aria-controls={mobileSolutionsId}
                onClick={() => setSolutionsOpen((value) => !value)}
              >
                <span>{copy.solutions}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-150",
                    solutionsOpen && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </button>
              <AnimatePresence initial={false}>
                {solutionsOpen ? (
                  <m.div
                    id={mobileSolutionsId}
                    initial={{ height: 0, opacity: 0, y: -6 }}
                    animate={{ height: "auto", opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: -6 }}
                    transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-1 overflow-hidden border-l-2 border-larimar-soft pl-2"
                  >
                    {solutionLinks[locale].map(([href, label]) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={closeMobileMenu}
                        aria-current={isActive(href) ? "page" : undefined}
                        className={cn(
                          "flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors hover:bg-bg-2",
                          isActive(href) ? "bg-larimar-soft text-primary" : "text-text-2",
                        )}
                      >
                        {label}
                      </Link>
                    ))}
                    <Link
                      href={solutionsHref}
                      onClick={closeMobileMenu}
                      className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-primary hover:bg-bg-2"
                    >
                      {locale === "es" ? "Ver todas" : "View all"}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </m.div>
                ) : null}
              </AnimatePresence>
              <div className="my-3 border-t border-line" />
              {mainLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMobileMenu}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors hover:bg-bg-2",
                    isActive(link.href) ? "bg-bg-2 font-semibold text-primary" : "text-text-2",
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-4 border-t border-line pt-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-mute">
                    {locale === "es" ? "Idioma" : "Language"}
                  </span>
                  <LanguageSwitch
                    locale={locale}
                    alternateHref={alternatePath(pathname)}
                    onNavigate={closeMobileMenu}
                  />
                </div>
                <ButtonLink href={assessmentHref} className="mt-4 w-full" onClick={closeMobileMenu}>
                  {copy.assessment}
                </ButtonLink>
              </div>
            </Container>
          </m.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function LanguageSwitch({
  locale,
  alternateHref,
  onNavigate,
}: {
  locale: "es" | "en";
  alternateHref: string;
  onNavigate?: () => void;
}) {
  return (
    <div
      className="inline-flex h-11 items-stretch overflow-hidden rounded-lg border border-line bg-bg-2"
      aria-label={locale === "es" ? "Seleccionar idioma" : "Select language"}
    >
      {locale === "es" ? (
        <>
          <span
            className="inline-flex min-w-11 items-center justify-center bg-white px-2 text-xs font-bold text-primary shadow-sm"
            aria-current="true"
          >
            ES
          </span>
          <Link
            href={alternateHref}
            hrefLang="en"
            onClick={onNavigate}
            className="inline-flex min-w-11 cursor-pointer items-center justify-center px-2 text-xs font-semibold text-mute transition-colors hover:bg-white hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-larimar-deep"
          >
            EN
          </Link>
        </>
      ) : (
        <>
          <Link
            href={alternateHref}
            hrefLang="es"
            onClick={onNavigate}
            className="inline-flex min-w-11 cursor-pointer items-center justify-center px-2 text-xs font-semibold text-mute transition-colors hover:bg-white hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-larimar-deep"
          >
            ES
          </Link>
          <span
            className="inline-flex min-w-11 items-center justify-center bg-white px-2 text-xs font-bold text-primary shadow-sm"
            aria-current="true"
          >
            EN
          </span>
        </>
      )}
    </div>
  );
}
