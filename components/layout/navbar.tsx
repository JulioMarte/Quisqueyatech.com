"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandLockup } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/section";
import { whatsappHref } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

const links = [
  { href: "/#problema", label: "Problema" },
  { href: "/#metodo", label: "Método" },
  { href: "/#empezar", label: "Empezar" },
  { href: "/#soluciones", label: "Soluciones" },
  { href: "/clinicas", label: "Clínicas" },
  { href: "/#faq", label: "Preguntas" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/92 backdrop-blur-[14px]">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" aria-label="QuisqueyaTech" onClick={() => setOpen(false)}>
          <BrandLockup priority />
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Principal">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium text-text-2 hover:bg-bg-2 hover:text-text"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ButtonLink href={whatsappHref("nav")} variant="ghost" target="_blank" rel="noopener noreferrer">
            WhatsApp
          </ButtonLink>
          <ButtonLink href="/#evaluacion">Quiero mi evaluación</ButtonLink>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-line p-2 text-text lg:hidden"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </Container>

      <div
        className={cn(
          "border-t border-line bg-white lg:hidden",
          open ? "block" : "hidden",
        )}
      >
        <Container className="flex flex-col gap-1 py-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium text-text-2 hover:bg-bg-2"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2">
            <ButtonLink
              href={whatsappHref("nav-mobile")}
              variant="wa"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              Enviar mi caso por WhatsApp
            </ButtonLink>
            <ButtonLink href="/#evaluacion" onClick={() => setOpen(false)}>
              Quiero mi evaluación
            </ButtonLink>
          </div>
        </Container>
      </div>
    </header>
  );
}
