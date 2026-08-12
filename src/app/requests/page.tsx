"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { LiveRequests } from "@/components/landing/live-requests";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

function LiveRequestsWithHighlight() {
  const params = useSearchParams();
  const highlight = params.get("highlight");

  useEffect(() => {
    if (!highlight) return;
    const t = window.setTimeout(() => {
      document
        .getElementById(`request-${highlight}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
    return () => window.clearTimeout(t);
  }, [highlight]);

  return <LiveRequests highlightId={highlight} showHeaderCta />;
}

export default function RequestsPage() {
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
              Loading live requests…
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
