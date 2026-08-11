"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Phone, X } from "lucide-react";
import { AnimatePresence, m } from "framer-motion";
import { useEffect, useId, useState } from "react";
import { BrandLockup } from "@/components/brand/logo";
import { Container } from "@/components/ui/section";
import { brand } from "@/lib/brand";
import { alternatePath, localeFromPath, withLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const locale = localeFromPath(pathname);
  const isEs = locale === "es";
  const [open, setOpen] = useState(false);
  const mobileMenuId = useId();

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const links = [
    { href: isEs ? "/soluciones" : "/en/solutions", label: isEs ? "Servicios" : "Services" },
    { href: isEs ? "/#casos" : "/en#case-studies", label: isEs ? "Casos" : "Case studies" },
    { href: withLocale(locale, "/recursos"), label: isEs ? "Recursos" : "Resources" },
    { href: isEs ? "/nosotros" : "/en/about", label: isEs ? "Nosotros" : "About" },
  ];

  const isActive = (href: string) => !href.includes("#") && (pathname === href || pathname.startsWith(`${href}/`));
  const closeMobileMenu = () => setOpen(false);
  const contactHref = brand.publicPhoneHref || `mailto:${brand.publicEmail}`;
  const contactLabel = brand.publicPhoneDisplay || (isEs ? "Hablar con nosotros" : "Talk to us");

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur-md">
      <Container className="grid h-[68px] grid-cols-[auto_1fr_auto] items-center gap-4">
        <Link href={withLocale(locale)} aria-label="QuisqueyaTech" onClick={closeMobileMenu}>
          <BrandLockup priority showDescriptor={false} />
        </Link>

        <nav className="hidden items-center justify-self-center gap-1 lg:flex" aria-label={isEs ? "Principal" : "Main"}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "relative inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-bg-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep",
                isActive(link.href) ? "bg-bg-2 text-primary" : "text-text-2",
              )}
            >
              {link.label}
              {isActive(link.href) ? (
                <m.span
                  layoutId="nav-active-indicator"
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-amber"
                  aria-hidden="true"
                />
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center justify-self-end gap-3 lg:flex">
          <LanguageSwitch locale={locale} alternateHref={alternatePath(pathname)} />
          <a
            href={contactHref}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-amber px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-amber-deep hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep focus-visible:ring-offset-2"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            {contactLabel}
          </a>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center justify-self-end rounded-lg border border-line bg-white text-text transition-colors hover:bg-bg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep lg:hidden"
          aria-expanded={open}
          aria-controls={mobileMenuId}
          aria-label={open ? (isEs ? "Cerrar menú" : "Close menu") : isEs ? "Abrir menú" : "Open menu"}
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
            className="overflow-hidden border-t border-line bg-white shadow-lg lg:hidden"
          >
            <Container className="max-h-[calc(100dvh-68px)] overflow-y-auto py-4">
              <nav className="space-y-1" aria-label={isEs ? "Menú móvil" : "Mobile menu"}>
                {links.map((link) => (
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
              </nav>
              <div className="mt-4 border-t border-line pt-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-mute">
                    {isEs ? "Idioma" : "Language"}
                  </span>
                  <LanguageSwitch locale={locale} alternateHref={alternatePath(pathname)} onNavigate={closeMobileMenu} />
                </div>
                <a
                  href={contactHref}
                  onClick={closeMobileMenu}
                  className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-amber px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {contactLabel}
                </a>
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
          <span className="inline-flex min-w-11 items-center justify-center bg-white px-2 text-xs font-bold text-primary shadow-sm" aria-current="true">ES</span>
          <Link href={alternateHref} hrefLang="en" onClick={onNavigate} className="inline-flex min-w-11 items-center justify-center px-2 text-xs font-semibold text-mute transition-colors hover:bg-white hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-larimar-deep">EN</Link>
        </>
      ) : (
        <>
          <Link href={alternateHref} hrefLang="es" onClick={onNavigate} className="inline-flex min-w-11 items-center justify-center px-2 text-xs font-semibold text-mute transition-colors hover:bg-white hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-larimar-deep">ES</Link>
          <span className="inline-flex min-w-11 items-center justify-center bg-white px-2 text-xs font-bold text-primary shadow-sm" aria-current="true">EN</span>
        </>
      )}
    </div>
  );
}
