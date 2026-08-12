"use client";

import Link from "next/link";
import { ArrowUpRight, UserRound } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";

export function BecomeDonorHero() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full border border-teal/25 bg-white/80 px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-teal shadow-[0_8px_18px_-14px_rgba(13,115,112,0.45)]">
          <span className="flex h-3.5 items-end gap-px" aria-hidden>
            {[7, 11, 8, 14, 9].map((h, i) => (
              <span
                key={i}
                className="animate-heartbeat w-1 rounded-full bg-gradient-to-t from-teal to-emerald-400"
                style={{ height: h, animationDelay: `${i * 0.08}s` }}
              />
            ))}
          </span>
          {t("donor.badge")}
        </p>
        <h1 className="mt-2 font-display text-[2.15rem] font-black leading-[0.95] tracking-[-0.055em] text-ink sm:text-[3.15rem]">
          {t("donor.title")}{" "}
          <span className="request-heading-live bg-gradient-to-r from-[#0a6b54] via-[#0f9f7a] to-[#14b8a6] bg-clip-text text-transparent">
            {t("donor.titleAccent")}
          </span>
        </h1>
      </div>

      <Link
        href="/profile"
        className="shiny-card group inline-flex w-fit shrink-0 items-center gap-3 overflow-hidden rounded-lg bg-gradient-to-br from-white to-teal-soft px-4 py-3 shadow-[0_12px_28px_-18px_rgba(13,115,112,0.4)] ring-1 ring-teal/25 transition hover:-translate-y-0.5"
      >
        <span className="inline-flex size-9 items-center justify-center rounded-md bg-gradient-to-br from-teal to-teal-deep text-white">
          <UserRound className="size-4" aria-hidden />
        </span>
        <span className="text-left">
          <span className="block text-[0.6rem] font-bold uppercase tracking-[0.16em] text-teal-deep">
            {t("donor.dashboard")}
          </span>
          <span className="font-display text-[0.95rem] font-black tracking-tight text-ink">
            {t("donor.myProfile")}
          </span>
        </span>
        <ArrowUpRight
          className="size-4 text-teal transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          aria-hidden
        />
      </Link>
    </div>
  );
}
