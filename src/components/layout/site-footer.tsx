import Link from "next/link";
import { BrandLogo } from "@/components/brand-mark";

export function SiteFooter() {
  return (
    <footer className="bg-[#0d1418] text-white">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <BrandLogo tone="light" size="md" className="group" />
          <p className="mt-5 max-w-sm text-[0.98rem] leading-relaxed text-white/60">
            Real-time blood donation matching for donors, patients, and verified
            hospitals — calm under pressure, built for India.
          </p>
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">
            Get started
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-white/75">
            <li>
              <Link href="/auth?role=donor" className="transition hover:text-white">
                Become a donor
              </Link>
            </li>
            <li>
              <Link href="/auth?role=patient" className="transition hover:text-white">
                Request blood
              </Link>
            </li>
            <li>
              <Link href="/auth?role=ngo" className="transition hover:text-white">
                NGO / hospital sign in
              </Link>
            </li>
            <li>
              <Link href="/requests" className="transition hover:text-white">
                Active requests
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">
            Trust &amp; safety
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-white/75">
            <li>Verified partner NGOs</li>
            <li>Donor ID verification</li>
            <li>Report &amp; flag system</li>
            <li>English + Hindi coming soon</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} BloodKit.</p>
          <p>Demo mode — seed data until live services connect</p>
        </div>
      </div>
    </footer>
  );
}
