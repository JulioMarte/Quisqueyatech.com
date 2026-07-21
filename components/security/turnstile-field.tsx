"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, RotateCcw, ShieldAlert } from "lucide-react";

export type TurnstileStatus = "loading" | "verified" | "expired" | "error";
type TurnstileFailureCause =
  "browser" | "configuration" | "expired" | "timeout" | "unsupported" | "unavailable";
type TurnstileFailure = { cause: TurnstileFailureCause; code: string };
type TurnstileRenderOptions = {
  sitekey: string;
  action: "assessment_start" | "scheduling_book";
  size: "flexible";
  appearance: "always";
  theme: "auto" | "dark" | "light";
  language: "es" | "en";
  "feedback-enabled": boolean;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": (errorCode: string) => void;
  "timeout-callback": () => void;
  "unsupported-callback": () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: TurnstileRenderOptions) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

export function classifyTurnstileError(errorCode?: string): TurnstileFailure {
  const code = errorCode?.trim() || "CLIENT-UNAVAILABLE";
  if (code.startsWith("110") || code.startsWith("400")) return { cause: "configuration", code };
  if (code.startsWith("300") || code.startsWith("600") || code === "200500")
    return { cause: "browser", code };
  return { cause: "unavailable", code };
}

export function TurnstileField({
  onToken,
  onStatus,
  locale,
  resetSignal = 0,
  tone = "dark",
  action,
}: {
  onToken: (token: string) => void;
  onStatus?: (status: TurnstileStatus) => void;
  locale: "es" | "en";
  resetSignal?: number;
  tone?: "dark" | "light";
  action: "assessment_start" | "scheduling_book";
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef("");
  const previousResetSignal = useRef(resetSignal);
  const [failure, setFailure] = useState<TurnstileFailure | null>(null);
  const es = locale === "es";

  const invalidate = useCallback(
    (nextFailure: TurnstileFailure, status: TurnstileStatus = "error") => {
      onToken("");
      onStatus?.(status);
      setFailure(nextFailure);
    },
    [onStatus, onToken],
  );

  const retry = useCallback(() => {
    onToken("");
    setFailure(null);
    onStatus?.("loading");
    if (widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
      return;
    }
    window.location.reload();
  }, [onStatus, onToken]);

  useEffect(() => {
    if (!siteKey || !container.current) return;
    onStatus?.("loading");
    let disposed = false;
    let settled = false;
    const render = () => {
      if (disposed || !container.current || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(container.current, {
        sitekey: siteKey,
        action,
        size: "flexible",
        appearance: "always",
        theme: tone,
        language: locale,
        "feedback-enabled": false,
        callback: (token) => {
          settled = true;
          setFailure(null);
          onToken(token);
          onStatus?.("verified");
        },
        "expired-callback": () => {
          settled = true;
          invalidate({ cause: "expired", code: "TOKEN-EXPIRED" }, "expired");
        },
        "error-callback": (errorCode) => {
          settled = true;
          invalidate(classifyTurnstileError(errorCode));
        },
        "timeout-callback": () => {
          settled = true;
          invalidate({ cause: "timeout", code: "CHALLENGE-TIMEOUT" });
        },
        "unsupported-callback": () => {
          settled = true;
          invalidate({ cause: "unsupported", code: "BROWSER-UNSUPPORTED" });
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
    const loadTimeout = window.setTimeout(() => {
      if (!settled && !widgetId.current) invalidate({ cause: "browser", code: "CLIENT-BLOCKED" });
    }, 10_000);
    return () => {
      disposed = true;
      window.clearInterval(poll);
      window.clearTimeout(loadTimeout);
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = "";
    };
  }, [action, invalidate, locale, onStatus, onToken, siteKey, tone]);

  useEffect(() => {
    if (previousResetSignal.current === resetSignal) return;
    previousResetSignal.current = resetSignal;
    retry();
  }, [resetSignal, retry]);

  if (!siteKey) return null;
  const assessmentPath = es ? "/evaluacion/ahora" : "/en/assessment/now";
  const panelClass =
    tone === "dark"
      ? "border-amber-300/25 bg-amber-300/10 text-white"
      : "border-amber-600/25 bg-amber-50 text-ink";
  const mutedClass = tone === "dark" ? "text-white/65" : "text-mute";

  return (
    <div className="mt-5">
      <div
        ref={container}
        className="min-h-[65px] w-full"
        aria-label={es ? "Verificación humana" : "Human verification"}
      />
      {failure ? (
        <div className={`mt-3 rounded-2xl border p-4 ${panelClass}`} role="alert">
          <div className="flex gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold">
                {es ? "La verificación necesita atención" : "Verification needs attention"}
              </p>
              <p className={`mt-1 text-sm leading-relaxed ${mutedClass}`}>
                {failureMessage(failure.cause, es)}
              </p>
              <p className={`mt-2 font-mono text-xs ${mutedClass}`}>
                {es ? "Código de soporte" : "Support code"}: {failure.code}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
                <button
                  type="button"
                  onClick={retry}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-white transition hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  {es ? "Reintentar verificación" : "Retry verification"}
                </button>
                <a
                  href={assessmentPath}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-1 py-2 text-sky-400 underline underline-offset-4"
                >
                  {es ? "Abrir evaluación directamente" : "Open assessment directly"}
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function failureMessage(cause: TurnstileFailureCause, es: boolean) {
  if (cause === "configuration")
    return es
      ? "La clave, el hostname o la configuración de Cloudflare no coincide. El equipo debe revisar este código."
      : "The site key, hostname, or Cloudflare configuration does not match. The team should review this code.";
  if (cause === "expired")
    return es
      ? "La verificación expiró. Reinténtala para obtener un token nuevo."
      : "Verification expired. Retry it to obtain a new token.";
  if (cause === "timeout")
    return es
      ? "El desafío tardó demasiado. Revisa la conexión y vuelve a intentarlo."
      : "The challenge took too long. Check your connection and try again.";
  if (cause === "unsupported")
    return es
      ? "Este navegador no es compatible. Abre la evaluación en un navegador actualizado."
      : "This browser is not supported. Open the assessment in an up-to-date browser.";
  if (cause === "browser")
    return es
      ? "El navegador, una extensión o la red bloqueó el desafío. Desactiva el bloqueador para este sitio o prueba otra red o navegador."
      : "The browser, an extension, or the network blocked the challenge. Disable the blocker for this site or try another network or browser.";
  return es
    ? "No pudimos completar el desafío. Revisa la conexión y vuelve a intentarlo."
    : "We could not complete the challenge. Check your connection and try again.";
}
