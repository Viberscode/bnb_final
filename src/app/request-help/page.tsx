import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Radio } from "lucide-react";
import { GoogleAuthBanner } from "@/components/auth/google-auth-banner";
import { RequestHelpForm } from "@/components/request-help/request-help-form";
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
      <main className="relative flex-1 overflow-hidden bg-blood-flow">
        <div
          className="pointer-events-none absolute inset-0 bg-dot-grid opacity-35"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-28 top-0 size-[28rem] rounded-full bg-crimson/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-20 top-48 size-80 rounded-full bg-teal/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-10 left-1/3 size-72 rounded-full bg-rose-400/10 blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2.5 flex items-end gap-1" aria-hidden>
                {[10, 16, 12, 22, 14, 18, 11, 17, 13].map((h, i) => (
                  <span
                    key={i}
                    className="animate-heartbeat w-1.5 rounded-full bg-gradient-to-t from-crimson to-rose-400"
                    style={{ height: h, animationDelay: `${i * 0.07}s` }}
                  />
                ))}
              </div>

              <p className="text-sm font-bold uppercase tracking-[0.2em] text-crimson">
                Request Help
              </p>
              <h1 className="mt-1.5 font-display text-4xl font-extrabold leading-tight tracking-[-0.04em] text-ink sm:text-5xl">
                Raise a{" "}
                <span className="request-heading-live bg-gradient-to-r from-[#9f1239] via-[#ff2d4a] to-[#c4122f] bg-clip-text text-transparent">
                  blood need.
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
                  Live feed
                </span>
                <span className="font-display text-sm font-extrabold tracking-tight text-ink">
                  View live requests
                </span>
              </span>
              <ArrowUpRight
                className="size-4 text-crimson transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </Link>
          </div>

          <div className="mt-5">
            <GoogleAuthBanner callbackUrl="/request-help" tone="crimson" />
            <RequestHelpForm />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
