import type { Metadata } from "next";
import { RequestHelpForm } from "@/components/request-help/request-help-form";
import { RequestHelpHero } from "@/components/request-help/request-help-hero";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Request Help",
  description:
    "Submit a blood need — group, nearby hospital, and urgency — and go live on BloodKit.",
};

export default function RequestHelpPage() {
  return (
    <>
      <SiteHeader
        variant="solid"
        className="relative border-b border-line/70 bg-white/80 backdrop-blur-md"
      />
      <main className="relative flex-1 overflow-hidden bg-request-help">
        <div
          className="pointer-events-none absolute inset-0 bg-request-help-mesh"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-24 -top-16 size-[26rem] rounded-full bg-rose-200/40 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 top-24 size-[22rem] rounded-full bg-teal-200/35 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-white/70 blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto max-w-5xl px-5 py-4 sm:px-8 sm:py-5">
          <RequestHelpHero />

          <div className="mt-4">
            <RequestHelpForm />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
