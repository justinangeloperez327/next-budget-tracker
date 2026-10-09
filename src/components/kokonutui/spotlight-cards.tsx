"use client";

/**
 * @author dorianbaffier
 * @description Adapted Spotlight Cards with subtle tilt, readable content, and reduced-motion support.
 * @version 2.0.0
 * @date 2025-02-20
 * @license MIT
 * @website https://kokonutui.com
 * @github https://github.com/kokonut-labs/kokonutui
 */

import type { LucideIcon } from "lucide-react";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "motion/react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

// ─── Constants ──────────────────────────────────────────────────────────────────

const TILT_MAX = 1;
const TILT_SPRING = { stiffness: 300, damping: 28 } as const;
const GLOW_SPRING = { stiffness: 180, damping: 22 } as const;

// ─── Data ────────────────────────────────────────────────────────────────────────

export interface SpotlightItem {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

// ─── Card ────────────────────────────────────────────────────────────────────────

interface CardProps {
  children?: React.ReactNode;
  className?: string;
  item: SpotlightItem;
}

export function SpotlightCard({
  item,
  children,
  className,
}: Partial<Omit<CardProps, "item">> & Pick<CardProps, "item">) {
  const reducedMotion = useReducedMotion();
  const Icon = item.icon;
  const cardRef = useRef<HTMLDivElement>(null);

  const normX = useMotionValue(0.5);
  const normY = useMotionValue(0.5);

  const rawRotateX = useTransform(normY, [0, 1], [TILT_MAX, -TILT_MAX]);
  const rawRotateY = useTransform(normX, [0, 1], [-TILT_MAX, TILT_MAX]);

  const rotateX = useSpring(rawRotateX, TILT_SPRING);
  const rotateY = useSpring(rawRotateY, TILT_SPRING);
  const glowOpacity = useSpring(0, GLOW_SPRING);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el || reducedMotion) {
      return;
    }
    const rect = el.getBoundingClientRect();
    normX.set((e.clientX - rect.left) / rect.width);
    normY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseEnter = () => {
    glowOpacity.set(1);
  };

  const handleMouseLeave = () => {
    normX.set(0.5);
    normY.set(0.5);
    glowOpacity.set(0);
  };

  return (
    <motion.div
      animate={{
        scale: 1,
        opacity: 1,
      }}
      className={cn(
        "group relative flex flex-col gap-4 overflow-hidden rounded-lg border p-5",
        // Light
        "border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.025)]",
        // Dark
        "dark:shadow-none",
        "transition-[border-color] duration-300",
        "hover:border-primary/40",
        className,
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      ref={cardRef}
      style={{
        rotateX: reducedMotion ? 0 : rotateX,
        rotateY: reducedMotion ? 0 : rotateY,
        transformPerspective: 900,
      }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {/* Static accent tint — always visible */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-lg"
        style={{
          background: `radial-gradient(ellipse at 20% 20%, color-mix(in srgb, ${item.color} 7%, transparent), transparent 65%)`,
        }}
      />

      {/* Hover glow layer */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-lg"
        style={{
          opacity: reducedMotion ? 0 : glowOpacity,
          background: `radial-gradient(ellipse at 20% 20%, color-mix(in srgb, ${item.color} 12%, transparent), transparent 65%)`,
        }}
      />

      {/* Icon badge */}
      <div
        className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl"
        style={{
          background: `color-mix(in srgb, ${item.color} 12%, transparent)`,
          boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${item.color} 18%, transparent)`,
        }}
      >
        <Icon size={17} strokeWidth={1.9} style={{ color: item.color }} />
      </div>

      {/* Text */}
      <div className="relative z-10 flex flex-col gap-2">
        <h3 className="text-sm font-medium tracking-tight text-foreground">
          {item.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {item.description}
        </p>
      </div>

      <div className="relative z-10">{children}</div>

      {/* Accent bottom line */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[2px] w-0 rounded-full transition-all duration-500 group-hover:w-full"
        style={{
          background: `linear-gradient(to right, color-mix(in srgb, ${item.color} 50%, transparent), transparent)`,
        }}
      />
    </motion.div>
  );
}

SpotlightCard.displayName = "SpotlightCard";

// ─── Main export ──────────────────────────────────────────────────────────────────

export interface SpotlightCardsProps {
  items?: SpotlightItem[];
  eyebrow?: string;
  heading?: string;
  className?: string;
}

export default function SpotlightCards({
  items = [],
  eyebrow = "Features",
  heading = "Everything you need",
  className,
}: SpotlightCardsProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-lg px-8 pt-9 pb-10",
        "bg-card",
        className,
      )}
    >
      {/* Dot grid — light mode only */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 dark:hidden"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--notebook-line) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      {/* Header */}
      <div className="relative mb-8 flex flex-col gap-1.5">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
          {eyebrow}
        </p>
        <h2 className="text-[22px] font-medium tracking-tight text-foreground">
          {heading}
        </h2>
      </div>

      {/* Card grid */}
      <div className="relative grid grid-cols-1 gap-4 md:grid-cols-3">
        {items.map((item) => (
          <SpotlightCard item={item} key={item.title} />
        ))}
      </div>
    </div>
  );
}
