import Image from "next/image";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

type MarkSize = "sm" | "md" | "lg";

const markPx: Record<MarkSize, number> = {
  sm: 32,
  md: 40,
  lg: 48,
};

export function LogoMark({
  size = "md",
  className,
  priority,
}: {
  size?: MarkSize;
  className?: string;
  priority?: boolean;
}) {
  const px = markPx[size];
  return (
    <Image
      src="/brand/logo-mark.png"
      alt=""
      width={px}
      height={px}
      priority={priority}
      className={cn("shrink-0 rounded-full object-cover", className)}
      style={{ width: px, height: px }}
    />
  );
}

export function BrandLockup({
  light,
  size = "md",
  priority,
  showDescriptor = true,
  descriptor = brand.descriptor,
}: {
  light?: boolean;
  size?: "sm" | "md" | "lg";
  priority?: boolean;
  showDescriptor?: boolean;
  descriptor?: string;
}) {
  const textSize = size === "sm" ? "text-base" : size === "lg" ? "text-lg" : "text-[17px]";

  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} priority={priority} />
      <span className={cn("font-display font-extrabold tracking-[-0.02em]", textSize)}>
        <span className={light ? "text-white" : "text-text"}>Quisqueya</span>
        <span className="text-amber-deep">Tech</span>
        {showDescriptor && (
          <small
            className={cn(
              "mt-[-2px] block font-mono text-[9.5px] font-normal uppercase tracking-[0.18em]",
              light ? "text-white/60" : "text-mute",
            )}
          >
            {descriptor}
          </small>
        )}
      </span>
    </span>
  );
}
