import type { BrandLockupProps } from "../../../types/ui";

export function BrandLockup({
  href,
  showDescriptor = false,
  className = "",
  ariaLabel = "QuisqueyaTech",
}: BrandLockupProps) {
  return (
    <a className={["brand-lockup", className].filter(Boolean).join(" ")} href={href} aria-label={ariaLabel}>
      <img src="/brand/logo-mark.png" width={40} height={40} alt="" />
      <span>
        <span className="brand-name">QuisqueyaTech</span>
        {showDescriptor ? (
          <small className="brand-descriptor">Automatización, IA y software para empresas</small>
        ) : null}
      </span>
    </a>
  );
}
