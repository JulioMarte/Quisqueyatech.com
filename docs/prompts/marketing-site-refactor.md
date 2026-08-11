# Prompt — refactor QuisqueyaTech into a focused marketing website

Use this prompt when continuing the separation of `www.quisqueyatech.com` from the Assessment Platform and business-operation systems.

---

You are a senior product designer and frontend engineer working on the private repository `JulioMarte/Quisqueyatech.com`.

Your job is **not** to preserve the current product architecture by inertia. Your job is to make `www.quisqueyatech.com` a focused, high-quality marketing website for QuisqueyaTech.

## Product boundary

`www.quisqueyatech.com` should ultimately own only the public marketing experience:

- landing pages;
- service pages;
- SEO;
- blog/content;
- case studies / portfolio;
- conversion CTAs;
- basic contact/lead capture;
- brand presentation.

The website must **not** be the long-term home of:

- the AI Assessment Platform;
- LiveKit/Ultravox/Gemini assessment sessions;
- booking/scheduling infrastructure;
- business operations/agenda;
- reusable CRM-like operational state;
- customer-specific business systems;
- generic workflow infrastructure.

Those capabilities are being separated into independent systems. Do not add new coupling to them.

## Positioning

QuisqueyaTech is not primarily a “web design agency” and it is not a generic “AI automation agency.”

The positioning is business-first:

> We learn how a business actually works, identify where it is losing time, customers, or visibility, and build the system that fixes the problem.

Technology is secondary to the business outcome. Websites, SEO, automation, AI agents, integrations, and custom software are tools available to solve the problem.

Do not lead with a technology catalog. Do not sell “more tools.”

A useful north-star message is:

> Your business does not need more software. It needs fewer problems.

Spanish:

> Tu negocio no necesita más software. Necesita menos problemas.

## Visual direction

Preserve QuisqueyaTech’s established visual language:

- deep navy primary;
- larimar/cyan accents;
- orange/amber conversion accent;
- current typography;
- premium but approachable presentation;
- generous white space;
- strong mobile behavior;
- clear visual hierarchy;
- subtle purposeful motion only.

The site should feel more like a confident business consultancy than a software product dashboard.

Take strategic inspiration from the clarity of `icreateyoursite.com`:

- immediately understandable hero;
- one strong primary CTA;
- clear services;
- visible work/case studies;
- simple proof/credibility;
- direct human contact;
- conversion sections that do not require learning a product first.

Do **not** copy another site's layout, assets, testimonials, statistics, copy, or brand identity.

## Primary CTA

The primary commercial CTA is direct contact, with phone first when appropriate.

Public contact defaults:

- Phone: `+1 (829) 445-8366`
- E.164: `+18294458366`
- Email: `info@quisqueyatech.com`

Do not route the primary marketing journey through the legacy Assessment Platform or scheduling system.

A contact form may ask about the business and the problem, but it must remain a marketing intake surface. Long-term operational state belongs outside this repository.

## Homepage information architecture

A strong homepage should communicate approximately this sequence:

1. What QuisqueyaTech helps improve.
2. How we approach business problems.
3. Common friction worth solving.
4. Services/capabilities.
5. Selected real work/case studies.
6. Measurement / evidence.
7. Process: understand → prioritize → build → measure.
8. Useful resources/content.
9. Direct contact.

The homepage should not become a giant feature catalog.

## Services

The public service architecture should support at least:

- Websites and SEO;
- Process automation;
- AI agents;
- Custom software and integrations.

Vertical pages, such as clinics, can demonstrate how these capabilities apply to an industry but must not contaminate the core positioning or make unsupported claims.

Service pages should behave as useful pillar pages. They should explain the business problem, signals that the service fits, what can be built, design principles, FAQs, relevant evidence, and a clear next step.

Do not inflate word count merely for SEO.

## Case studies

Case studies are a core credibility asset.

Use real projects only. Current selected work includes:

- Connections RD;
- The Vocal Room Academy;
- Dominican Consulate in Boston.

For each case, prefer:

- context;
- objective/problem;
- constraints when known;
- solution/approach;
- delivered work;
- screenshots or live project where appropriate;
- measurable outcomes only when the data is verifiable.

Never invent conversion improvements, revenue, ROI, traffic, reviews, ratings, or client quotes.

## SEO architecture

SEO is part of the site architecture, not a metadata patch.

Every indexable page should have:

- a unique useful title;
- a useful description;
- self-referencing canonical;
- Open Graph/social metadata when appropriate;
- structured data only when it truthfully describes the page;
- internal links that reflect the actual information hierarchy.

The site should expose a generated sitemap and robots policy.

Prefer static rendering or ISR for marketing content. Do not introduce request-bound APIs in global layouts without a concrete need.

### Localized slugs are mandatory

A public URL must belong to one language. Do not create mixed-language paths by blindly adding `/en` to a Spanish slug.

Correct examples:

```text
/recursos
/en/resources

/casos
/en/case-studies

/soluciones/automatizacion
/en/solutions/automation

/soluciones/agentes-de-ia
/en/solutions/ai-agents
```

Translated articles may have completely different slugs:

```text
/recursos/como-detectar-procesos-que-conviene-automatizar
/en/resources/how-to-find-the-right-processes-to-automate
```

Use a stable translation key to associate translated content. Slug equality is not a translation mechanism.

Proper names may remain unchanged when translating them would be artificial. Conceptual route names should be translated.

Static route pairs are centralized in `lib/routes.ts`; do not reconstruct them ad hoc.

For every real ES/EN equivalent, metadata should expose reciprocal `hreflang` links and an `x-default`. The canonical must always point to the current language's own URL.

## Structured data

Use structured data conservatively and accurately.

Useful types include:

- Organization / ProfessionalService and ContactPoint;
- Person for the founder profile;
- BlogPosting for real articles;
- BreadcrumbList;
- CreativeWork for documented case studies.

Do not create fake FAQ rich-result schemes, ratings, reviews, addresses, prices, awards, credentials, or performance data.

## Content strategy

Do not turn Resources into a generic AI-news blog.

Prefer content clusters around the problems QuisqueyaTech actually solves:

- websites, SEO and conversion;
- lead capture and follow-up;
- automation;
- AI reception and agents;
- booking/request handling concepts;
- reporting and attribution;
- integrations and business systems.

Content should be useful to a business owner or technical buyer even if they never hire QuisqueyaTech.

## Measurement

The desired measurement model is broader than page views:

```text
source / traffic
      ↓
contact action
      ↓
lead / request
      ↓
commercial outcome
```

The marketing site can instrument public actions, but future business-state attribution should integrate with a dedicated external system rather than rebuilding CRM/booking infrastructure inside this repository.

Do not claim metrics that are not currently measured.

## Engineering constraints

- Keep public content crawlable without requiring client-side discovery.
- Preserve accessibility and keyboard behavior.
- Maintain responsive behavior.
- Avoid unnecessary client components.
- Prefer one source of truth for routes and metadata relationships.
- Keep external operational systems behind contracts/APIs.
- Do not add Assessment/Scheduling dependencies back into the marketing journey.
- Keep implementation straightforward; avoid microfrontend or microservice architecture for a marketing website.
- Validate lint, formatting, typecheck, tests, and production build before merge.

## Search Console

The site supports `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` for Search Console verification metadata.

Do not claim Search Console is configured or verified until a real verification token has been supplied and the property is verified.

Once verified, submit `/sitemap.xml` and monitor indexation, canonical selection, queries, Core Web Vitals, structured-data errors, and legacy redirects.

## Scope discipline

This repository can temporarily contain legacy Assessment/Scheduling implementation while extraction is in progress. That temporary presence is not permission to depend on it from the new public marketing experience.

When removing old public URLs:

- use a permanent redirect only when there is a genuinely equivalent replacement;
- otherwise allow the old URL to return the appropriate 404/410 instead of redirecting users and crawlers to unrelated content;
- do not use `robots.txt` to hide a retired URL if crawlers need to observe its removal.

The final question for every change should be:

> Does this make QuisqueyaTech easier to understand, trust, find, contact, or evaluate as a business-systems partner?

If not, it probably does not belong in the public marketing website.
