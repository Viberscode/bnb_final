"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { LiveRequests } from "@/components/landing/live-requests";
import { useLanguage } from "@/components/i18n/language-provider";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

function LiveRequestsWithHighlight() {
  const params = useSearchParams();
  const highlight = params.get("highlight");
  const showAll = params.get("all") === "1";

  useEffect(() => {
    if (!highlight) return;
    const t = window.setTimeout(() => {
      document
        .getElementById(`request-${highlight}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
    return () => window.clearTimeout(t);
  }, [highlight]);

  return <LiveRequests highlightId={highlight} showHeaderCta showAll={showAll} />;
}

export default function RequestsPage() {
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
            {t("live.loading")}
            </div>
          }
        >
          <LiveRequestsWithHighlight />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
