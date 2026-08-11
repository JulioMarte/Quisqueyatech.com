import Link from "next/link";
import { ArrowRight, LayoutTemplate } from "lucide-react";
import { marketingVariantDefinitions } from "@/components/experiments/marketing-variants";

export default function PreviewIndexPage() {
  return (
    <main className="min-h-screen bg-bg-2 px-5 py-16 text-text sm:py-24">
      <div className="mx-auto max-w-[1080px]">
        <div className="max-w-[760px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-tech">
            <LayoutTemplate className="h-4 w-4" /> Visual direction lab
          </div>
          <h1 className="mt-6 font-display text-[clamp(42px,6vw,72px)] font-extrabold leading-[1] tracking-[-.05em] text-primary">
            Cuatro formas de hacer que QuisqueyaTech se sienta más visual.
          </h1>
          <p className="mt-6 max-w-[64ch] text-lg leading-relaxed text-text-2">
            Estas rutas son previews no indexables. Comparten la identidad de QuisqueyaTech, pero
            exploran cuatro ritmos visuales distintos antes de elegir una dirección final para
            producción.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {marketingVariantDefinitions.map((variant) => (
            <Link
              key={variant.id}
              href={`/preview/${variant.id}`}
              className="group rounded-[1.5rem] border border-line bg-white p-7 shadow-[0_24px_60px_-50px_rgba(8,47,73,.65)] transition hover:-translate-y-1 hover:border-larimar-deep/30 hover:shadow-[0_30px_70px_-46px_rgba(8,47,73,.65)]"
            >
              <div className="flex items-start justify-between gap-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary font-mono text-sm font-bold text-white">
                  {variant.id.toUpperCase()}
                </span>
                <ArrowRight className="h-5 w-5 text-text-2 transition group-hover:translate-x-1 group-hover:text-amber-deep" />
              </div>
              <h2 className="mt-8 font-display text-2xl font-bold text-primary">{variant.name}</h2>
              <p className="mt-2 leading-relaxed text-text-2">{variant.descriptor}</p>
              <p className="mt-5 text-xs font-bold uppercase tracking-[.15em] text-tech">
                {variant.inspiration}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
