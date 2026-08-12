"use client";

import Link from "next/link";
import { ArrowUpRight, Radio } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";

export function RequestHelpHero() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full border border-crimson/20 bg-white/80 px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-crimson shadow-[0_8px_18px_-14px_rgba(196,18,47,0.55)]">
          <span className="flex h-3.5 items-end gap-px" aria-hidden>
            {[7, 11, 8, 14, 9].map((h, i) => (
              <span
                key={i}
                className="animate-heartbeat w-1 rounded-full bg-gradient-to-t from-crimson to-rose-400"
                style={{ height: h, animationDelay: `${i * 0.08}s` }}
              />
            ))}
          </span>
          {t("request.kicker")}
        </p>
        <h1 className="mt-2.5 font-display text-[2.15rem] font-black leading-[0.95] tracking-[-0.055em] text-ink sm:text-[3.15rem]">
          {t("request.titleLead")}{" "}
          <span className="request-heading-live bg-gradient-to-r from-[#9f1239] via-[#ff2d4a] to-[#c4122f] bg-clip-text text-transparent">
            {t("request.titleAccent")}
          </span>
        </h1>
      </div>

      <Link
        href="/requests"
        className="shiny-card group inline-flex w-fit shrink-0 items-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-br from-white to-rose-50 px-3.5 py-2.5 ring-1 ring-rose-200/80 shadow-[0_12px_28px_-18px_rgba(196,18,47,0.4)] transition hover:-translate-y-0.5"
      >
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22] text-white">
          <Radio className="size-3.5 animate-pulse" aria-hidden />
        </span>
        <span className="text-left">
          <span className="block text-[0.6rem] font-bold uppercase tracking-[0.16em] text-crimson">
            {t("request.liveFeed")}
          </span>
          <span className="font-display text-sm font-extrabold tracking-tight text-ink">
            {t("request.viewLive")}
          </span>
        </span>
        <ArrowUpRight
          className="size-4 text-crimson transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          aria-hidden
        />
      </Link>
    </div>
  );
}
