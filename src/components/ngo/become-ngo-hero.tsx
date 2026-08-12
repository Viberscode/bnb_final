"use client";

import Link from "next/link";
import { ArrowUpRight, Building2 } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";

export function BecomeNgoHero({ orgName }: { orgName?: string }) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-sky-700 shadow-[0_8px_18px_-14px_rgba(37,99,235,0.45)]">
          {t("ngo.badge")}
        </p>
        <h1 className="mt-2 font-display text-[2.15rem] font-black leading-[0.95] tracking-[-0.055em] text-ink sm:text-[3.15rem]">
          {orgName ? (
            <span className="request-heading-live bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#1e3a8a] bg-clip-text text-transparent">
              {orgName}
            </span>
          ) : (
            <>
              {t("ngo.title")}{" "}
              <span className="request-heading-live bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#1e3a8a] bg-clip-text text-transparent">
                {t("ngo.titleAccent")}
              </span>
            </>
          )}
        </h1>
      </div>

      {orgName ? (
        <Link
          href="/profile/ngo"
          className="shiny-card group inline-flex w-fit shrink-0 items-center gap-3 overflow-hidden rounded-lg bg-gradient-to-br from-white to-sky-50 px-4 py-3 shadow-[0_12px_28px_-18px_rgba(37,99,235,0.4)] ring-1 ring-sky-200/80 transition hover:-translate-y-0.5"
        >
          <span className="inline-flex size-9 items-center justify-center rounded-md bg-gradient-to-br from-sky-500 to-blue-800 text-white">
            <Building2 className="size-4" aria-hidden />
          </span>
          <span className="text-left">
            <span className="block text-[0.6rem] font-bold uppercase tracking-[0.16em] text-sky-800">
              {t("ngo.dashboard")}
            </span>
            <span className="font-display text-[0.95rem] font-black tracking-tight text-ink">
              {t("ngo.myOrg")}
            </span>
          </span>
          <ArrowUpRight
            className="size-4 text-sky-700 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden
          />
        </Link>
      ) : null}
    </div>
  );
}
