import type { SectionHeadProps } from "../../../types/ui";

export function SectionHead({
  eyebrow,
  title,
  description,
  dark = false,
  className = "",
}: SectionHeadProps) {
  return (
    <div className={["section-head", className].filter(Boolean).join(" ")}>
      {eyebrow ? <span className={dark ? "eyebrow dark" : "eyebrow"}>{eyebrow}</span> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
