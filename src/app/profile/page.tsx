"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, HeartHandshake, Radio, UserRound } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import {
  fetchDonorProfile,
  subscribeDonorProfile,
} from "@/lib/donor-profile";
import {
  fetchMyLiveRequests,
  subscribeLiveRequests,
} from "@/lib/live-requests";
import type { DonorProfile, NgoProfile } from "@/types";
import { fetchNgoProfile, subscribeNgoProfile } from "@/lib/ngo-profile";

export default function ProfilePage() {
  const { user, status } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<DonorProfile | null>(null);
  const [ngo, setNgo] = useState<NgoProfile | null>(null);
  const [requestCount, setRequestCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      const [nextProfile, myRequests, nextNgo] = await Promise.all([
        fetchDonorProfile(user?.id),
        fetchMyLiveRequests(user?.id),
        fetchNgoProfile(user?.id),
      ]);
      if (!active) return;
      setProfile(nextProfile);
      setRequestCount(myRequests.length);
      setNgo(nextNgo);
      setReady(true);
    };

    void refresh();
    const unsubRequests = subscribeLiveRequests(() => {
      void refresh();
    });
    const unsubProfile = user?.id
      ? subscribeDonorProfile(user.id, () => {
          void refresh();
        })
      : () => undefined;

    const unsubNgo = subscribeNgoProfile(() => {
      void refresh();
    });

    return () => {
      active = false;
      unsubRequests();
      unsubProfile();
      unsubNgo();
    };
  }, [user?.id]);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "there";
  const firstName = String(displayName).split(" ")[0];

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
          className="pointer-events-none absolute -left-24 top-0 size-64 rounded-full bg-crimson/12 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 top-40 size-56 rounded-full bg-teal/12 blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto flex min-h-[calc(100vh-12rem)] max-w-lg flex-col justify-center px-5 py-10 sm:px-8">
          {!ready || status === "loading" ? (
            <p className="text-center text-ink-muted">{t("profile.loading")}</p>
          ) : status !== "authenticated" || !user ? (
            <div className="text-center">
              <h1 className="font-display text-3xl font-black tracking-tight text-ink">
                {t("profile.signInTitle")}
              </h1>
              <p className="mt-2 text-sm text-ink-muted">
                {t("profile.signInBody")}
              </p>
              <Link
                href="/?signin=1&next=/profile"
                className="mt-6 inline-flex h-11 items-center rounded-xl bg-crimson px-5 text-sm font-bold text-white hover:bg-crimson-deep"
              >
                {t("profile.signIn")}
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <header className="text-center">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-crimson">
                  {t("profile.accountKicker")}
                </p>
                <h1 className="mt-2 font-display text-[clamp(2rem,5vw,2.75rem)] font-black leading-tight tracking-[-0.04em] text-ink">
                  {t("profile.my")}{" "}
                  <span className="request-heading-live bg-gradient-to-r from-[#9f1239] via-[#ff2d4a] to-[#c4122f] bg-clip-text text-transparent">
                    {t("profile.account")}
                  </span>
                </h1>
                <p className="mt-2 text-sm font-semibold text-ink-muted">
                  {t("profile.welcomeBack")}{" "}
                  <span className="font-extrabold text-ink">
                    {ngo?.name || firstName}
                  </span>
                </p>
              </header>

              <div className="grid gap-4">
                <Link
                  href="/profile/requests"
                  className="request-step-panel group flex items-center gap-4 p-4 transition hover:-translate-y-0.5 sm:p-5"
                  data-tone="crimson"
                >
                  <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22] text-white shadow-[0_12px_24px_-12px_rgba(196,18,47,0.7)]">
                    <Radio className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg font-black tracking-tight text-ink sm:text-xl">
                      {t("profile.myRequests")}
                    </h2>
                    <p className="mt-0.5 text-xs font-semibold text-ink-muted">
                      {t("profile.liveTracker", { n: requestCount })}
                    </p>
                  </div>
                  <ArrowUpRight
                    className="size-5 shrink-0 text-crimson transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden
                  />
                </Link>

                {profile ? (
                  <Link
                    href="/profile/donor"
                    className="request-step-panel group flex items-center gap-4 p-4 transition hover:-translate-y-0.5 sm:p-5"
                    data-tone="teal"
                  >
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal to-teal-deep text-white shadow-[0_12px_24px_-12px_rgba(13,115,112,0.65)]">
                      <UserRound className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-lg font-black tracking-tight text-ink sm:text-xl">
                        {t("profile.visitProfile")}
                      </h2>
                      <p className="mt-0.5 text-xs font-semibold text-ink-muted">
                        {t("profile.donorDashboard", { group: profile.bloodGroup })}
                      </p>
                    </div>
                    <ArrowUpRight
                      className="size-5 shrink-0 text-teal transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden
                    />
                  </Link>
                ) : (
                  <Link
                    href="/become-donor"
                    className="request-step-panel group flex items-center gap-4 p-4 transition hover:-translate-y-0.5 sm:p-5"
                    data-tone="teal"
                  >
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal to-teal-deep text-white shadow-[0_12px_24px_-12px_rgba(13,115,112,0.65)]">
                      <HeartHandshake className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-lg font-black tracking-tight text-ink sm:text-xl">
                        {t("profile.becomeDonor")}
                      </h2>
                      <p className="mt-0.5 text-xs font-semibold text-ink-muted">
                        {t("profile.registerStandby")}
                      </p>
                    </div>
                    <ArrowUpRight
                      className="size-5 shrink-0 text-teal transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden
                    />
                  </Link>
                )}

                {ngo ? (
                  <Link
                    href="/profile/ngo"
                    className="request-step-panel group flex items-center gap-4 p-4 transition hover:-translate-y-0.5 sm:p-5"
                    data-tone="slate"
                  >
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-800 text-white shadow-[0_12px_24px_-12px_rgba(37,99,235,0.65)]">
                      <Building2 className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-lg font-black tracking-tight text-ink sm:text-xl">
                        {ngo.name}
                      </h2>
                      <p className="mt-0.5 text-xs font-semibold text-ink-muted">
                        {t("ngo.visitOrg")}
                      </p>
                    </div>
                    <ArrowUpRight
                      className="size-5 shrink-0 text-sky-700 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden
                    />
                  </Link>
                ) : (
                  <Link
                    href="/become-ngo"
                    className="request-step-panel group flex items-center gap-4 p-4 transition hover:-translate-y-0.5 sm:p-5"
                    data-tone="slate"
                  >
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-800 text-white shadow-[0_12px_24px_-12px_rgba(37,99,235,0.65)]">
                      <Building2 className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-lg font-black tracking-tight text-ink sm:text-xl">
                        {t("ngo.registerNgo")}
                      </h2>
                      <p className="mt-0.5 text-xs font-semibold text-ink-muted">
                        {t("ngo.registerHint")}
                      </p>
                    </div>
                    <ArrowUpRight
                      className="size-5 shrink-0 text-sky-700 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden
                    />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
