import { Mail, Phone } from "lucide-react";
import { brand } from "@/lib/brand";

/**
 * Shared closing CTA for every visual-direction preview.
 *
 * The composition intentionally preserves the strong full-width navy closing
 * block from the original main homepage while updating the message to the new
 * business-systems positioning. Keeping this block constant makes the A/B/C/D
 * comparison more useful: the experimental content changes, the final conversion
 * moment does not.
 */
export function PreviewClosingCta() {
  return (
    <section className="bg-primary px-5 py-20 text-center text-white sm:py-24 lg:py-28">
      <div className="mx-auto max-w-[900px]">
        <h2 className="mx-auto max-w-[19ch] font-display text-[clamp(36px,5vw,60px)] font-extrabold leading-[1.12] tracking-[-.035em]">
          Descubre dónde tu negocio puede ganar tiempo, clientes y claridad.
        </h2>
        <p className="mx-auto mt-6 max-w-[58ch] text-base leading-relaxed text-white/70 sm:text-lg">
          Cuéntanos cómo funciona hoy. Identificamos la fricción que vale la pena resolver y el
          próximo paso más útil antes de recomendar tecnología.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href={brand.publicPhoneHref}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber px-6 text-sm font-bold text-white shadow-sm transition hover:-translate-y-px hover:bg-amber-deep hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            Hablar con QuisqueyaTech
          </a>
          <a
            href={`mailto:${brand.publicEmail}?subject=${encodeURIComponent("Quiero mejorar un proceso de mi negocio")}`}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/[.06] px-6 text-sm font-bold text-white transition hover:border-white/45 hover:bg-white/[.11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            Cuéntanos tu caso
          </a>
        </div>
      </div>
    </section>
  );
}
