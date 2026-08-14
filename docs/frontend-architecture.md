# Frontend architecture

This repository uses Astro as the static application shell and TypeScript React components as the reusable visual component layer.

## Goals

- Keep the public site fully static.
- Keep visual components reusable and strongly typed.
- Avoid duplicated ES/EN markup.
- Keep content, routes, brand data, and environment configuration centralized.
- Add client-side JavaScript only when browser state or interaction requires it.
- Preserve the visual contract inherited from `main`.

## Rendering rule

Use these layers in this order:

```text
Typed data/config
      ↓
React/TSX visual components
      ↓
Astro page/section composition
      ↓
Static HTML/CSS/SVG
      ↓
Optional client island only when required
```

React components do not receive a `client:*` directive by default. Astro renders them to static HTML during the build. Do not hydrate a component merely because it is written in TSX.

## Directory responsibilities

```text
src/
├── components/
│   ├── layout/              # Astro document-level UI such as Navbar and Footer
│   ├── pages/               # Astro page compositions
│   └── react/
│       ├── brand/           # Reusable brand primitives
│       ├── marketing/       # Reusable marketing components
│       ├── pages/           # Typed visual page/section components
│       └── ui/              # Lowest-level UI primitives
├── config/
│   └── site.ts              # Brand, social links, locale routes, route pairs
├── data/
│   ├── home.ts              # Typed bilingual homepage content
│   └── pages.ts             # Typed secondary-page content and page kinds
├── layouts/
│   └── BaseLayout.astro     # HTML document shell, SEO, JSON-LD
├── pages/                   # Route entry points only
├── styles/                  # Shared visual contracts
├── types/
│   └── ui.ts                # Shared UI/domain presentation contracts
└── env.d.ts                 # Public build-time environment types
```

## Component rules

1. Type every public component prop.
2. Keep page route files small. Route files select data and compose components.
3. Do not copy a visual tree to create another locale. Put localized content in typed data.
4. Put reusable links, brand values, routes, social URLs, and identity data in `src/config/site.ts`.
5. Put reusable copy collections in `src/data`, not inside layout components.
6. Use React TSX for reusable visual primitives and repeated visual compositions.
7. Use Astro components for static composition, routing boundaries, and document concerns.
8. Add `client:*` only when the component requires browser state, lifecycle, or interactive React behavior.
9. Prefer native HTML/CSS/SVG for simple disclosure, navigation, animation, and progressive enhancement.
10. Preserve existing CSS class names when extracting a component. Refactoring must not create a parallel design system.
11. Use Lucide components instead of hand-drawn replacement icons when the original design uses Lucide.
12. Do not place API keys, tokens, or server secrets in `PUBLIC_*` variables.

## Component sizing

Treat a component as too large when it owns unrelated concerns or multiple page variants.

Split it when one or more apply:

- it renders multiple independent sections;
- it contains locale-specific branches throughout the visual tree;
- it owns navigation plus SEO plus page content;
- changing one page type risks another page type;
- the same markup exists in two routes;
- it has reusable visual behavior that another route already needs.

Do not split components only to reduce line count. A component should represent a stable visual or semantic responsibility.

## Static React versus islands

Default:

```astro
<HomePage locale="es" />
```

This produces static HTML.

Only hydrate when React must execute in the browser:

```astro
<SomeInteractiveComponent client:visible />
```

Before adding hydration, confirm that native HTML, CSS, SVG, or a small framework-free script cannot implement the behavior more cheaply.

## Data model rules

`Locale` has one canonical definition in `src/types/ui.ts`.

Secondary pages use a required `PageKind` discriminant. A page must explicitly resolve to one supported renderer.

Homepage ES and EN content share the same `HomeContent` interface. Both locales therefore compile against the same visual contract.

## Configuration rules

Use `src/config/site.ts` for:

- brand name;
- descriptor;
- default site URL;
- default contact email;
- founder identity;
- social profiles;
- locale route maps;
- ES/EN route pairs.

Use environment variables only for deployment-specific values.

## Validation gate

Run all checks before accepting a frontend change:

```bash
npm install
npm run check
npm run build
```

`npm run build` also runs `astro check` before the production build.

A refactor is not complete only because TypeScript compiles. Also verify visual parity at representative desktop, tablet, and mobile widths.

## Visual parity rule

`main` remains the visual reference while the migration is active.

When extracting or rewriting a component:

1. Preserve content.
2. Preserve DOM semantics required by CSS and accessibility.
3. Preserve class names and design tokens.
4. Preserve icons and asset sources.
5. Preserve responsive behavior.
6. Preserve visible motion unless the static architecture requires an equivalent implementation.
7. Compare the rendered result, not only source code.

## Adding a new page

Prefer this sequence:

```text
1. Define typed content/data.
2. Reuse an existing page kind when possible.
3. Reuse UI and marketing components.
4. Create a new component only for a distinct visual responsibility.
5. Add a route entry point or static path.
6. Add ES/EN route pairing when applicable.
7. Run check/build.
8. Verify responsive rendering.
```

Do not add another large conditional block to `[...slug].astro`. That file is a dispatcher, not a page implementation.
