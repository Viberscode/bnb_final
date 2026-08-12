"use client";

import { useEffect, useState } from "react";
import { HOW_IT_WORKS } from "@/data/demo";
import { cn } from "@/lib/utils";

type BoxState = "red" | "emergency" | "to-green" | "green" | "to-red";

const CYCLE = {
  allRed: 0,
  focusFirst: 1600,
  link01: 3200,
  step1Green: 4000,
  link12: 5600,
  step1BackRed: 6200,
  step2Green: 6400,
  loop: 10000,
} as const;

export function HowItWorks() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let frame = 0;

    const loop = (now: number) => {
      setTick((now - start) % CYCLE.loop);
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  /**
   * Connected destination turns green; when 2→3 connects, box 2 goes green→red.
   * Green boxes also use the emergency pulse.
   */
  function boxState(index: number): BoxState {
    if (tick < CYCLE.focusFirst) return "emergency";

    if (index === 0) {
      return tick < CYCLE.link01 ? "emergency" : "red";
    }

    if (index === 1) {
      if (tick < CYCLE.link01) return "red";
      if (tick < CYCLE.step1Green) return "emergency";
      if (tick < CYCLE.step1Green + 850) return "to-green";
      if (tick < CYCLE.link12) return "green";
      if (tick < CYCLE.step1BackRed) return "to-red";
      return "emergency";
    }

    // index 2
    if (tick < CYCLE.link12) return "red";
    if (tick < CYCLE.step2Green) return "emergency";
    if (tick < CYCLE.step2Green + 850) return "to-green";
    return "green";
  }

  const link01Active = tick >= CYCLE.link01;
  const link12Active = tick >= CYCLE.link12;
  const link01Progress = Math.min(1, Math.max(0, (tick - CYCLE.link01) / 700));
  const link12Progress = Math.min(1, Math.max(0, (tick - CYCLE.link12) / 700));

  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 bg-ink px-5 py-16 text-white sm:px-8 sm:py-24"
      aria-labelledby="how-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-crimson">
            How it works
          </p>
          <h2
            id="how-heading"
            className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-5xl"
          >
            Raise. Match. Arrive.
          </h2>
          <p className="mt-4 text-base text-white/65 sm:text-lg">
            Three steps designed for stress — no dashboards to hunt through when
            someone needs blood now.
          </p>
        </div>

        <div className="relative mt-14">
          <ol className="grid gap-10 md:grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)_5.5rem_minmax(0,1fr)] md:items-stretch md:gap-x-6 lg:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)_7rem_minmax(0,1fr)] lg:gap-x-8">
            {HOW_IT_WORKS.map((item, index) => {
              const state = boxState(index);
              const showLinkAfter = index < HOW_IT_WORKS.length - 1;

              return (
                <div key={item.step} className="contents">
                  <li
                    className={cn(
                      "relative z-10 overflow-hidden rounded-2xl border-2 p-5 transition-all duration-700 sm:p-6",
                      state === "emergency" &&
                        "how-emergency-box border-[#ff2d4a] bg-[#ff2d4a]/10",
                      state === "red" && "border-[#ff2d4a]/70 bg-[#ff2d4a]/08",
                      state === "to-green" && "how-to-green border-[#22c55e]",
                      state === "to-red" && "how-to-red border-[#ff2d4a]",
                      state === "green" &&
                        "how-emergency-box-green border-[#22c55e] bg-[#22c55e]/10",
                    )}
                  >
                    <span
                      className={cn(
                        "font-display text-5xl font-extrabold tracking-tight sm:text-6xl",
                        state === "green" || state === "to-green"
                          ? "text-[#4ade80]"
                          : "text-[#ff2d4a]",
                      )}
                    >
                      {item.step}
                    </span>
                    <h3 className="mt-3 font-display text-2xl font-bold tracking-tight">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-[0.98rem] leading-relaxed text-white/65">
                      {item.description}
                    </p>
                  </li>

                  {showLinkAfter && (
                    <div
                      className="relative z-0 hidden min-w-0 items-center justify-center self-center md:flex"
                      aria-hidden
                    >
                      <svg
                        viewBox="0 0 80 48"
                        className="h-11 w-full max-w-full"
                        preserveAspectRatio="none"
                      >
                        <path
                          d="M0 24H18L26 24L36 8L46 40L56 16L64 24H80"
                          fill="none"
                          stroke={
                            index === 0
                              ? link01Active
                                ? "#ff2d4a"
                                : "rgba(255,45,74,0.18)"
                              : link12Active
                                ? "#22c55e"
                                : "rgba(34,197,94,0.18)"
                          }
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                          strokeDasharray="140"
                          strokeDashoffset={
                            index === 0
                              ? 140 * (1 - link01Progress)
                              : 140 * (1 - link12Progress)
                          }
                          className={cn(
                            index === 0 &&
                              link01Active &&
                              link01Progress >= 1 &&
                              "how-beep-glow",
                            index === 1 &&
                              link12Active &&
                              link12Progress >= 1 &&
                              "how-beep-glow-green",
                          )}
                        />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
