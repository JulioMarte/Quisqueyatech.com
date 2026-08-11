# syntax=docker/dockerfile:1
#
# Production image for Next.js standalone.
# Method A: GitHub Actions → GHCR → Coolify pull
# Method B: Coolify builds this Dockerfile from git
#
# Coolify build-time (Available at Buildtime):
#   NEXT_PUBLIC_SITE_URL
#   NEXT_PUBLIC_CONTACT_EMAIL
#   NEXT_PUBLIC_CONTACT_PHONE_DISPLAY
#   NEXT_PUBLIC_CONTACT_PHONE_E164
#   NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
#   NEXT_PUBLIC_CONVEX_URL
#   NEXT_PUBLIC_CONVEX_SITE_URL
#   NEXT_PUBLIC_TURNSTILE_SITE_KEY
#
# Coolify runtime (minimum):
#   ADMIN_API_SECRET
#   TRUST_PROXY_HEADERS=true
#   CONVEX_URL / CONVEX_SITE_URL (optional runtime fallback if build-time was empty)

FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json .npmrc ./
RUN npm ci --foreground-scripts

FROM base AS builder
ARG NEXT_PUBLIC_SITE_URL=https://www.quisqueyatech.com
ARG NEXT_PUBLIC_CONTACT_EMAIL=info@quisqueyatech.com
ARG NEXT_PUBLIC_CONTACT_PHONE_DISPLAY=
ARG NEXT_PUBLIC_CONTACT_PHONE_E164=
ARG NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=
ARG NEXT_PUBLIC_CONVEX_URL=
ARG NEXT_PUBLIC_CONVEX_SITE_URL=
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL
ENV NEXT_PUBLIC_CONTACT_PHONE_DISPLAY=$NEXT_PUBLIC_CONTACT_PHONE_DISPLAY
ENV NEXT_PUBLIC_CONTACT_PHONE_E164=$NEXT_PUBLIC_CONTACT_PHONE_E164
ENV NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=$NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_CONVEX_SITE_URL=$NEXT_PUBLIC_CONVEX_SITE_URL
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NODE_OPTIONS=--max-old-space-size=3072
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN set -eux; \
  echo "Build-time public config:"; \
  echo "  NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL"; \
  echo "  NEXT_PUBLIC_CONTACT_PHONE_DISPLAY=${NEXT_PUBLIC_CONTACT_PHONE_DISPLAY:-<empty>}"; \
  echo "  NEXT_PUBLIC_CONVEX_URL=${NEXT_PUBLIC_CONVEX_URL:-<empty>}"; \
  echo "  NEXT_PUBLIC_CONVEX_SITE_URL=${NEXT_PUBLIC_CONVEX_SITE_URL:-<empty>}"; \
  if [ -z "$NEXT_PUBLIC_CONVEX_URL" ] || [ -z "$NEXT_PUBLIC_CONVEX_SITE_URL" ]; then \
    echo "ERROR: NEXT_PUBLIC_CONVEX_URL and NEXT_PUBLIC_CONVEX_SITE_URL are required at build time."; \
    echo "In Coolify mark them Available at Buildtime, or pass docker build --build-arg."; \
    exit 1; \
  fi; \
  if [ -z "$NEXT_PUBLIC_TURNSTILE_SITE_KEY" ]; then \
    echo "ERROR: NEXT_PUBLIC_TURNSTILE_SITE_KEY is required for production builds."; \
    exit 1; \
  fi; \
  npm run og; \
  npx next build --webpack

FROM node:24-bookworm-slim AS runner
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

RUN mkdir -p ./public
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Liveness only — must stay 200 even if Convex is degraded.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-3000}/api/health" || exit 1

CMD ["sh", "-c", "if [ -z \"$NEXT_PUBLIC_TURNSTILE_SITE_KEY\" ] || [ -z \"$TURNSTILE_SECRET_KEY\" ]; then echo 'ERROR: Both Turnstile site and secret keys are required.' >&2; exit 1; fi; exec node server.js"]
