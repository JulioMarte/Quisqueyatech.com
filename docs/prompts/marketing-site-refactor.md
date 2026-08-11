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

Do **not** copy its layout, copy, visuals, claims, numbers, testimonials, or assets.

## Homepage hierarchy

The homepage should prioritize:

1. Hero: business outcome + direct phone CTA.
2. Problem framing: show that QuisqueyaTech understands how SMB operations fail in practice.
3. Services: web/SEO, automation, AI customer systems, software/integrations.
4. Case studies / selected work.
5. Measurement: make traffic, calls, leads, requests, conversions, and follow-up measurable where applicable.
6. Process: understand → prioritize → build → measure.
7. Blog/resources.
8. Contact: phone + lightweight lead form.

Do not reintroduce the assessment flow as the primary CTA.
Do not reintroduce scheduling UI into the site layout.

## CTA strategy

Primary CTA: direct contact phone number.

Configuration:

- `NEXT_PUBLIC_CONTACT_PHONE_DISPLAY` = human-readable number.
- `NEXT_PUBLIC_CONTACT_PHONE_E164` = E.164 number used in `tel:` links.

If the phone is not configured, gracefully fall back to email/contact rather than inventing or displaying a fake number.

Secondary CTA: contact section/form.

Avoid competing CTAs such as “start assessment now” and “schedule assessment.”

## Contact form

Keep the spirit of the original lead form: short, conversational, business-focused.

Ask for enough information to understand the situation, not enough to create friction.

Useful fields:

- name;
- company;
- email;
- phone/WhatsApp;
- area of interest;
- short description of the current problem.

The question should effectively be:

> Show us what is happening in your business today.

Do not ask visitors to diagnose their own technical solution.

The marketing website may later send this data to a dedicated lead/request API. Do not make the website database the long-term system of record for operational workflows.

## Case studies

Present real work without fabricated performance claims.

Current examples suitable for presentation include:

- Connections RD;
- The Vocal Room Academy;
- Dominican Consulate in Boston.

Until verified metrics are available, describe:

- context;
- objective/problem;
- what was built;
- relevant technologies/process;

Do not invent conversion lifts, revenue, traffic, ranking improvements, client quotes, or statistics.

## Measurement philosophy

A major QuisqueyaTech differentiator should be that delivered systems can be measured.

Where relevant, design projects so reporting can eventually connect:

```text
Visitor / source
      ↓
Contact / lead
      ↓
Request
      ↓
Booking / action
      ↓
Customer / outcome
```

For the marketing site itself, preserve clean analytics hooks and SEO. Do not build a full analytics platform inside this repository.

## Engineering constraints

- Preserve bilingual ES/EN behavior.
- Preserve accessible keyboard/focus behavior.
- Preserve semantic HTML and heading hierarchy.
- Keep SEO metadata canonical and accurate.
- No fake stats, awards, clients, testimonials, or guarantees.
- Avoid adding dependencies unless necessary.
- Prefer existing design tokens/components.
- Avoid giant client components when server components are sufficient.
- Do not put secrets in `NEXT_PUBLIC_*` variables.
- A public phone number is not a secret; provider credentials are.
- Do not delete Assessment/Scheduling backend code during a visual-only task unless specifically instructed. First remove public coupling, then extract/delete infrastructure in a separate refactor.
- Do not break blog/content while separating operational features.

## Acceptance criteria for the visual separation phase

- No homepage CTA sends visitors into the AI assessment.
- No homepage CTA opens scheduling.
- Marketing layout no longer mounts the scheduling modal provider/host.
- Navbar focuses on Services, Case Studies, Resources, About, and Contact.
- Primary navbar CTA is the configured phone/contact action.
- Homepage clearly explains the business-first positioning above the fold.
- Services are understandable without technical jargon.
- Real selected work is visible.
- Measurement/analytics philosophy is visible without fake metrics.
- Blog/resources remain present.
- Contact form remains short and business-focused.
- ES and EN pages use the same information architecture.
- Mobile experience remains first-class.

## Review mindset

Be adversarial about every section.

Ask:

- Does this help a business owner understand what QuisqueyaTech does?
- Does it show a business outcome instead of a technology feature?
- Does it create trust?
- Does it provide evidence?
- Does it move the visitor toward contacting us?
- Is this section necessary?

If a section exists mainly because it was already in the repository, that is not a valid reason to keep it.
