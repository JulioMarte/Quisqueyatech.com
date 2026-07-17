# syntax=docker/dockerfile:1
#
# Production image for Next.js standalone.
# Works for both:
#   A) GitHub Actions → GHCR → Coolify pull
#   B) Coolify "Dockerfile" build from git
#
# Build args (public only — never bake secrets here):
#   NEXT_PUBLIC_SITE_URL
#   NEXT_PUBLIC_CONTACT_EMAIL
#   NEXT_PUBLIC_CONVEX_URL
#   NEXT_PUBLIC_CONVEX_SITE_URL
#   NEXT_PUBLIC_TURNSTILE_SITE_KEY

FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Required by some native deps (sharp) on Alpine.
RUN apk add --no-cache libc6-compat

# --- dependencies ---
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- build ---
FROM base AS builder
ARG NEXT_PUBLIC_SITE_URL=https://www.quisqueyatech.com
ARG NEXT_PUBLIC_CONTACT_EMAIL=info@quisqueyatech.com
ARG NEXT_PUBLIC_CONVEX_URL=
ARG NEXT_PUBLIC_CONVEX_SITE_URL=
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_CONVEX_SITE_URL=$NEXT_PUBLIC_CONVEX_SITE_URL
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
# Keep install graph available for Next tracing; do not set NODE_ENV=production here.
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- runtime ---
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN apk add --no-cache libc6-compat \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Ensure public exists even if empty in a sparse checkout.
RUN mkdir -p ./public
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
