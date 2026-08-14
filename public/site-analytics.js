(() => {
  const sanitize = (value) => String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);

  const pageLocale = () => document.documentElement.lang === "en" ? "en" : "es";
  const downloadPattern = /\.(pdf|docx?|xlsx?|pptx?|zip|csv|txt|md|png|jpe?g|webp|svg)$/i;
  const trackerDeadline = Date.now() + 15000;
  const maxQueueSize = 50;

  const inferLocation = (element) => {
    if (element.closest(".mega-menu")) return "mega_menu";
    if (element.closest("header.site-header")) return element.closest("#mobile-menu") ? "mobile_nav" : "navbar";
    if (element.closest("footer.site-footer")) return "footer";
    if (element.closest(".hero-orchestration")) return "hero";
    if (element.closest(".assessment-panel") || element.closest(".choice-grid-main") || element.closest(".assessment-live") || element.closest(".schedule-main")) return "assessment";
    if (element.closest(".founder") || element.closest(".about-main")) return "founder";
    if (element.closest(".resources-cta") || element.closest(".resources-main")) return "resources";
    if (element.closest(".signature-cta") || element.closest(".marketing-cta")) return "final_cta";
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
    const anchor = element instanceof HTMLAnchorElement ? element : null;
    const email = Boolean(anchor?.href.startsWith("mailto:"));
    const phone = Boolean(anchor?.href.startsWith("tel:"));
    const download = Boolean(anchor && (anchor.hasAttribute("download") || downloadPattern.test(new URL(anchor.href, location.href).pathname)));
    const external = Boolean(anchor && anchor.origin !== location.origin && !email && !phone);

    return {
      event: download ? "file_download" : external ? "outbound_click" : email ? "email_click" : phone ? "phone_click" : "ui_click",
      properties: {
        location: inferLocation(element),
        label: inferLabel(element),
        destination,
        locale: pageLocale(),
        channel: download ? "download" : external ? "external" : email ? "email" : phone ? "phone" : undefined,
      },
    };
  };

  const compact = (properties) => Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );

  const queue = [];
  let flushTimer = null;
  let sessionContextSent = false;

  const ensureSessionContext = () => {
    if (sessionContextSent || !window.umami?.identify) return;
    try {
      window.umami.identify({
        locale: pageLocale(),
        surface: "public_web",
        architecture: "astro_static",
      });
      sessionContextSent = true;
    } catch (error) {
      console.warn("[Analytics] Umami session context failed", error);
    }
  };

  const deliver = (item) => {
    if (!window.umami?.track) return false;
    ensureSessionContext();
    try {
      window.umami.track(item.event, compact(item.properties));
      return true;
    } catch (error) {
      console.warn("[Analytics] Umami event failed", item.event, error);
      return false;
    }
  };

  const flush = () => {
    flushTimer = null;
    if (!window.umami?.track) {
      if (Date.now() >= trackerDeadline) {
        queue.length = 0;
        return;
      }
      if (queue.length) flushTimer = window.setTimeout(flush, 250);
      return;
    }
    while (queue.length) {
      const item = queue.shift();
      deliver(item);
    }
  };

  const send = (payload) => {
    if (deliver(payload)) return;
    if (Date.now() >= trackerDeadline) return;
    if (queue.length >= maxQueueSize) queue.shift();
    queue.push(payload);
    if (!flushTimer) flushTimer = window.setTimeout(flush, 100);
  };

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const actionable = target.closest("a,button,summary,[role='button']");
    if (!actionable) return;

    send(semanticMeta(actionable) || fallbackMeta(actionable));
  }, { capture: true });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    send({
      event: form.dataset.analyticsEvent || "form_submit",
      properties: {
        location: form.dataset.analyticsLocation || inferLocation(form),
        label: form.dataset.analyticsLabel || form.getAttribute("name") || form.id || "form",
        locale: form.dataset.analyticsLocale || pageLocale(),
        action: form.getAttribute("action") || undefined,
      },
    });
  }, { capture: true });

  let contextAttempts = 0;
  const primeSessionContext = () => {
    if (window.umami?.identify) {
      ensureSessionContext();
      return;
    }
    contextAttempts += 1;
    if (contextAttempts < 40 && Date.now() < trackerDeadline) window.setTimeout(primeSessionContext, 250);
  };
  window.setTimeout(primeSessionContext, 250);

  window.QuisqueyaAnalytics = {
    track(event, properties = {}) {
      send({ event, properties: { locale: pageLocale(), ...properties } });
    },
  };
})();
