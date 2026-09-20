"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Building2, Shield } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { NgoPartnerCard } from "@/components/ngo/ngo-partner-card";
import { fetchRegisteredNgos } from "@/lib/ngo-profile";
import { mergeNgoDirectory, isImpactPartner } from "@/lib/ngo-showcase";
import { cn } from "@/lib/utils";

type Filter = "all" | "impact";

export function NgoPartnersBoard() {
  const { t } = useLanguage();
  const params = useSearchParams();
  const highlightId = params.get("highlight");
  const [registered, setRegistered] = useState<Awaited<ReturnType<typeof fetchRegisteredNgos>>>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchRegisteredNgos().then((list) => {
      if (active) {
        setRegistered(list);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const entries = useMemo(() => {
    const merged = mergeNgoDirectory(registered);
    const filtered =
      filter === "all" ? merged : merged.filter(isImpactPartner);
    return filtered.sort(
      (a, b) => b.verifiedDonations - a.verifiedDonations,
    );
  }, [registered, filter]);

  useEffect(() => {
    if (!highlightId || !ready) return;
    const tmr = window.setTimeout(() => {
      document
        .getElementById(`ngo-${highlightId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => window.clearTimeout(tmr);
  }, [highlightId, ready]);

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: t("ngo.filterAll") },
    { id: "impact", label: t("ngo.filterImpact") },
  ];

  return (
    <section
      id="ngo-partners"
      className="scroll-mt-20 bg-paper-atmosphere px-5 py-6 sm:px-8 sm:py-8"
      aria-labelledby="ngo-partners-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1
            id="ngo-partners-heading"
            className="inline-flex items-center gap-3 font-display text-[clamp(1.7rem,4vw,2.6rem)] font-black uppercase tracking-[-0.04em] text-ink"
          >
            <span className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-900 text-white shadow-[0_12px_24px_-10px_rgba(37,99,235,0.75)] sm:size-12">
              <Shield className="size-5" aria-hidden />
              <span
                className="absolute inset-0 rounded-2xl ring-2 ring-sky-300/50"
                aria-hidden
              />
            </span>
            <span>
              {t("ngo.pageWord")}{" "}
              <span className="request-heading-live bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#1e3a8a] bg-clip-text text-transparent">
                {t("ngo.pageWordAccent")}
              </span>{" "}
              <span className="align-middle text-[0.55em] font-bold normal-case tracking-normal text-ink-muted sm:text-[0.5em]">
                {t("ngo.pageSubtitle")}
              </span>
            </span>
          </h1>

          <Link
            href="/become-ngo"
            className="group relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-sky-600 via-blue-700 to-blue-900 px-6 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_16px_32px_-12px_rgba(37,99,235,0.85)] ring-1 ring-white/25"
          >
            <Building2 className="size-4" aria-hidden />
            {t("ngo.registerCta")}
            <ArrowUpRight
              className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden
            />
          </Link>
        </div>

        <div
          className="mt-5 flex flex-wrap gap-2"
          role="tablist"
          aria-label={t("ngo.filterLabel")}
        >
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.1em] transition",
                filter === item.id
                  ? "bg-sky-700 text-white shadow-[0_8px_20px_-10px_rgba(29,78,216,0.8)]"
                  : "border border-line bg-white text-ink-muted hover:border-sky-200 hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {!ready ? (
          <p className="mt-12 text-center text-sm font-semibold text-ink-muted">
            {t("ngo.loadingPartners")}
          </p>
        ) : entries.length === 0 ? (
          <p className="mt-12 rounded-2xl border border-dashed border-line bg-white/60 px-6 py-14 text-center text-sm font-semibold text-ink-muted">
            {t("ngo.noPartnersFilter")}
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry) => (
              <NgoPartnerCard
                key={entry.id}
                entry={entry}
                highlighted={highlightId === entry.id}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
