(() => {
  const sanitize = (value) => String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);

  const pageLocale = () => document.documentElement.lang === "en" ? "en" : "es";

  const inferLocation = (element) => {
    if (element.closest("header.site-header")) return element.closest("#mobile-menu") ? "mobile_nav" : "navbar";
    if (element.closest(".mega-menu")) return "mega_menu";
    if (element.closest("footer.site-footer")) return "footer";
    if (element.closest(".hero-orchestration")) return "hero";
    if (element.closest(".assessment-panel") || element.closest(".assessment-choice-grid")) return "assessment";
    if (element.closest(".founder")) return "founder";
    if (element.closest(".resources-cta")) return "resources";
    if (element.closest(".signature-cta")) return "final_cta";
    if (element.closest(".privacy-copy")) return "privacy";
    if (element.closest("main")) return "page";
    return "unknown";
  };

  const inferLabel = (element) => sanitize(
    element.getAttribute("aria-label") ||
    element.getAttribute("title") ||
    element.textContent ||
    element.id ||
    element.tagName.toLowerCase()
  );

  const inferDestination = (element) => {
    if (element instanceof HTMLAnchorElement) return element.href;
    return "";
  };

  const semanticMeta = (element) => {
    const data = element.dataset;
    const event = data.analyticsEvent;
    if (!event) return null;

    return {
      event,
      properties: {
        location: data.analyticsLocation || inferLocation(element),
        label: data.analyticsLabel || inferLabel(element),
        destination: data.analyticsDestination || inferDestination(element),
        locale: data.analyticsLocale || pageLocale(),
        action: data.analyticsAction || undefined,
        solution: data.analyticsSolution || undefined,
        channel: data.analyticsChannel || undefined,
      },
    };
  };

  const fallbackMeta = (element) => {
    const destination = inferDestination(element);
    const external = element instanceof HTMLAnchorElement && element.origin !== location.origin && !element.href.startsWith("mailto:") && !element.href.startsWith("tel:");
    const email = element instanceof HTMLAnchorElement && element.href.startsWith("mailto:");

    return {
      event: external ? "outbound_click" : email ? "email_click" : "ui_click",
      properties: {
        location: inferLocation(element),
        label: inferLabel(element),
        destination,
        locale: pageLocale(),
        channel: external ? "external" : email ? "email" : undefined,
      },
    };
  };

  const compact = (properties) => Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );

  const queue = [];
  let flushTimer = null;

  const flush = () => {
    flushTimer = null;
    if (!window.umami?.track) {
      if (queue.length) flushTimer = window.setTimeout(flush, 250);
      return;
    }
    while (queue.length) {
      const item = queue.shift();
      try {
        window.umami.track(item.event, compact(item.properties));
      } catch (error) {
        console.warn("[Analytics] Umami event failed", item.event, error);
      }
    }
  };

  const send = (payload) => {
    queue.push(payload);
    if (!flushTimer) flushTimer = window.setTimeout(flush, 0);
  };

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const actionable = target.closest("a,button,summary,[role='button']");
    if (!actionable) return;

    send(semanticMeta(actionable) || fallbackMeta(actionable));
  }, { capture: true });

  window.QuisqueyaAnalytics = {
    track(event, properties = {}) {
      send({ event, properties: { locale: pageLocale(), ...properties } });
    },
  };
})();
