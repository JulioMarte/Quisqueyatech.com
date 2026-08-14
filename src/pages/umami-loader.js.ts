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
    (isDev ? "localhost,127.0.0.1" : "quisqueyatech.com,www.quisqueyatech.com"),
  hostUrl: import.meta.env.PUBLIC_UMAMI_HOST_URL || "",
};

export function GET() {
  const source = `(() => {
  const config = ${JSON.stringify(config)};
  if (!config.scriptUrl || !config.websiteId) {
    console.debug('[Umami] tracking disabled: missing script URL or website ID');
    return;
  }
  if (document.querySelector('script[data-website-id="' + config.websiteId + '"]')) return;

  const tracker = document.createElement('script');
  tracker.async = true;
  tracker.src = config.scriptUrl;
  tracker.dataset.websiteId = config.websiteId;
  if (config.domains) tracker.dataset.domains = config.domains;
  if (config.hostUrl) tracker.dataset.hostUrl = config.hostUrl;
  tracker.addEventListener('load', () => console.debug('[Umami] tracker loaded', config.scriptUrl));
  tracker.addEventListener('error', () => console.error('[Umami] tracker failed to load', config.scriptUrl));
  document.head.appendChild(tracker);
})();`;

  return new Response(source, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
