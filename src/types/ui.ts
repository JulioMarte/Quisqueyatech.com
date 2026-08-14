import type { ReactNode } from "react";

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
}

export interface BrandLockupProps {
  href: string;
  showDescriptor?: boolean;
  className?: string;
  ariaLabel?: string;
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
