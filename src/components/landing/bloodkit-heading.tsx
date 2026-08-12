"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Dramatic first-paint entrance for the BloodNearby wordmark */
export function BloodKitHeading({
  className,
  id,
}: {
  className?: string;
  id?: string;
}) {
  const [ready, setReady] = useState(false);
  const letters = ["B", "l", "o", "o", "d", "N", "e", "a", "r", "b", "y"];

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <p
      id={id}
      className={cn(
        "font-display font-extrabold leading-[0.88] tracking-[-0.05em] text-white",
        "text-[clamp(2.75rem,9vw,5.5rem)]",
        className,
      )}
      aria-label="BloodNearby"
    >
      {letters.map((letter, i) => (
        <span
          key={`${letter}-${i}`}
          className={cn(
            "inline-block origin-bottom transition-all duration-700",
            ready
              ? "translate-y-0 scale-100 opacity-100 blur-0"
              : "translate-y-8 scale-90 opacity-0 blur-sm",
          )}
          style={{
            transitionDelay: ready ? `${80 + i * 45}ms` : "0ms",
            transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {letter}
        </span>
      ))}
      <span
        className={cn(
          "inline-block text-[#ff2d4a] transition-all duration-700",
          ready ? "translate-y-0 scale-100 opacity-100" : "translate-y-6 scale-50 opacity-0",
        )}
        style={{
          transitionDelay: ready ? "620ms" : "0ms",
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        aria-hidden
      >
        .
      </span>
    </p>
  );
}
