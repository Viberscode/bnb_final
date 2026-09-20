"use client";

import { Suspense } from "react";
import { NgoPartnersBoard } from "@/components/ngo/ngo-partners-board";
import { useLanguage } from "@/components/i18n/language-provider";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function PartnersPage() {
  const { t } = useLanguage();
  return (
    <>
      <SiteHeader
        variant="solid"
        className="relative border-b border-line bg-paper-elevated"
      />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="bg-paper-atmosphere px-5 py-24 text-center text-ink-muted">
              {t("ngo.loadingPartners")}
            </div>
          }
        >
          <NgoPartnersBoard />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
