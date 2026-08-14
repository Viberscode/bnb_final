"use client";

import { useEffect } from "react";
import { MapPin, Phone, Shield, X } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import type { NgoProfile } from "@/types";

export function NgoDirectoryModal({
  ngos,
  onClose,
}: {
  ngos: NgoProfile[];
  onClose: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#1c0d14]/70 backdrop-blur-[2px]"
        aria-label={t("ngo.closeList")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ngo-directory-title"
        className="relative max-h-[85vh] w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-white/40 bg-white shadow-[0_30px_80px_-24px_rgba(28,13,20,0.55)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">
              {t("ngo.badge")}
            </p>
            <h2
              id="ngo-directory-title"
              className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink"
            >
              {t("ngo.directoryTitle")}
            </h2>
            <p className="mt-1 text-sm font-semibold text-ink-muted">
              {t("ngo.directoryBody")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-ink-muted hover:bg-black/5 hover:text-ink"
            aria-label={t("ngo.closeList")}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="max-h-[min(60vh,28rem)] space-y-3 overflow-y-auto p-5">
          {ngos.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm font-semibold text-ink-muted">
              {t("ngo.noPartners")}
            </p>
          ) : (
            ngos.map((ngo) => (
              <article
                key={ngo.id}
                className="rounded-2xl border border-line bg-paper/70 p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                    <Shield className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg font-extrabold tracking-tight text-ink">
                      {ngo.name}
                    </h3>
                    <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-sky-700">
                      {t("ngo.registered")}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-ink-muted">
                      {t("ngo.regNo")} · {ngo.registrationNo}
                    </p>
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-ink">
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-sky-700" aria-hidden />
                      {ngo.address}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ink-muted">
                      {t("ngo.person")}: {ngo.authorizedPerson}
                    </p>
                    {ngo.phone ? (
                      <a
                        href={`tel:${ngo.phone}`}
                        className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-sky-700 px-3 text-xs font-black uppercase tracking-wider text-white"
                      >
                        <Phone className="size-3.5" aria-hidden />
                        {ngo.phone}
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
