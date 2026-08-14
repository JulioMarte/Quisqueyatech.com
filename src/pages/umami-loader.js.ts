export const prerender = true;

const config = {
  scriptUrl: import.meta.env.PUBLIC_UMAMI_SCRIPT_URL || "",
  websiteId: import.meta.env.PUBLIC_UMAMI_WEBSITE_ID || "",
  domains: import.meta.env.PUBLIC_UMAMI_DOMAINS || "",
  hostUrl: import.meta.env.PUBLIC_UMAMI_HOST_URL || "",
};

export function GET() {
  const source = `(() => {
  const config = ${JSON.stringify(config)};
  if (!config.scriptUrl || !config.websiteId) return;
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
