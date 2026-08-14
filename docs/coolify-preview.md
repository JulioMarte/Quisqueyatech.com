# Coolify preview deployment

Use this checklist when deploying the `development` branch to a preview domain such as `https://preview.quisqueyatech.com`.

## Resource settings

- Branch: `development`
- Build Pack: Dockerfile
- Dockerfile: `/Dockerfile`
- Port Exposes: `80`
- Domain: `https://preview.quisqueyatech.com`
- Do not add a host port mapping.

The image also listens on container port `3000` for compatibility with Coolify resources that still have the old Next.js port configured. New resources should use port `80`.

## Build variables

Set these as variables available during the Docker build:

```env
PUBLIC_SITE_URL=https://preview.quisqueyatech.com
PUBLIC_CONTACT_EMAIL=info@quisqueyatech.com
PUBLIC_LIVEKIT_ASSESSMENT_URL=
PUBLIC_ASSESSMENT_SCHEDULE_URL=
```

If preview analytics should be enabled, create or select an Umami Website for the preview hostname and set:

```env
PUBLIC_UMAMI_SCRIPT_URL=https://umami.quisqueyatech.com/script.js
PUBLIC_UMAMI_WEBSITE_ID=<preview-website-id>
PUBLIC_UMAMI_DOMAINS=preview.quisqueyatech.com
PUBLIC_UMAMI_HOST_URL=
```

Do not reuse the localhost Website ID for production analytics.

## Health check

The container exposes:

```text
/healthz
```

Expected response:

```text
ok
```

Nginx listens on container ports `80` and `3000`, so both of these are valid internally:

```text
http://container:80/healthz
http://container:3000/healthz
```

## 502 Bad Gateway

A 502 from Coolify usually means the proxy is sending traffic to the wrong container port.

For this image:

1. Set **Port Exposes** to `80` for new deployments.
2. If the resource still uses `3000`, redeploy; the image supports that port as a migration fallback.
3. Do not configure `8080:80`, `3000:3000`, or another host port mapping for normal domain routing.
4. Confirm the container is healthy.
5. Confirm `/healthz` returns `200` from inside the container.
6. Redeploy after changing build variables because Astro embeds `PUBLIC_*` values during the static build.

The Nginx configuration uses `server_name _`, so the static website is not coupled to a specific hostname. Any Coolify domain can serve the image. Set `PUBLIC_SITE_URL` to the deployment's canonical URL so sitemap, canonical links, Open Graph URLs, and `hreflang` use the correct host.
