# QuisqueyaTech — SEO architecture

> Scope: public marketing website only.
>
> This document defines the SEO invariants for `www.quisqueyatech.com`. Assessment, scheduling, CRM-like operational state, and reusable business infrastructure are outside this site's long-term product boundary.

## 1. Core rule: every public URL belongs to one language

Spanish URLs use Spanish slugs. English URLs use English slugs.

Do not publish mixed-language paths such as:

```text
/en/recursos
/en/casos
/en/soluciones/automatizacion
```

Use:

```text
/recursos
/en/resources

/casos
/en/case-studies

/soluciones/automatizacion
/en/solutions/automation
```

Proper names can remain unchanged when translation would be artificial:

```text
/casos/connections-rd
/en/case-studies/connections-rd
```

Conceptual names should be translated:

```text
/casos/consulado-dominicano-boston
/en/case-studies/dominican-consulate-boston
```

Article translations can and should have distinct slugs:

```text
/recursos/como-detectar-procesos-que-conviene-automatizar
/en/resources/how-to-find-the-right-processes-to-automate
```

`translationKey` identifies that both articles represent the same content cluster. The slug remains locale-specific.

## 2. Source of truth for route pairs

Static route pairs live in `lib/routes.ts`.

Do not reconstruct localized URLs by blindly adding `/en` to a Spanish path.

Prefer:

```ts
routePath("resources", "en")
resourcePath("en", post.slug)
caseStudyPath(caseKey, "en")
```

instead of:

```ts
`/en${spanishPath}`
```

This prevents mixed-language URLs and makes canonical/hreflang generation deterministic.

## 3. Canonical + hreflang

Every indexable localized page pair should expose:

- a self-referencing canonical;
- `hreflang="es"`;
- `hreflang="en"`;
- `hreflang="x-default"` pointing to the Spanish/default route.

The relationship must be reciprocal.

Example:

```text
ES canonical:
https://www.quisqueyatech.com/soluciones/automatizacion

EN canonical:
https://www.quisqueyatech.com/en/solutions/automation
```

Both pages declare both URLs in their language alternates.

For translated CMS articles, resolve the counterpart through `translationKey`; never assume both translations share the same slug.

## 4. Metadata

Every indexable route must have its own:

- title;
- meta description;
- canonical;
- language alternates;
- Open Graph metadata;
- Twitter/social metadata when useful.

Static metadata definitions live in `lib/seo.ts`.

Page titles should describe the specific page. Branding is applied by the root title template, so child page definitions should not repeatedly append `| QuisqueyaTech`.

## 5. Sitemap

`app/sitemap.ts` is generated from the same route definitions used by the application.

It includes:

- both homepages;
- service pages in both languages;
- resources indexes;
- published articles using locale-specific slugs;
- case study indexes;
- case study details;
- company/about pages;
- privacy pages.

Assessment and scheduling routes are deliberately excluded.

The sitemap should not become a second hand-maintained URL registry.

## 6. robots.txt

`app/robots.ts` allows public marketing content and points crawlers to the sitemap.

Operational surfaces such as `/admin`, `/api`, setup/login/recovery, and machine endpoints are disallowed from crawling.

Authentication remains the security control. `robots.txt` is not a security boundary.

## 7. Structured data

Use structured data only when it accurately describes visible/public content.

Current patterns:

- `ProfessionalService` / Organization for QuisqueyaTech;
- `ContactPoint` for public phone/email;
- `Person` for the founder page;
- `BlogPosting` for resource articles;
- `BreadcrumbList` for content hierarchy;
- `CreativeWork` for case study pages.

Do not invent:

- ratings;
- reviews;
- prices;
- performance metrics;
- addresses;
- awards;
- credentials;
- customer outcomes.

## 8. Service-page content

Service pages are pillar pages, not three-card placeholders.

A useful service page should explain:

1. the business problem;
2. signals that the service may be appropriate;
3. what QuisqueyaTech can build;
4. design/operational principles;
5. common questions;
6. a clear contact action.

Avoid padding pages to reach an arbitrary word count. Useful specificity beats generic SEO copy.

## 9. Case studies

Case studies should create authority through evidence, not invented numbers.

Every case should identify:

- context;
- objective;
- approach;
- delivered work;
- live project when appropriate.

Quantitative outcomes should be added only when a verifiable source exists.

## 10. Resources/content

Content should support the commercial architecture rather than become a generic AI-news blog.

Preferred topic clusters:

```text
Business systems
├── websites and conversion
├── SEO and local discovery
├── lead capture and follow-up
├── automation
├── AI reception / agents
├── booking and request handling
├── reporting / attribution
└── integrations
```

Every article should link naturally to the relevant service, case study, or next step when it genuinely helps the reader.

## 11. Rendering and performance

The marketing website should remain statically renderable or ISR-capable wherever possible.

Do not use request-bound APIs such as headers/cookies in the global marketing layout merely to determine language if routing can express that information instead.

Interactive client components are acceptable, but public content, headings, links, and metadata must be available without requiring a client-side application to discover them.

Core Web Vitals are measured after deployment. Never claim performance scores without field or lab data from the actual build.

## 12. Search Console

The site supports an optional build-time value:

```text
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
```

When configured, Next metadata emits the Google verification tag.

After verification:

1. submit `/sitemap.xml`;
2. inspect representative ES and EN URLs;
3. monitor indexing and canonical selection;
4. monitor queries/clicks/impressions;
5. review Core Web Vitals;
6. investigate structured-data errors;
7. verify redirects from legacy URLs.

Search Console data becomes evidence for SEO decisions; it does not replace analytics/conversion attribution.

## 13. Legacy URL policy

When a URL changes only because the canonical slug was corrected, preserve equity with a permanent redirect.

Current example:

```text
/en/recursos/*
      ↓ 308
/en/resources/*
```

When a feature is truly removed and has no equivalent page, do not create unrelated redirects solely to avoid a 404. Decide whether the correct outcome is a relevant replacement, `404`, or `410` based on the content relationship.

## 14. Content boundary

The website owns public marketing content.

It should not become the source of truth for:

- bookings;
- operational requests;
- appointment state;
- AI assessment sessions;
- business workflows;
- CRM state;
- reusable customer infrastructure.

Future lead/contact submission should call a dedicated external contract/API rather than pull business infrastructure back into this repository.
