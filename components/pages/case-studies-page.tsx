import Link from "next/link";
import { ArrowRight, Check, ExternalLink, Phone } from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/ui/motion";
import { Container, Eyebrow, Section, SectionHead } from "@/components/ui/section";
import { brand } from "@/lib/brand";
import { caseStudies, getCaseStudy } from "@/lib/case-studies";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { caseStudyPath, routePath, type CaseStudyKey, type SiteLocale } from "@/lib/routes";

export function CaseStudiesPage({ locale }: { locale: SiteLocale }) {
  const es = locale === "es";
  const breadcrumbs = breadcrumbJsonLd([
    { name: es ? "Inicio" : "Home", path: routePath("home", locale) },
    { name: es ? "Casos" : "Case studies", path: routePath("caseStudies", locale) },
  ]);

  return (
    <div lang={locale}>
      <Section className="bg-bg-2 py-20">
        <Container>
          <SectionHead
            eyebrow={es ? "Trabajo seleccionado" : "Selected work"}
            title={
              es
                ? "Menos promesas. Más contexto sobre lo que realmente construimos."
                : "Fewer promises. More context about what we actually built."
            }
            lede={
              es
                ? "Presentamos cada proyecto por su contexto, objetivo y trabajo realizado. No publicamos métricas de conversión o crecimiento si no tenemos datos verificables para respaldarlas."
                : "We present each project through its context, objective, and delivered work. We do not publish conversion or growth metrics unless we have verifiable data to support them."
            }
          />
          <StaggerGroup className="grid gap-5 lg:grid-cols-3">
            {caseStudies.map((study, index) => {
              const copy = study.locale[locale];
              return (
                <StaggerItem key={study.key} index={index}>
                  <Link
                    href={caseStudyPath(study.key, locale)}
                    className="group flex h-full flex-col rounded-2xl border border-line bg-white p-7 transition hover:-translate-y-1 hover:border-larimar-deep/30 hover:shadow-lg"
                  >
                    <span className="text-xs font-semibold uppercase tracking-[.16em] text-amber-deep">
                      {copy.category}
                    </span>
                    <h2 className="mt-4 font-display text-2xl font-bold text-primary">
                      {study.client}
                    </h2>
                    <p className="mt-3 flex-1 leading-relaxed text-text-2">{copy.summary}</p>
                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-tech">
                      {es ? "Ver el caso" : "View case study"}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerGroup>
        </Container>
      </Section>
      <CaseContactCta locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}

export function CaseStudyDetail({
  locale,
  caseKey,
}: {
  locale: SiteLocale;
  caseKey: CaseStudyKey;
}) {
  const study = getCaseStudy(caseKey);
  if (!study) return null;
  const es = locale === "es";
  const copy = study.locale[locale];
  const path = caseStudyPath(caseKey, locale);
  const breadcrumbs = breadcrumbJsonLd([
    { name: es ? "Inicio" : "Home", path: routePath("home", locale) },
    { name: es ? "Casos" : "Case studies", path: routePath("caseStudies", locale) },
    { name: study.client, path },
  ]);
  const creativeWorkJsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: `${study.client} — ${copy.category}`,
    description: copy.summary,
    url: absoluteUrl(path),
    creator: { "@id": `${brand.siteUrl}/#business` },
    inLanguage: locale,
  };

  return (
    <div lang={locale}>
      <Section className="bg-bg-2 py-16 sm:py-20">
        <Container className="max-w-[1050px]">
          <Link
            href={routePath("caseStudies", locale)}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-tech"
          >
            ← {es ? "Todos los casos" : "All case studies"}
          </Link>
          <Eyebrow className="mt-7">{copy.category}</Eyebrow>
          <h1 className="mt-4 max-w-[18ch] font-display text-[clamp(40px,5.5vw,64px)] font-extrabold leading-[1.04] tracking-[-.04em] text-primary">
            {study.client}
          </h1>
          <p className="mt-6 max-w-[66ch] text-xl leading-relaxed text-text-2">{copy.title}</p>
          {study.liveUrl ? (
            <a
              href={study.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex min-h-11 items-center gap-2 font-semibold text-tech"
            >
              {es ? "Ver proyecto" : "View project"}
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </Container>
      </Section>

      <Section>
        <Container className="grid gap-6 lg:grid-cols-3">
          <CaseBlock title={es ? "Contexto" : "Context"} body={copy.context} />
          <CaseBlock title={es ? "Objetivo" : "Objective"} body={copy.objective} />
          <CaseBlock title={es ? "Enfoque" : "Approach"} body={copy.solution} />
        </Container>
      </Section>

      <Section className="bg-bg-2">
        <Container className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <Reveal>
            <div>
              <Eyebrow>{es ? "Trabajo realizado" : "Delivered work"}</Eyebrow>
              <h2 className="mt-4 max-w-[18ch] font-display text-[clamp(30px,4vw,44px)] font-bold leading-tight text-primary">
                {es
                  ? "El caso se documenta por lo que podemos demostrar."
                  : "The case is documented through what we can demonstrate."}
              </h2>
              <p className="mt-5 max-w-[55ch] leading-relaxed text-text-2">
                {es
                  ? "No atribuimos crecimiento, retorno o conversión al proyecto sin datos verificables. Cuando existan métricas auditables, pueden añadirse como evidencia; mientras tanto, mostramos el alcance y las decisiones reales."
                  : "We do not attribute growth, return, or conversion to the project without verifiable data. Auditable metrics can be added when available; until then, we show the real scope and decisions."}
              </p>
            </div>
          </Reveal>
          <StaggerGroup className="grid gap-3 sm:grid-cols-2">
            {copy.deliverables.map((deliverable, index) => (
              <StaggerItem key={deliverable} index={index}>
                <div className="flex h-full gap-3 rounded-2xl border border-line bg-white p-5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-larimar-soft text-tech">
                    <Check className="h-4 w-4" />
                  </span>
                  <p className="font-semibold leading-relaxed text-primary">{deliverable}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Container>
      </Section>

      <CaseContactCta locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(creativeWorkJsonLd).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}

function CaseBlock({ title, body }: { title: string; body: string }) {
  return (
    <Reveal>
      <article className="h-full rounded-2xl border border-line bg-white p-7">
        <h2 className="font-display text-xl font-bold text-primary">{title}</h2>
        <p className="mt-3 leading-relaxed text-text-2">{body}</p>
      </article>
    </Reveal>
  );
}

function CaseContactCta({ locale }: { locale: SiteLocale }) {
  const es = locale === "es";
  return (
    <Section className="bg-primary py-20 text-white">
      <Container className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <Eyebrow tone="dark">{es ? "Tu negocio" : "Your business"}</Eyebrow>
          <h2 className="mt-4 max-w-[20ch] font-display text-[clamp(30px,4vw,46px)] font-bold leading-tight">
            {es
              ? "No necesitamos copiar este proyecto. Necesitamos entender el tuyo."
              : "We do not need to copy this project. We need to understand yours."}
          </h2>
        </div>
        <a
          href={brand.publicPhoneHref}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-amber px-6 font-semibold text-white transition hover:bg-amber-deep"
        >
          <Phone className="h-4 w-4" /> {brand.publicPhoneDisplay}
        </a>
      </Container>
    </Section>
  );
}
