# syntax=docker/dockerfile:1
#
# Production image for Next.js standalone.
# Method A: GitHub Actions → GHCR → Coolify pull
# Method B: Coolify builds this Dockerfile from git
#
# Coolify: mark these as "Available at Buildtime" (or Build Arguments):
#   NEXT_PUBLIC_SITE_URL
#   NEXT_PUBLIC_CONTACT_EMAIL
#   NEXT_PUBLIC_CONVEX_URL
#   NEXT_PUBLIC_CONVEX_SITE_URL
#   NEXT_PUBLIC_TURNSTILE_SITE_KEY
#
# Use Debian slim (not Alpine): sharper native deps + fewer Coolify OOM/native crashes.

FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# --- dependencies (full install; Next needs devDeps to compile) ---
FROM base AS deps
COPY package.json package-lock.json .npmrc ./
# Ensure install scripts (sharp, esbuild) always run — npm 11 can skip them otherwise.
RUN npm ci --foreground-scripts

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
# Cap heap so Node fails with a clear OOM instead of silent exit 255 on small VPS.
ENV NODE_OPTIONS=--max-old-space-size=3072
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Webpack is more memory-predictable than Turbopack on low-RAM Coolify hosts.
RUN set -eux; \
  echo "Build-time public config:"; \
  echo "  NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL"; \
  echo "  NEXT_PUBLIC_CONVEX_URL=${NEXT_PUBLIC_CONVEX_URL:-<empty>}"; \
  echo "  NEXT_PUBLIC_CONVEX_SITE_URL=${NEXT_PUBLIC_CONVEX_SITE_URL:-<empty>}"; \
  if [ -z "$NEXT_PUBLIC_CONVEX_URL" ]; then \
    echo "WARNING: NEXT_PUBLIC_CONVEX_URL is empty. Set it as a Coolify build-time variable."; \
  fi; \
  npx next build --webpack

# --- runtime ---
FROM node:24-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

RUN mkdir -p ./public
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
