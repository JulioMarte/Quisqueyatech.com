import type { CSSProperties } from "react";
import { Bot, Braces, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

export function KineticText({
  titleA,
  titleB,
  className,
}: {
  titleA: string;
  titleB: string;
  className?: string;
}) {
  const words = titleB.trim().split(/\s+/);

  return (
    <h1 className={cn("kinetic-heading", className)} aria-label={`${titleA} ${titleB}`}>
      <span className="kinetic-mask block" aria-hidden="true">
        <span className="kinetic-primary block">{titleA}</span>
      </span>
      <span
        className="kinetic-secondary mt-1 flex flex-wrap justify-center gap-x-[.24em]"
        aria-hidden="true"
      >
        {words.map((word, index) => (
          <span className="kinetic-mask inline-block" key={`${word}-${index}`}>
            <span
              className="kinetic-word inline-block bg-gradient-to-r from-amber-deep to-larimar-deep bg-clip-text text-transparent"
              style={
                {
                  "--word-index": index,
                  "--word-direction": index % 2 === 0 ? -1 : 1,
                } as CSSProperties
              }
            >
              {word}
            </span>
          </span>
        ))}
      </span>
    </h1>
  );
}

export function DawnSweep() {
  return (
    <div className="dawn-stage" aria-hidden="true">
      <div className="dawn-halo dawn-halo-amber" />
      <div className="dawn-halo dawn-halo-larimar" />
      <div className="dawn-beam" />
      <div className="dawn-grain" />
    </div>
  );
}

export function SystemFlow({
  labels,
  output,
}: {
  labels: readonly [string, string, string];
  output: string;
}) {
  const icons = [Workflow, Bot, Braces];

  return (
    <div className="system-flow" aria-hidden="true">
      <svg className="system-flow-lines" viewBox="0 0 1000 150" preserveAspectRatio="none">
        <path id="system-flow-a" d="M110 28 C160 95 360 84 500 124" />
        <path id="system-flow-b" d="M500 28 C500 68 500 88 500 124" />
        <path id="system-flow-c" d="M890 28 C840 95 640 84 500 124" />
        <circle className="flow-signal flow-signal-amber" r="5">
          <animateMotion
            dur="5.8s"
            begin="1.25s"
            repeatCount="indefinite"
            path="M110 28 C160 95 360 84 500 124"
          />
        </circle>
        <circle className="flow-signal flow-signal-blue" r="5">
          <animateMotion
            dur="5.8s"
            begin="2.7s"
            repeatCount="indefinite"
            path="M500 28 C500 68 500 88 500 124"
          />
        </circle>
        <circle className="flow-signal flow-signal-amber" r="5">
          <animateMotion
            dur="5.8s"
            begin="4.1s"
            repeatCount="indefinite"
            path="M890 28 C840 95 640 84 500 124"
          />
        </circle>
      </svg>
      <div className="system-flow-sources">
        {labels.map((label, index) => {
          const Icon = icons[index];
          return (
            <span className="system-node system-node-source" key={label}>
              <Icon aria-hidden="true" />
              {label}
            </span>
          );
        })}
      </div>
      <span className="system-node system-node-output">{output}</span>
    </div>
  );
}
