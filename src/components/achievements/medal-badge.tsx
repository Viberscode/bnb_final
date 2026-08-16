"use client";

import { useId } from "react";

import {
  AlertTriangle,
  Award,
  Crown,
  Droplets,
  HeartHandshake,
  HeartPulse,
  Lock,
  Shield,
  Trophy,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MedalIcon, MedalMetal } from "@/lib/achievements";

const METAL: Record<
  MedalMetal,
  { from: string; mid: string; to: string; glow: string }
> = {
  bronze: { from: "#f0b27a", mid: "#cd7f32", to: "#7a3e12", glow: "rgba(205,127,50,0.55)" },
  silver: { from: "#f4f7fb", mid: "#c5ced8", to: "#6b7684", glow: "rgba(180,190,205,0.7)" },
  gold: { from: "#ffe9a3", mid: "#e2b340", to: "#9a6b12", glow: "rgba(226,179,64,0.6)" },
  champion: { from: "#fff3c4", mid: "#d4af37", to: "#8a1024", glow: "rgba(196,18,47,0.45)" },
  legend: { from: "#f5d0fe", mid: "#c084fc", to: "#6d28d9", glow: "rgba(147,51,234,0.5)" },
  ruby: { from: "#ff8aa0", mid: "#e11d48", to: "#7f1d1d", glow: "rgba(225,29,72,0.55)" },
  steel: { from: "#e2e8f0", mid: "#94a3b8", to: "#334155", glow: "rgba(148,163,184,0.55)" },
  heart: { from: "#fecdd3", mid: "#fb7185", to: "#be123c", glow: "rgba(251,113,133,0.55)" },
  teal: { from: "#99f6e4", mid: "#14b8a6", to: "#0f766e", glow: "rgba(20,184,166,0.5)" },
};

const ICONS: Record<MedalIcon, typeof Droplets> = {
  droplet: Droplets,
  shield: Shield,
  award: Award,
  trophy: Trophy,
  crown: Crown,
  siren: AlertTriangle,
  zap: Zap,
  heart: HeartPulse,
  handshake: HeartHandshake,
};

export function MedalBadge({
  metal,
  icon,
  earned,
  size = "md",
}: {
  metal: MedalMetal;
  icon: MedalIcon;
  earned: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const palette = METAL[metal];
  const Icon = earned ? ICONS[icon] : Lock;
  const dim = size === "lg" ? "size-24" : size === "sm" ? "size-14" : "size-[4.5rem]";
  const iconSize = size === "lg" ? "size-8" : size === "sm" ? "size-5" : "size-6";
  const gradId = useId().replace(/:/g, "");

  return (
    <span
      className={cn("relative inline-flex items-center justify-center", dim)}
      style={
        earned
          ? { filter: `drop-shadow(0 8px 16px ${palette.glow})` }
          : undefined
      }
    >
      {earned ? (
        <span
          className="medal-glow pointer-events-none absolute inset-[-18%] rounded-full"
          style={{ background: `radial-gradient(circle, ${palette.glow} 0%, transparent 70%)` }}
          aria-hidden
        />
      ) : null}
      <span
        className="absolute top-0 left-1/2 h-3 w-7 -translate-x-1/2 -translate-y-0.5"
        aria-hidden
      >
        <span className="absolute left-0 top-0 h-3 w-2.5 -rotate-[28deg] rounded-sm bg-[#c4122f]" />
        <span className="absolute right-0 top-0 h-3 w-2.5 rotate-[28deg] rounded-sm bg-[#9f1239]" />
      </span>
      <svg viewBox="0 0 80 80" className={cn("relative", dim)} aria-hidden>
        <defs>
          <radialGradient id={gradId} cx="32%" cy="28%" r="78%">
            <stop offset="0%" stopColor={earned ? palette.from : "#e2e8f0"} />
            <stop offset="48%" stopColor={earned ? palette.mid : "#94a3b8"} />
            <stop offset="100%" stopColor={earned ? palette.to : "#475569"} />
          </radialGradient>
        </defs>
        <circle cx="40" cy="42" r="28" fill="rgba(15,23,42,0.18)" />
        <circle
          cx="40"
          cy="40"
          r="27"
          fill={`url(#${gradId})`}
          stroke={earned ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.2)"}
          strokeWidth="2.4"
        />
        <circle
          cx="40"
          cy="40"
          r="20"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1.4"
        />
        <ellipse cx="30" cy="28" rx="10" ry="6" fill="white" opacity="0.28" />
      </svg>
      <Icon
        className={cn(
          "absolute top-[42%] -translate-y-1/2 text-white drop-shadow",
          iconSize,
          !earned && "opacity-80",
        )}
        strokeWidth={2.2}
        aria-hidden
      />
    </span>
  );
}
