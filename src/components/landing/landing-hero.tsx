"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { useSignInPrompt } from "@/components/auth/sign-in-prompt";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLanguage } from "@/components/i18n/language-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { BloodKitHeading } from "@/components/landing/bloodkit-heading";
import { HeroHelpStory } from "@/components/landing/hero-help-story";
import { HeroLifeBackdrop } from "@/components/landing/hero-life-backdrop";
import { NgoDirectoryModal } from "@/components/ngo/ngo-directory-modal";
import {
  fetchNgoProfile,
  fetchRegisteredNgos,
  subscribeNgoProfile,
} from "@/lib/ngo-profile";
import type { NgoProfile } from "@/types";
import { cn } from "@/lib/utils";

function HeartBloodIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 72 72"
      className={className}
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="heartBloodFill" x1="36" y1="8" x2="36" y2="64">
          <stop offset="0%" stopColor="#ff6b81" />
          <stop offset="55%" stopColor="#c4122f" />
          <stop offset="100%" stopColor="#7a0b1c" />
        </linearGradient>
        <clipPath id="heartClip">
          <path d="M36 61C36 61 10 44 10 27.5C10 18.5 16.5 12 24.5 12C29.5 12 33.5 14.5 36 18.5C38.5 14.5 42.5 12 47.5 12C55.5 12 62 18.5 62 27.5C62 44 36 61 36 61Z" />
        </clipPath>
      </defs>
      <path
        d="M36 61C36 61 10 44 10 27.5C10 18.5 16.5 12 24.5 12C29.5 12 33.5 14.5 36 18.5C38.5 14.5 42.5 12 47.5 12C55.5 12 62 18.5 62 27.5C62 44 36 61 36 61Z"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="2.2"
        fill="rgba(255,255,255,0.06)"
      />
      <g clipPath="url(#heartClip)">
        <rect
          x="8"
          y="36"
          width="56"
          height="28"
          fill="url(#heartBloodFill)"
          className="hero-heart-fill"
        />
        <path
          d="M8 38C16 34 24 40 36 36C48 32 56 38 64 35V64H8V38Z"
          fill="rgba(255,255,255,0.18)"
          className="hero-heart-wave"
        />
      </g>
      <ellipse cx="26" cy="24" rx="5" ry="7" fill="white" opacity="0.22" />
    </svg>
  );
}

function HandshakeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 72 72"
      className={className}
      fill="none"
      aria-hidden
    >
      <path
        d="M8 34L20 28L28 40L16 46Z"
        fill="#0d9488"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.2"
      />
      <path
        d="M64 34L52 28L44 40L56 46Z"
        fill="#115e59"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.2"
      />
      <path
        d="M20 30C24 24 32 22 38 26C42 22 50 24 54 30C56 34 54 40 48 44C44 47 40 48 36 48C32 48 28 47 24 44C18 40 16 34 20 30Z"
        fill="url(#handGrad)"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1.4"
      />
      <defs>
        <linearGradient id="handGrad" x1="20" y1="24" x2="54" y2="48">
          <stop stopColor="#5eead4" />
          <stop offset="0.5" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <path
        d="M28 36C30 34 34 34 36 36M34 40C36 38 40 38 42 40M40 33C42 31 46 32 48 34"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="36" cy="18" r="2.2" fill="#fde68a" opacity="0.9" />
      <path
        d="M36 12V15M36 21V24M30 18H33M39 18H42"
        stroke="#fde68a"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

function NgoShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 72 72"
      className={className}
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="shieldGrad" x1="36" y1="8" x2="36" y2="64">
          <stop stopColor="#60a5fa" />
          <stop offset="0.55" stopColor="#2563eb" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
      <path
        d="M36 10L58 20V34C58 48 48 58 36 62C24 58 14 48 14 34V20L36 10Z"
        fill="url(#shieldGrad)"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="1.8"
      />
      <path
        d="M33 26H39V33H46V39H39V46H33V39H26V33H33V26Z"
        fill="white"
        opacity="0.95"
      />
      <circle cx="22" cy="52" r="3" fill="#93c5fd" opacity="0.9" />
      <circle cx="36" cy="56" r="3.2" fill="white" opacity="0.95" />
      <circle cx="50" cy="52" r="3" fill="#93c5fd" opacity="0.9" />
      <path
        d="M22 52H50"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

const ACTIONS = [
  {
    role: "patient",
    title: "Request Help",
    subtitle: "Need blood now",
    href: "/request-help",
    message: "Sign in with Google before requesting blood help.",
    Icon: HeartBloodIcon,
    className:
      "from-[#6b1a28]/95 via-[#4a121c]/90 to-[#321018]/90 ring-[#ff2d4a]/40 hover:ring-[#ff2d4a]/65 shadow-[0_18px_40px_-18px_rgba(255,45,74,0.65)]",
    glow: "bg-[#ff2d4a]/20",
  },
  {
    role: "donor",
    title: "Become a Donor",
    subtitle: "Stand by with respect",
    href: "/become-donor",
    message: "Sign in with Google before registering as a donor.",
    Icon: HandshakeIcon,
    className:
      "from-[#145a50]/95 via-[#0f423b]/90 to-[#0b302c]/90 ring-teal/45 hover:ring-teal/70 shadow-[0_18px_40px_-18px_rgba(15,159,122,0.6)]",
    glow: "bg-teal/20",
  },
  {
    role: "ngo",
    title: "NGO / Hospital",
    subtitle: "Partner & protect",
    href: "/become-ngo",
    message: "Sign in with Google for NGO / hospital access.",
    Icon: NgoShieldIcon,
    className:
      "from-[#1e3a6e]/95 via-[#172d55]/90 to-[#122240]/90 ring-sky-400/40 hover:ring-sky-400/65 shadow-[0_18px_40px_-18px_rgba(47,111,237,0.6)]",
    glow: "bg-sky-400/20",
  },
] as const;

export function LandingHero() {
  const router = useRouter();
  const { requireAuth } = useSignInPrompt();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [ngoName, setNgoName] = useState<string | null>(null);
  const [ngoDirectoryOpen, setNgoDirectoryOpen] = useState(false);
  const [registeredNgos, setRegisteredNgos] = useState<NgoProfile[]>([]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const profile = await fetchNgoProfile(user?.id);
      if (!active) return;
      setNgoName(profile?.name ?? null);
    };
    void refresh();
    const unsub = subscribeNgoProfile(() => {
      void refresh();
    });
    return () => {
      active = false;
      unsub();
    };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    void fetchRegisteredNgos().then((list) => {
      if (active) setRegisteredNgos(list);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      className="relative isolate flex h-[100svh] max-h-[100svh] overflow-hidden bg-[#1c0d14]"
      aria-labelledby="hero-brand"
    >
      <HeroLifeBackdrop />

      <div className="relative mx-auto grid h-full w-full max-w-6xl grid-cols-1 items-center gap-8 px-5 py-24 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-20">
        <div className="max-w-xl">
          <BloodKitHeading id="hero-brand" />

          <div className="animate-hero-reveal-delay-1 mt-5 flex flex-col gap-3 sm:mt-6">
            <h1 className="font-display text-[clamp(1.05rem,2.4vw,1.45rem)] font-semibold uppercase tracking-[0.22em] text-white/90">
              {t("hero.tagline")}
            </h1>

            <div
              className="h-px w-16 bg-gradient-to-r from-[#ff2d4a] to-transparent sm:w-24"
              aria-hidden
            />

            <svg
              viewBox="0 0 360 28"
              className="h-6 w-56 text-[#ff2d4a] sm:w-72"
              fill="none"
              aria-hidden
            >
              <path
                d="M0 14H70L88 14L104 3L122 25L138 8L154 14H360"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-pulse-line opacity-90"
              />
            </svg>
          </div>

          <div className="animate-hero-reveal-delay-2 mt-8 grid w-full max-w-md grid-cols-1 gap-3.5 sm:mt-10 sm:max-w-none sm:grid-cols-3 lg:max-w-md lg:grid-cols-1">
            {ACTIONS.filter((action) => !(action.role === "ngo" && ngoName)).map((action) => (
              <button
                key={action.role}
                type="button"
                onClick={() => {
                  if (action.role === "ngo") {
                    void fetchRegisteredNgos().then(setRegisteredNgos);
                    setNgoDirectoryOpen(true);
                    return;
                  }
                  if (requireAuth(action.href, t(
                    action.role === "patient"
                      ? "auth.requestMessage"
                      : "auth.donorMessage",
                  ))) {
                    router.push(action.href);
                  }
                }}
                className={cn(
                  "group relative flex items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br p-4 ring-1 backdrop-blur-sm transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c0d14]",
                  "hover:-translate-y-1 hover:scale-[1.02] text-left",
                  action.className,
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none absolute -right-6 -top-6 size-24 rounded-full blur-2xl transition group-hover:scale-125",
                    action.glow,
                  )}
                  aria-hidden
                />
                <span
                  className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent"
                  aria-hidden
                />

                <span className="relative flex size-[4.25rem] shrink-0 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/15 transition group-hover:bg-white/10 sm:size-[4.5rem]">
                  <action.Icon className="size-14 sm:size-[3.75rem]" />
                </span>

                <span className="relative min-w-0 flex-1">
                  <span className="block truncate font-display text-lg font-extrabold tracking-tight text-white sm:text-xl">
                    {action.role === "patient"
                      ? t("hero.requestTitle")
                      : action.role === "donor"
                        ? t("hero.donorTitle")
                        : t("hero.ngoTitle")}
                  </span>
                  <span className="mt-0.5 block text-sm text-white/65">
                    {action.role === "patient"
                      ? t("hero.requestSub")
                      : action.role === "donor"
                        ? t("hero.donorSub")
                        : t("hero.ngoSub")}
                  </span>
                </span>

                <ArrowUpRight
                  className="relative size-5 shrink-0 text-white/70 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white"
                  aria-hidden
                />
              </button>
            ))}
          </div>
        </div>

        <div className="absolute right-5 top-[4.75rem] z-20 sm:right-8 lg:hidden">
          <LanguageSwitcher variant="hero" />
        </div>

        <div className="animate-hero-reveal-delay-2 hidden w-full max-w-md justify-self-end lg:block">
          <div className="flex justify-end">
            <LanguageSwitcher variant="hero" />
          </div>
          <HeroHelpStory className="mt-6" />
        </div>
      </div>

      {ngoDirectoryOpen ? (
        <NgoDirectoryModal
          ngos={registeredNgos}
          onClose={() => setNgoDirectoryOpen(false)}
        />
      ) : null}
    </section>
  );
}
