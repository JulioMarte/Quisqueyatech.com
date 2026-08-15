import type { BrandLockupProps } from "../../../types/ui";
import { analyticsAttributes } from "../../../lib/analytics";

export function BrandLockup({
  href,
  showDescriptor = false,
  className = "",
  ariaLabel = "QuisqueyaTech",
  analytics,
}: BrandLockupProps) {
  return (
    <a
      className={["brand-lockup", className].filter(Boolean).join(" ")}
      href={href}
      aria-label={ariaLabel}
      {...analyticsAttributes(analytics)}
    >
      <img src="/brand/logo-mark.png" width={40} height={40} alt="" />
      <span>
        <span className="brand-name">
          <span>Quisqueya</span><span className="brand-name-tech">Tech</span>
        </span>
        {showDescriptor ? (
          <small className="brand-descriptor">Automatización, IA y software para empresas</small>
        ) : null}
      </span>
    </a>
  );
}
