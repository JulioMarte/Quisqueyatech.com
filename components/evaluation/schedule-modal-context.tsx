"use client";

// Global Schedule Modal context.
//
// Any client component can call `useScheduleModal().open()` to launch the
// modal. The modal itself is rendered once at the layout level via
// <ScheduleModalHost />. The provider is intentionally tiny: the modal owns
// all of its UI state, this only carries the open/close signal and the
// source (where the open came from, for analytics + deep-linking).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Locale } from "@/lib/i18n";
import { localeFromPath } from "@/lib/i18n";
import { usePathname } from "next/navigation";

export type ScheduleSource =
  | "navbar"
  | "hero"
  | "hero-secondary"
  | "signature-cta"
  | "how-we-work"
  | "marketing-page"
  | "deep-link"
  | "unknown";

interface ScheduleModalContextValue {
  isOpen: boolean;
  source: ScheduleSource;
  locale: Locale;
  open: (source?: ScheduleSource) => void;
  close: () => void;
}

const ScheduleModalContext = createContext<ScheduleModalContextValue | null>(null);

const DEEP_LINK_PARAMS = ["agendar", "schedule", "evaluacion", "assessment"];

export function ScheduleModalProvider({
  children,
  initialLocale = "es",
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [source, setSource] = useState<ScheduleSource>("unknown");
  const pathname = usePathname();
  const locale = pathname ? localeFromPath(pathname) : initialLocale;

  // Deep-link support: ?agendar=1 (or ?schedule=open) auto-opens the
  // modal on first mount. Useful for ad campaigns and shared links.
  /* eslint-disable react-hooks/set-state-in-effect -- intentional deep-link auto-open */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const wantsOpen = DEEP_LINK_PARAMS.some((key) => {
      const value = params.get(key);
      return value === "1" || value === "true" || value === "open";
    });
    if (wantsOpen) {
      setIsOpen(true);
      setSource("deep-link");
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const open = useCallback((next: ScheduleSource = "unknown") => {
    setSource(next);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo<ScheduleModalContextValue>(
    () => ({ isOpen, source, locale, open, close }),
    [isOpen, source, locale, open, close],
  );

  return <ScheduleModalContext.Provider value={value}>{children}</ScheduleModalContext.Provider>;
}

export function useScheduleModal(): ScheduleModalContextValue {
  const ctx = useContext(ScheduleModalContext);
  if (!ctx) {
    throw new Error("useScheduleModal must be used within <ScheduleModalProvider>");
  }
  return ctx;
}
