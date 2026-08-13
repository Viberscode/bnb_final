"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProfileDashboard } from "@/components/profile/profile-dashboard";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import {
  fetchDonorProfile,
  subscribeDonorProfile,
  updateDonorAvailability,
} from "@/lib/donor-profile";
import type { DonorProfile } from "@/types";

export default function DonorProfilePage() {
  const { user, status } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<DonorProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      const nextProfile = await fetchDonorProfile(user?.id);
      if (!active) return;
      setProfile(nextProfile);
      setReady(true);
    };

    void refresh();
    const unsubProfile = user?.id
      ? subscribeDonorProfile(user.id, () => {
          void refresh();
        })
      : () => undefined;

    return () => {
      active = false;
      unsubProfile();
    };
  }, [user?.id]);

  return (
    <>
      <SiteHeader
        variant="solid"
        className="relative border-b border-line/70 bg-white/80 backdrop-blur-md"
      />
      <main className="relative flex-1 overflow-hidden bg-blood-flow">
        <div
          className="pointer-events-none absolute inset-0 bg-dot-grid opacity-25"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-20 top-32 size-72 rounded-full bg-teal/12 blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-8">
          {!ready || status === "loading" ? (
            <p className="py-20 text-center text-ink-muted">{t("profile.loadingProfile")}</p>
          ) : status !== "authenticated" || !user ? (
            <div className="py-20 text-center">
              <p className="text-ink-muted">{t("profile.signInDonor")}</p>
              <Link
                href="/?signin=1&next=/profile/donor"
                className="mt-4 inline-flex h-10 items-center rounded-xl bg-teal px-4 text-sm font-bold text-white"
              >
                {t("profile.signIn")}
              </Link>
            </div>
          ) : !profile ? (
            <div className="mx-auto max-w-md py-16 text-center">
              <Link
                href="/profile"
                className="text-xs font-bold uppercase tracking-[0.18em] text-teal hover:underline"
              >
                {t("profile.backAccount")}
              </Link>
              <h1 className="mt-4 font-display text-3xl font-black text-ink">
                {t("profile.noDonor")}
              </h1>
              <p className="mt-2 text-sm text-ink-muted">
                {t("profile.noDonorBody")}
              </p>
              <Link
                href="/become-donor"
                className="mt-6 inline-flex h-11 items-center rounded-xl bg-gradient-to-r from-teal to-teal-deep px-5 text-sm font-bold text-white"
              >
                {t("profile.becomeDonor")}
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              <Link
                href="/profile"
                className="text-xs font-bold uppercase tracking-[0.18em] text-teal-deep hover:underline"
              >
                {t("profile.backAccount")}
              </Link>
              <ProfileDashboard
                profile={profile}
                onToggle={(next) => {
                  void updateDonorAvailability(next).then((updated) => {
                    if (updated) setProfile(updated);
                  });
                }}
              />
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
