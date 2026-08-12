"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  tone?: "light" | "brand";
}

/** Cinematic droplet + pulse mark */
export function BrandMark({ className, tone = "brand" }: BrandMarkProps) {
  const uid = useId().replace(/:/g, "");
  const isLight = tone === "light";

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-10", className)}
      aria-hidden
    >
      <defs>
        <linearGradient
          id={`drop-${uid}`}
          x1="12"
          y1="4"
          x2="36"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          {isLight ? (
            <>
              <stop stopColor="#ffffff" />
              <stop offset="1" stopColor="#f3d0d7" />
            </>
          ) : (
            <>
              <stop stopColor="#ff4d6d" />
              <stop offset="0.48" stopColor="#c4122f" />
              <stop offset="1" stopColor="#6f0819" />
            </>
          )}
        </linearGradient>
        <filter id={`glow-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.15" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d="M24 3.5C24 3.5 9.5 18.8 9.5 29.2C9.5 37.1 15.8 43.5 24 43.5C32.2 43.5 38.5 37.1 38.5 29.2C38.5 18.8 24 3.5 24 3.5Z"
        fill={`url(#drop-${uid})`}
        filter={`url(#glow-${uid})`}
      />

      <path
        d="M17.5 18C19.2 13.8 22.2 10.2 24 8.2C22.1 12.4 20.8 17.1 20.5 22.2C19.2 21.2 18.1 19.7 17.5 18Z"
        fill="white"
        opacity={isLight ? 0.35 : 0.28}
      />

      <path
        d="M14.5 28H19.2L21.4 21.5L24.8 35.5L28.2 28H33.5"
        stroke={isLight ? "#C4122F" : "#ffffff"}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#glow-${uid})`}
      />
    </svg>
  );
}

interface BrandLogoProps {
  className?: string;
  markClassName?: string;
  tone?: "light" | "brand";
  size?: "sm" | "md" | "lg";
}

/** Full wordmark: mark + BloodKit. */
export function BrandLogo({
  className,
  markClassName,
  tone = "brand",
  size = "md",
}: BrandLogoProps) {
  const isLight = tone === "light";

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark
        tone={tone}
        className={cn(
          size === "sm" && "size-7",
          size === "md" && "size-9 sm:size-10",
          size === "lg" && "size-11 sm:size-12",
          "transition duration-300 group-hover:scale-105 group-hover:-rotate-3",
          markClassName,
        )}
      />
      <span
        className={cn(
          "font-display font-extrabold tracking-[-0.045em] leading-none",
          size === "sm" && "text-xl",
          size === "md" && "text-[1.45rem] sm:text-[1.7rem]",
          size === "lg" && "text-3xl sm:text-4xl",
          isLight ? "text-white" : "text-ink",
        )}
      >
        BloodKit
        <span className="text-crimson" aria-hidden>
          .
        </span>
      </span>
    </span>
  );
}
