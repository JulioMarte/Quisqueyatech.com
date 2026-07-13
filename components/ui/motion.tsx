"use client";

import * as React from "react";
import {
  domAnimation,
  LazyMotion,
  m,
  MotionConfig,
  type Variants,
} from "framer-motion";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;
const revealVariants: Variants = {
  hidden: { opacity: 0.72, y: 16 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, delay, ease },
  }),
};

const staggerVariants: Variants = {
  hidden: {},
  visible: (delay = 0) => ({
    transition: { delayChildren: delay, staggerChildren: 0.06 },
  }),
};

const itemVariants: Variants = {
  hidden: { opacity: 0.72, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.26, ease },
  },
};

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

export function Reveal({
  children,
  className,
  delay = 0,
  amount = 0.2,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  amount?: number;
}) {
  return (
    <m.div
      data-motion="reveal"
      className={className}
      variants={revealVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      custom={delay}
    >
      {children}
    </m.div>
  );
}

export function StaggerGroup({
  children,
  className,
  delay = 0,
  amount = 0.15,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  amount?: number;
}) {
  return (
    <m.div
      data-motion="stagger"
      className={className}
      variants={staggerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      custom={delay}
    >
      {children}
    </m.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <m.div data-motion="item" className={cn("min-w-0", className)} variants={itemVariants}>
      {children}
    </m.div>
  );
}
