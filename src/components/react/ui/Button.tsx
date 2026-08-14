import type { ButtonProps } from "../../../types/ui";

const variantClass = {
  primary: "button-primary",
  outline: "button-outline",
  "dark-outline": "button-dark-outline",
} as const;

export function Button({
  href,
  children,
  variant = "primary",
  size = "default",
  className = "",
  target,
  rel,
  ariaLabel,
}: ButtonProps) {
  const classes = [
    "button",
    variantClass[variant],
    size === "lg" ? "button-lg" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <a
      className={classes}
      href={href}
      target={target}
      rel={rel}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}
