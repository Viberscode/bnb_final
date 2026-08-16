"use client";

import Link from "next/link";
import { AuthGateLink } from "@/components/auth/sign-in-prompt";
import { useLanguage } from "@/components/i18n/language-provider";
import { BrandLogo } from "@/components/brand-mark";

export function SiteFooter() {
  const { t } = useLanguage();
  return (
    <footer className="bg-[#0d1418] text-white">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <BrandLogo tone="light" size="md" className="group" />
          <p className="mt-5 max-w-sm text-[0.98rem] leading-relaxed text-white/60">
            {t("footer.blurb")}
          </p>
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">
            {t("footer.getStarted")}
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-white/75">
            <li>
              <AuthGateLink
                href="/become-donor"
                message={t("auth.donorMessage")}
                className="transition hover:text-white"
              >
                {t("footer.becomeDonor")}
              </AuthGateLink>
            </li>
            <li>
              <AuthGateLink
                href="/request-help"
                message={t("auth.requestMessage")}
                className="transition hover:text-white"
              >
                {t("footer.requestBlood")}
              </AuthGateLink>
            </li>
            <li>
              <AuthGateLink
                href="/become-ngo"
                message={t("auth.ngoRegisterMessage")}
                className="transition hover:text-white"
              >
                {t("footer.ngoSignIn")}
              </AuthGateLink>
            </li>
            <li>
              <Link href="/requests" className="transition hover:text-white">
                {t("footer.activeRequests")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">
            {t("footer.trust")}
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-white/75">
            <li>{t("footer.verified")}</li>
            <li>{t("footer.donorId")}</li>
            <li>{t("footer.report")}</li>
            <li>{t("footer.languages")}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 py-5 sm:flex-row sm:justify-between sm:px-8">
          <p className="text-xs text-white/40">© {new Date().getFullYear()} BloodNearby.</p>
          <p className="inline-flex items-center gap-2 text-center font-display text-[0.8rem] italic tracking-wide text-white/70 sm:text-right">
            <span
              className="inline-block size-1.5 rounded-full bg-[#ff4d6d] shadow-[0_0_10px_rgba(255,77,109,0.9)]"
              aria-hidden
            />
            {t("footer.tagline")}
          </p>
        </div>
      </div>
    </footer>
  );
}
