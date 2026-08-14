export const prerender = true;

const isDev = import.meta.env.DEV;
const config = {
  scriptUrl:
    import.meta.env.PUBLIC_UMAMI_SCRIPT_URL ||
    (isDev ? "https://umami.quisqueyatech.com/script.js" : ""),
  websiteId:
    import.meta.env.PUBLIC_UMAMI_WEBSITE_ID ||
    (isDev ? "73646329-42c9-4e31-96a8-ae04366b62fb" : ""),
  domains:
    import.meta.env.PUBLIC_UMAMI_DOMAINS ||
    (isDev ? "localhost" : "quisqueyatech.com,www.quisqueyatech.com"),
  hostUrl: import.meta.env.PUBLIC_UMAMI_HOST_URL || "",
  localPort: isDev ? "4221" : "",
};

export function GET() {
  const source = `(() => {
  const config = ${JSON.stringify(config)};
  if (!config.scriptUrl || !config.websiteId) return;
  if (config.localPort && location.hostname === 'localhost' && location.port !== config.localPort) return;
  if (document.querySelector('script[data-website-id="' + config.websiteId + '"]')) return;

  const tracker = document.createElement('script');
  tracker.defer = true;
  tracker.src = config.scriptUrl;
  tracker.dataset.websiteId = config.websiteId;
  if (config.domains) tracker.dataset.domains = config.domains;
  if (config.hostUrl) tracker.dataset.hostUrl = config.hostUrl;
  document.head.appendChild(tracker);
})();`;

  return new Response(source, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
