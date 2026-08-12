import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, UserRound } from "lucide-react";
import { GoogleAuthBanner } from "@/components/auth/google-auth-banner";
import { BecomeDonorForm } from "@/components/donor/become-donor-form";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Become a Donor",
  description:
    "Register as a BloodKit donor — blood group, location, and availability — then open your profile dashboard.",
};

export default function BecomeDonorPage() {
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
          className="pointer-events-none absolute -left-28 top-0 size-[28rem] rounded-full bg-teal/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-20 top-48 size-80 rounded-full bg-crimson/12 blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2.5 flex items-end gap-1" aria-hidden>
                {[10, 16, 12, 22, 14, 18, 11, 17, 13].map((h, i) => (
                  <span
                    key={i}
                    className="animate-heartbeat w-1.5 rounded-full bg-gradient-to-t from-teal to-emerald-400"
                    style={{ height: h, animationDelay: `${i * 0.07}s` }}
                  />
                ))}
              </div>

              <p className="text-sm font-bold uppercase tracking-[0.2em] text-teal">
                Become a Donor
              </p>
              <h1 className="mt-1.5 font-display text-4xl font-extrabold leading-tight tracking-[-0.04em] text-ink sm:text-5xl">
                Stand by.{" "}
                <span className="request-heading-live bg-gradient-to-r from-[#0a6b54] via-[#0f9f7a] to-[#14b8a6] bg-clip-text text-transparent">
                  Save lives.
                </span>
              </h1>
            </div>

            <Link
              href="/profile"
              className="shiny-card group inline-flex w-fit shrink-0 items-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-br from-white to-teal-soft px-3.5 py-2.5 shadow-[0_12px_28px_-18px_rgba(13,115,112,0.4)] ring-1 ring-teal/25 transition hover:-translate-y-0.5"
            >
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal to-teal-deep text-white">
                <UserRound className="size-3.5" aria-hidden />
              </span>
              <span className="text-left">
                <span className="block text-[0.6rem] font-bold uppercase tracking-[0.16em] text-teal-deep">
                  Dashboard
                </span>
                <span className="font-display text-sm font-extrabold tracking-tight text-ink">
                  My Profile
                </span>
              </span>
              <ArrowUpRight
                className="size-4 text-teal transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </Link>
          </div>

          <div className="mt-5">
            <GoogleAuthBanner callbackUrl="/become-donor" tone="teal" />
            <BecomeDonorForm />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
