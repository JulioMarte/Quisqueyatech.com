"use client";

// Focus trap: keeps Tab/Shift+Tab inside the active container and
// restores focus to the previously-focused element on cleanup.
// Implements WCAG 2.4.3 (Focus Order) and 2.1.2 (No Keyboard Trap).
//
// Usage:
//   const ref = useRef<HTMLDivElement>(null);
//   useFocusTrap(ref, active);

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "audio[controls]",
  "video[controls]",
  '[contenteditable="true"]',
].join(",");

export function useFocusTrap<T extends HTMLElement>(
  containerRef: React.RefObject<T | null>,
  active: boolean,
): void {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    // Capture non-null so the inner function can use it without re-narrowing.
    const trap: HTMLElement = container;

    // Remember who had focus so we can restore it.
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Move initial focus into the trap. Prefer the first focusable; if
    // none exists, focus the container itself (still keeps the trap).
    const focusables = getFocusables(trap);
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      trap.tabIndex = -1;
      trap.focus();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const items = getFocusables(trap);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (current === first || !trap.contains(current)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (current === last || !trap.contains(current)) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    trap.addEventListener("keydown", onKeyDown);
    return () => {
      trap.removeEventListener("keydown", onKeyDown);
      const previous = previouslyFocused.current;
      if (previous && typeof previous.focus === "function") {
        previous.focus();
      }
    };
  }, [active, containerRef]);
}

function getFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.hasAttribute("disabled")) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    // Filter visually hidden inputs (Turnstile injects hidden inputs).
    const style = window.getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") return false;
    return true;
  });
}
