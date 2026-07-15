"use client";

// Body scroll lock that compensates for the scrollbar gutter so the page
// does not shift horizontally when the modal opens. Works on desktop and
// mobile (iOS Safari: also locks overflow on <html>).

import { useEffect } from "react";

const SCROLL_LOCK_COUNT_ATTR = "data-scroll-lock-count";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iP(hone|ad|od)|iOS/.test(navigator.userAgent);
}

export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;

    const html = document.documentElement;
    const body = document.body;

    const currentCount = Number(body.getAttribute(SCROLL_LOCK_COUNT_ATTR) || 0);
    const nextCount = currentCount + 1;
    body.setAttribute(SCROLL_LOCK_COUNT_ATTR, String(nextCount));
    if (nextCount > 1) return;

    const scrollbarCompensation = window.innerWidth - html.clientWidth;
    const previous = {
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyPaddingRight: body.style.paddingRight,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
    };

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "contain";
    body.style.overflow = "hidden";
    if (scrollbarCompensation > 0) {
      body.style.paddingRight = `${scrollbarCompensation}px`;
    }
    if (isIOS()) {
      const scrollY = window.scrollY;
      body.style.position = "fixed";
      body.style.top = `-${scrollY}px`;
      body.style.width = "100%";
    }

    return () => {
      const remaining = Number(body.getAttribute(SCROLL_LOCK_COUNT_ATTR) || 1) - 1;
      if (remaining > 0) {
        body.setAttribute(SCROLL_LOCK_COUNT_ATTR, String(remaining));
        return;
      }
      body.removeAttribute(SCROLL_LOCK_COUNT_ATTR);

      html.style.overflow = previous.htmlOverflow;
      html.style.overscrollBehavior = previous.htmlOverscroll;
      body.style.overflow = previous.bodyOverflow;
      body.style.paddingRight = previous.bodyPaddingRight;
      if (isIOS()) {
        const scrollY = Math.abs(parseInt(previous.bodyTop || "0", 10)) || 0;
        body.style.position = previous.bodyPosition;
        body.style.top = previous.bodyTop;
        body.style.width = previous.bodyWidth;
        window.scrollTo(0, scrollY);
      }
    };
  }, [active]);
}
