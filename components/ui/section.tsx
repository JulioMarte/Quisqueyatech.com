import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/motion";

export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1240px] px-6", className)}>
      {children}
    </div>
  );
}

export function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("relative py-[90px]", className)}>
      {children}
    </section>
  );
}

export function Eyebrow({
  children,
  className,
  tone = "amber",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "amber" | "larimar" | "dark";
}) {
  const tones = {
    amber: "text-amber-deep before:bg-amber-deep",
    larimar: "text-larimar-deep before:bg-larimar-deep",
    dark: "text-white/70 before:bg-larimar",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-mono text-[11.5px] font-medium uppercase tracking-[0.18em]",
        "before:h-px before:w-2 before:content-['']",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHead({
  eyebrow,
  title,
  lede,
  center,
  dark,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  center?: boolean;
  dark?: boolean;
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        "mb-12 flex max-w-[820px] flex-col gap-3",
        center && "mx-auto items-center text-center",
        className,
      )}
    >
      {eyebrow ? (
        <Eyebrow tone={dark ? "dark" : "amber"}>{eyebrow}</Eyebrow>
      ) : null}
      <h2
        className={cn(
          "font-display text-[clamp(28px,3.2vw,42px)] font-bold leading-[1.08] tracking-[-0.02em]",
          dark ? "text-white" : "text-text",
        )}
      >
        {title}
      </h2>
      {lede ? (
        <p
          className={cn(
            "max-w-[60ch] text-[clamp(16.5px,1.35vw,19px)] leading-[1.55]",
            dark ? "text-white/75" : "text-text-2",
            center && "text-center",
          )}
        >
          {lede}
        </p>
      ) : null}
    </Reveal>
  );
}
