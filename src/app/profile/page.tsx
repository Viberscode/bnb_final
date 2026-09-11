"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  HeartHandshake,
  Radio,
  UserRound,
} from "lucide-react";
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
import { cn } from "@/lib/utils";

type CardTone = "crimson" | "teal" | "sky";

function AccountCard({
  href,
  tone,
  icon,
  title,
  detail,
}: {
  href: string;
  tone: CardTone;
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex min-h-[11.5rem] flex-col overflow-hidden rounded-[1.5rem] border bg-white/90 p-5 shadow-[0_18px_40px_-28px_rgba(28,13,20,0.45)] backdrop-blur-sm transition duration-300",
        "hover:-translate-y-1 hover:bg-white",
        tone === "crimson" &&
          "border-[#ffc4ce]/80 hover:shadow-[0_22px_48px_-24px_rgba(196,18,47,0.55)]",
        tone === "teal" &&
          "border-teal/25 hover:shadow-[0_22px_48px_-24px_rgba(13,115,112,0.5)]",
        tone === "sky" &&
          "border-sky-200/90 hover:shadow-[0_22px_48px_-24px_rgba(37,99,235,0.45)]",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute -right-8 -top-10 size-28 rounded-full blur-2xl transition group-hover:scale-110",
          tone === "crimson" && "bg-crimson/15",
          tone === "teal" && "bg-teal/15",
          tone === "sky" && "bg-sky-400/20",
        )}
        aria-hidden
      />
      <span
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-1",
          tone === "crimson" &&
            "bg-gradient-to-r from-[#ff4d6d] via-[#c4122f] to-[#8e0c22]",
          tone === "teal" && "bg-gradient-to-r from-teal via-[#14b8a6] to-teal-deep",
          tone === "sky" && "bg-gradient-to-r from-sky-400 via-blue-500 to-blue-800",
        )}
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-3">
        <span
          className={cn(
            "inline-flex size-12 items-center justify-center rounded-2xl text-white shadow-lg",
            tone === "crimson" &&
              "bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22] shadow-[0_14px_28px_-12px_rgba(196,18,47,0.75)]",
            tone === "teal" &&
              "bg-gradient-to-br from-teal to-teal-deep shadow-[0_14px_28px_-12px_rgba(13,115,112,0.7)]",
            tone === "sky" &&
              "bg-gradient-to-br from-sky-500 to-blue-800 shadow-[0_14px_28px_-12px_rgba(37,99,235,0.7)]",
          )}
        >
          {icon}
        </span>
        <ArrowUpRight
          className={cn(
            "size-5 shrink-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
            tone === "crimson" && "text-crimson",
            tone === "teal" && "text-teal",
            tone === "sky" && "text-sky-700",
          )}
          aria-hidden
        />
      </div>

      <div className="relative mt-auto pt-6">
        <h2 className="font-display text-xl font-black tracking-tight text-ink">
          {title}
        </h2>
        <p className="mt-1.5 text-sm font-semibold leading-snug text-ink-muted">
          {detail}
        </p>
      </div>
    </Link>
  );
}

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

        <div className="relative mx-auto flex min-h-[calc(100vh-12rem)] max-w-6xl flex-col justify-center px-5 py-10 sm:px-8">
          {!ready || status === "loading" ? (
            <p className="text-ink-muted">{t("profile.loading")}</p>
          ) : status !== "authenticated" || !user ? (
            <div className="max-w-md">
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
            <div className="w-full space-y-8">
              <header className="text-left">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-crimson">
                  {t("profile.accountKicker")}
                </p>
                <h1 className="mt-2 font-display text-[clamp(2.2rem,5vw,3.2rem)] font-black leading-tight tracking-[-0.04em] text-ink">
                  {t("profile.my")}{" "}
                  <span className="request-heading-live bg-gradient-to-r from-[#9f1239] via-[#ff2d4a] to-[#c4122f] bg-clip-text text-transparent">
                    {t("profile.account")}
                  </span>
                </h1>
                <p className="mt-2 text-sm font-semibold text-ink-muted sm:text-base">
                  {t("profile.welcomeBack")}{" "}
                  <span className="font-extrabold text-ink">
                    {ngo?.name || firstName}
                  </span>
                </p>
              </header>

              <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
                <AccountCard
                  href="/profile/requests"
                  tone="crimson"
                  icon={<Radio className="size-5" aria-hidden />}
                  title={t("profile.myRequests")}
                  detail={t("profile.liveTracker", { n: requestCount })}
                />

                {profile ? (
                  <AccountCard
                    href="/profile/donor"
                    tone="teal"
                    icon={<UserRound className="size-5" aria-hidden />}
                    title={t("profile.visitProfile")}
                    detail={t("profile.donorDashboard", {
                      group: profile.bloodGroup,
                    })}
                  />
                ) : (
                  <AccountCard
                    href="/become-donor"
                    tone="teal"
                    icon={<HeartHandshake className="size-5" aria-hidden />}
                    title={t("profile.becomeDonor")}
                    detail={t("profile.registerStandby")}
                  />
                )}

                {ngo ? (
                  <AccountCard
                    href="/profile/ngo"
                    tone="sky"
                    icon={<Building2 className="size-5" aria-hidden />}
                    title={ngo.name}
                    detail={t("ngo.visitOrg")}
                  />
                ) : (
                  <AccountCard
                    href="/become-ngo"
                    tone="sky"
                    icon={<Building2 className="size-5" aria-hidden />}
                    title={t("ngo.registerNgo")}
                    detail={t("ngo.registerHint")}
                  />
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
