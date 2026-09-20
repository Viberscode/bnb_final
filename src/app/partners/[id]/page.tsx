"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { NgoImpactPage } from "@/components/ngo/ngo-impact-page";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { useLanguage } from "@/components/i18n/language-provider";
import {
  mergeNgoDirectory,
  SAMPLE_NGO_DIRECTORY,
  type NgoDirectoryEntry,
} from "@/lib/ngo-showcase";
import { fetchRegisteredNgos } from "@/lib/ngo-profile";

export default function PartnerDetailPage() {
  const { t } = useLanguage();
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id ?? "");
  const [entry, setEntry] = useState<NgoDirectoryEntry | null>(
    () => SAMPLE_NGO_DIRECTORY.find((item) => item.id === id) ?? null,
  );
  const [ready, setReady] = useState(() =>
    SAMPLE_NGO_DIRECTORY.some((item) => item.id === id),
  );

  useEffect(() => {
    let active = true;
    const sample = SAMPLE_NGO_DIRECTORY.find((item) => item.id === id);
    if (sample) {
      setEntry(sample);
      setReady(true);
      return;
    }
    void fetchRegisteredNgos().then((registered) => {
      if (!active) return;
      setEntry(mergeNgoDirectory(registered).find((item) => item.id === id) ?? null);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <>
      <SiteHeader
        variant="solid"
        className="relative border-b border-line bg-paper-elevated"
      />
      <main className="flex-1 bg-paper-atmosphere">
        {!ready ? (
          <p className="px-5 py-24 text-center text-sm font-semibold text-ink-muted">
            {t("ngo.loadingPartners")}
          </p>
        ) : !entry ? (
          <div className="mx-auto max-w-xl px-5 py-24 text-center">
            <p className="font-display text-2xl font-black text-ink">
              {t("ngo.partnerMissing")}
            </p>
            <p className="mt-2 text-sm font-semibold text-ink-muted">
              {t("ngo.partnerMissingBody")}
            </p>
          </div>
        ) : (
          <NgoImpactPage entry={entry} />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
