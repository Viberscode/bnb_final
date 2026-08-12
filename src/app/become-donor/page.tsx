import type { Metadata } from "next";
import { BecomeDonorForm } from "@/components/donor/become-donor-form";
import { BecomeDonorHero } from "@/components/donor/become-donor-hero";
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

        <div className="relative mx-auto max-w-5xl px-5 py-4 sm:px-8 sm:py-5">
          <BecomeDonorHero />

          <div className="mt-4">
            <BecomeDonorForm />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
