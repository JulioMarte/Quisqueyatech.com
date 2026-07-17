"use client";

// Trigger button that opens the global ScheduleModal.
//
// Drop-in replacement for <ButtonLink href="/evaluacion/agendar">.
// Same visual variants as the Button component, but renders as a real
// <button> so it does not navigate. Use `source` to tag analytics.
//
// Usage:
//   <ScheduleModalTrigger variant="primary" size="lg" source="hero">
//     Quiero mi evaluación
//   </ScheduleModalTrigger>

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  useScheduleModal,
  type ScheduleSource,
} from "@/components/evaluation/schedule-modal-context";
import { cn } from "@/lib/utils";

const triggerVariants = cva(
  "motion-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] text-[14.5px] font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:translate-y-0",
  {
    variants: {
      variant: {
        primary: "bg-amber text-white shadow-sm hover:bg-amber-deep hover:shadow-md",
        ghost: "bg-transparent border border-line-2 text-text hover:border-primary hover:bg-white",
        dark: "bg-primary text-white hover:bg-primary-2",
        outline: "border border-line bg-white text-text hover:border-larimar-deep",
        "on-dark-primary": "bg-amber text-white shadow-sm hover:bg-amber-deep hover:shadow-md",
        "on-dark-outline": "border border-white/25 bg-white/10 text-white hover:bg-white/15",
      },
      size: {
        default: "h-11 px-5 py-3",
        lg: "h-12 px-6 py-3.5 text-[15.5px]",
        sm: "h-9 px-3.5 text-sm",
        block: "h-12 w-full px-6 py-3.5 text-[15.5px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ScheduleModalTriggerProps
  extends
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">,
    VariantProps<typeof triggerVariants> {
  /** Tag used for analytics. Defaults to "unknown". */
  source?: ScheduleSource;
  children: ReactNode;
}

export const ScheduleModalTrigger = forwardRef<HTMLButtonElement, ScheduleModalTriggerProps>(
  function ScheduleModalTrigger(
    { className, variant, size, source = "unknown", onClick, children, ...props },
    ref,
  ) {
    const { open } = useScheduleModal();
    return (
      <button
        ref={ref}
        type="button"
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          open(source);
        }}
        className={cn(triggerVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </button>
    );
  },
);
