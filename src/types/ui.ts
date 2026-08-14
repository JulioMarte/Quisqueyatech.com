import type { ReactNode } from "react";
import type { AnalyticsMeta } from "./analytics";

export type Locale = "es" | "en";

export type ButtonVariant = "primary" | "outline" | "dark-outline";
export type ButtonSize = "default" | "lg";

export interface ButtonProps {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  target?: "_self" | "_blank";
  rel?: string;
  ariaLabel?: string;
  analytics?: AnalyticsMeta;
}

export interface BrandLockupProps {
  href: string;
  showDescriptor?: boolean;
  className?: string;
  ariaLabel?: string;
  analytics?: AnalyticsMeta;
}

export interface SectionHeadProps {
  eyebrow?: string;
  title: string;
  description?: string;
  dark?: boolean;
  className?: string;
}

export interface NavItem {
  href: string;
  label: string;
  description?: string;
}
