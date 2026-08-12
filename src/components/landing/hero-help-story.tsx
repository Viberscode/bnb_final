"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/i18n/language-provider";

const DROP_GAIN = 20;
/** Drops fire once during the visual story — then BloodNearby. No extra fill loop. */
const DROP_TIMES_MS = [2800, 3600, 4400, 5200];
const STORY_MS = 6200;
const BRAND_MS = 2600;

interface EnergyPop {
  id: number;
  x: number;
}

type Phase = "story" | "brand";

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Story + life bar together → finale BLOODKIT. (no bar repetition) */
export function HeroHelpStory({ className }: { className?: string }) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<Phase>("story");
  const [cycle, setCycle] = useState(0);
  const [life, setLife] = useState(18);
  const [dropKey, setDropKey] = useState(0);
  const [pops, setPops] = useState<EnergyPop[]>([]);

  useEffect(() => {
    let alive = true;
    const timers: number[] = [];

    async function runCycle() {
      while (alive) {
        setPhase("story");
        setLife(18);
        setPops([]);
        setCycle((c) => c + 1);

        for (const t of DROP_TIMES_MS) {
          timers.push(
            window.setTimeout(() => {
              if (!alive) return;
              setDropKey((k) => k + 1);
              setLife((prev) => Math.min(100, prev + DROP_GAIN));
              const popId = Date.now() + t;
              const x = 16 + Math.random() * 28;
              setPops((list) => [...list.slice(-3), { id: popId, x }]);
              timers.push(
                window.setTimeout(() => {
                  if (alive) {
                    setPops((list) => list.filter((p) => p.id !== popId));
                  }
                }, 800),
              );
            }, t),
          );
        }

        await wait(STORY_MS);
        if (!alive) break;

        setPhase("brand");
        await wait(BRAND_MS);
      }
    }

    void runCycle();
    return () => {
      alive = false;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return (
    <div
      className={cn(
        "relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.55)] backdrop-blur-md",
        className,
      )}
      aria-hidden
    >
      <div
        className={cn(
          "p-5 transition-all duration-500 sm:p-6",
          phase === "brand" && "pointer-events-none scale-95 opacity-0",
        )}
      >
        <div className="mb-3 flex items-center justify-between text-[0.7rem] font-bold uppercase tracking-[0.16em] text-white/55">
          <span>{t("hero.howItWorks")}</span>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[0.65rem] normal-case tracking-normal text-white/80">
            {t("hero.flow")}
          </span>
        </div>

        <svg
          key={cycle}
          viewBox="0 0 360 200"
          className="story-scene h-auto w-full"
          role="img"
          aria-label="Patient gets help from a donor"
        >
          <defs>
            <linearGradient id="storyDrop" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff6b7f" />
              <stop offset="100%" stopColor="#c4122f" />
            </linearGradient>
            <linearGradient id="storyGround" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
            </linearGradient>
          </defs>

          <ellipse cx="180" cy="178" rx="140" ry="14" fill="url(#storyGround)" />

          <path
            className="story-beam"
            d="M118 110C150 92 210 92 242 110"
            stroke="#ff6b7f"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            strokeDasharray="8 8"
          />

          <g className="story-patient">
            <rect x="68" y="100" width="44" height="52" rx="16" fill="#f8b4be" />
            <circle cx="90" cy="80" r="22" fill="#ffd5c8" />
            <g className="story-face-worried">
              <path d="M80 74 Q84 70 88 74" stroke="#5a4038" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M92 74 Q96 70 100 74" stroke="#5a4038" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M84 90 Q90 86 96 90" stroke="#5a4038" strokeWidth="2" fill="none" strokeLinecap="round" />
            </g>
            <g className="story-face-happy">
              <circle cx="83" cy="78" r="2.2" fill="#5a4038" />
              <circle cx="97" cy="78" r="2.2" fill="#5a4038" />
              <path d="M84 88 Q90 94 96 88" stroke="#5a4038" strokeWidth="2" fill="none" strokeLinecap="round" />
            </g>
            <g transform="translate(78 120)">
              <path
                d="M12 4C12 4 2 12 2 18C2 22.4 5.6 26 12 26C18.4 26 22 22.4 22 18C22 12 12 4 12 4Z"
                fill="none"
                stroke="#c4122f"
                strokeWidth="2"
              />
              <path
                className="story-heart-fill"
                d="M12 4C12 4 2 12 2 18C2 22.4 5.6 26 12 26C18.4 26 22 22.4 22 18C22 12 12 4 12 4Z"
                fill="#c4122f"
              />
            </g>
          </g>

          <g className="story-sos">
            <rect x="118" y="40" width="52" height="28" rx="12" fill="#dc1432" />
            <text
              x="144"
              y="59"
              textAnchor="middle"
              fill="white"
              fontSize="12"
              fontWeight="700"
              fontFamily="system-ui,sans-serif"
            >
              SOS
            </text>
          </g>

          <g className="story-fly-drop">
            <path
              d="M0 0C0 0 -8 10 -8 15C-8 19.4 -4.4 23 0 23C4.4 23 8 19.4 8 15C8 10 0 0 0 0Z"
              fill="url(#storyDrop)"
            />
          </g>

          <g className="story-donor">
            <rect x="248" y="100" width="44" height="52" rx="16" fill="#7dd3c0" />
            <circle cx="270" cy="80" r="22" fill="#ffd5c8" />
            <circle cx="263" cy="78" r="2.2" fill="#5a4038" />
            <circle cx="277" cy="78" r="2.2" fill="#5a4038" />
            <path d="M264 88 Q270 94 276 88" stroke="#5a4038" strokeWidth="2" fill="none" strokeLinecap="round" />
            <g className="story-held-drop" transform="translate(236 112)">
              <path
                d="M12 2C12 2 4 12 4 17C4 21.4 7.6 25 12 25C16.4 25 20 21.4 20 17C20 12 12 2 12 2Z"
                fill="url(#storyDrop)"
              />
            </g>
          </g>

          <g className="story-sparkles" fill="#ffe08a">
            <circle cx="180" cy="64" r="3" />
            <circle cx="160" cy="50" r="2" />
            <circle cx="200" cy="52" r="2.5" />
          </g>
        </svg>

        <div className="mt-3 border-t border-white/10 pt-4">
          <div className="mb-2 flex items-center justify-between text-[0.65rem] font-bold uppercase tracking-[0.14em] text-white/55">
            <span>{t("hero.life")}</span>
            <span className="tabular-nums text-[#7dffa8]">{life}%</span>
          </div>

          <div className="relative mb-2 h-9">
            {dropKey > 0 && (
              <span key={dropKey} className="life-feed-drop absolute left-[14%] top-0" />
            )}
            {pops.map((pop) => (
              <span
                key={pop.id}
                className="life-energy-pop absolute bottom-0 flex size-7 items-center justify-center rounded-full border-2 border-[#7dffa8] bg-[#7dffa8]/15 text-sm shadow-[0_0_14px_rgba(125,255,168,0.55)]"
                style={{ left: `${pop.x}%` }}
              >
                ⚡
              </span>
            ))}
          </div>

          <div className="relative h-4 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15">
            <span className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#ff4d6d]/35 to-transparent" />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#9f1239] via-[#e11d48] to-[#7dffa8] transition-[width] duration-500 ease-out"
              style={{ width: `${life}%` }}
            />
          </div>
        </div>
      </div>

      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-[#12060c]/55 backdrop-blur-[2px] transition-opacity duration-500",
          phase === "brand" ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <p
          className={cn(
            "font-display text-5xl font-extrabold tracking-[-0.05em] text-white sm:text-6xl",
            phase === "brand" && "story-brand-finale",
          )}
        >
          BloodNearby
          <span className="text-[#ff2d4a]">.</span>
        </p>
      </div>
    </div>
  );
}
