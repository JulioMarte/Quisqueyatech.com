"use client";

import * as React from "react";
import {
  domAnimation,
  LazyMotion,
  m,
  MotionConfig,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import { cn } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

const revealVariants: Record<"slide" | "scale" | "mask", Variants> = {
  slide: {
    hidden: { opacity: 0, y: 48 },
    visible: (delay = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.52, delay, ease } }),
  },
  scale: {
    hidden: { opacity: 0, y: 28, scale: 0.96 },
    visible: (delay = 0) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, delay, ease },
    }),
  },
  mask: {
    hidden: { opacity: 0, y: 30, clipPath: "inset(0 0 100% 0)" },
    visible: (delay = 0) => ({
      opacity: 1,
      y: 0,
      clipPath: "inset(0 0 0% 0)",
      transition: { duration: 0.56, delay, ease },
    }),
  },
};

const staggerVariants: Variants = {
  hidden: {},
  visible: (delay = 0) => ({ transition: { delayChildren: delay, staggerChildren: 0.11 } }),
};

const itemVariants: Variants = {
  hidden: (index = 0) => ({
    opacity: 0,
    x: index % 2 === 0 ? -18 : 18,
    y: 54,
    scale: 0.94,
    rotate: index % 2 === 0 ? -1.5 : 1.5,
  }),
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    rotate: 0,
    transition: { duration: 0.55, ease },
  },
};

const cardVariants: Variants = {
  hidden: (index = 0) => ({
    opacity: 0,
    x: index === 0 ? -44 : index === 2 ? 44 : 0,
    y: 64,
    scale: 0.94,
    rotate: index === 0 ? -2 : index === 2 ? 2 : 0,
  }),
  visible: (index = 0) => ({
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    rotate: 0,
    transition: { duration: 0.62, delay: index * 0.1, ease },
  }),
};

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

function useProgressiveMotion(ref: React.RefObject<Element | null>, amount: number) {
  const inView = useInView(ref, { once: true, amount });
  const reducedMotion = useReducedMotion();
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => setHydrated(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!hydrated || reducedMotion || typeof IntersectionObserver === "undefined") return "visible";
  return inView ? "visible" : "hidden";
}

export function SectionReveal({
  children,
  className,
  delay = 0,
  amount = 0.18,
  variant = "slide",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  amount?: number;
  variant?: "slide" | "scale" | "mask";
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const state = useProgressiveMotion(ref, amount);

  return (
    <div ref={ref} className="min-w-0">
      <m.div
        data-motion="section"
        className={className}
        variants={revealVariants[variant]}
        initial={false}
        animate={state}
        custom={delay}
      >
        {children}
      </m.div>
    </div>
  );
}

export function Reveal(props: React.ComponentProps<typeof SectionReveal>) {
  return <SectionReveal {...props} />;
}

export function StaggerGroup({
  children,
  className,
  delay = 0,
  amount = 0.14,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  amount?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const state = useProgressiveMotion(ref, amount);

  return (
    <m.div
      ref={ref}
      data-motion="stagger"
      className={className}
      variants={staggerVariants}
      initial={false}
      animate={state}
      custom={delay}
    >
      {children}
    </m.div>
  );
}

export function StaggerItem({
  children,
  className,
  index = 0,
}: {
  children: React.ReactNode;
  className?: string;
  index?: number;
}) {
  return (
    <m.div
      data-motion="item"
      className={cn("min-w-0", className)}
      variants={itemVariants}
      custom={index}
    >
      {children}
    </m.div>
  );
}

export function MotionCard({
  children,
  className,
  index = 0,
}: {
  children: React.ReactNode;
  className?: string;
  index?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const state = useProgressiveMotion(ref, 0.18);
  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const rotateX = useSpring(rawRotateX, { stiffness: 260, damping: 30, mass: 0.8 });
  const rotateY = useSpring(rawRotateY, { stiffness: 260, damping: 30, mass: 0.8 });

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "mouse") return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      rawRotateX.set((0.5 - y) * 3);
      rawRotateY.set((x - 0.5) * 3);
      event.currentTarget.style.setProperty("--spot-x", `${x * 100}%`);
      event.currentTarget.style.setProperty("--spot-y", `${y * 100}%`);
    },
    [rawRotateX, rawRotateY],
  );

  const resetTilt = React.useCallback(() => {
    rawRotateX.set(0);
    rawRotateY.set(0);
  }, [rawRotateX, rawRotateY]);

  return (
    <m.div
      ref={ref}
      data-motion="card"
      className={cn("motion-card-shell relative h-full rounded-xl", className)}
      variants={cardVariants}
      initial={false}
      animate={state}
      custom={index}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
    >
      {children}
      <span className="motion-card-glow" aria-hidden="true" />
    </m.div>
  );
}

type ProcessStepData = readonly [number: string, title: string, body: string];

export function ScrollProgressSteps({ steps }: { steps: readonly ProcessStepData[] }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 38%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 28, restDelta: 0.001 });
  const secondaryProgress = useTransform(progress, [0, 0.14, 1], [0, 0, 1]);
  const fullProgress = useMotionValue(1);
  const primaryPath = reducedMotion ? fullProgress : progress;
  const secondaryPath = reducedMotion ? fullProgress : secondaryProgress;

  return (
    <div ref={ref} className="process-flow relative">
      <svg
        className="process-flow-horizontal"
        viewBox="0 0 1000 120"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          className="process-path-base"
          d="M125 60 C230 12 270 108 375 60 S520 12 625 60 S770 108 875 60"
        />
        <path
          className="process-path-base process-path-base-secondary"
          d="M125 70 C230 22 270 118 375 70 S520 22 625 70 S770 118 875 70"
        />
        <m.path
          className="process-path-active process-path-primary"
          pathLength={1}
          style={{ pathLength: primaryPath }}
          d="M125 60 C230 12 270 108 375 60 S520 12 625 60 S770 108 875 60"
        />
        <m.path
          className="process-path-active process-path-secondary"
          pathLength={1}
          style={{ pathLength: secondaryPath }}
          d="M125 70 C230 22 270 118 375 70 S520 22 625 70 S770 118 875 70"
        />
      </svg>
      <svg
        className="process-flow-vertical"
        viewBox="0 0 48 1000"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path className="process-path-base" d="M24 30 C5 220 43 300 24 485 S5 710 24 970" />
        <path
          className="process-path-base process-path-base-secondary"
          d="M32 30 C13 220 51 300 32 485 S13 710 32 970"
        />
        <m.path
          className="process-path-active process-path-primary"
          pathLength={1}
          style={{ pathLength: primaryPath }}
          d="M24 30 C5 220 43 300 24 485 S5 710 24 970"
        />
        <m.path
          className="process-path-active process-path-secondary"
          pathLength={1}
          style={{ pathLength: secondaryPath }}
          d="M32 30 C13 220 51 300 32 485 S13 710 32 970"
        />
      </svg>
      <div className="process-flow-grid relative grid gap-5 md:grid-cols-4">
        {steps.map(([number, title, body], index) => (
          <ProcessStep key={number} number={number} title={title} body={body} index={index} />
        ))}
      </div>
    </div>
  );
}

function ProcessStep({
  number,
  title,
  body,
  index,
}: {
  number: string;
  title: string;
  body: string;
  index: number;
}) {
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.55 });
  const reducedMotion = useReducedMotion();
  const active = reducedMotion || inView;

  return (
    <m.article
      ref={ref}
      className={cn(
        "process-step relative h-full rounded-xl border border-line bg-white p-6",
        active && "is-active",
      )}
      initial={false}
      animate={active ? { opacity: 1, y: -8, scale: 1 } : { opacity: 0.55, y: 22, scale: 0.97 }}
      transition={{ duration: 0.48, delay: index * 0.04, ease }}
    >
      <span className="process-step-number">{number}</span>
      <h2 className="mt-5 font-display text-xl font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-text-2">{body}</p>
    </m.article>
  );
}
