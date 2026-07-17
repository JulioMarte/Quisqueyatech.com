"use client";

import { useEffect, useRef } from "react";

export type TurnstileStatus = "loading" | "verified" | "expired" | "error";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export function TurnstileField({
  onToken,
  onStatus,
  locale,
}: {
  onToken: (token: string) => void;
  onStatus?: (status: TurnstileStatus) => void;
  locale: "es" | "en";
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!siteKey || !container.current) return;
    onStatus?.("loading");
    let widgetId = "";
    let settled = false;
    const render = () => {
      if (!container.current || !window.turnstile || widgetId) return;
      widgetId = window.turnstile.render(container.current, {
        sitekey: siteKey,
        callback: (token: string) => {
          settled = true;
          onToken(token);
          onStatus?.("verified");
        },
        "expired-callback": () => {
          settled = true;
          onToken("");
          onStatus?.("expired");
        },
        "error-callback": () => {
          settled = true;
          onToken("");
          onStatus?.("error");
        },
      });
    };
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-quisqueya-turnstile="true"]',
    );
    if (existing) render();
    else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.quisqueyaTurnstile = "true";
      script.addEventListener("load", render);
      document.head.appendChild(script);
    }
    const poll = window.setInterval(render, 250);
    const timeout = window.setTimeout(() => {
      if (!settled && !widgetId) onStatus?.("error");
    }, 10_000);
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(timeout);
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [onStatus, onToken, siteKey]);

  if (!siteKey) return null;
  return (
    <div
      ref={container}
      className="mt-5 min-h-[65px]"
      aria-label={locale === "es" ? "Verificación humana" : "Human verification"}
    />
  );
}
