"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, MapPin, Phone, UserRound } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { fetchNgoProfile, subscribeNgoProfile } from "@/lib/ngo-profile";
import type { NgoProfile } from "@/types";

export default function NgoProfilePage() {
  const { user, status } = useAuth();
  const { t, locale } = useLanguage();
  const [profile, setProfile] = useState<NgoProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const next = await fetchNgoProfile(user?.id);
      if (!active) return;
      setProfile(next);
      setReady(true);
    };
    void refresh();
    const unsub = subscribeNgoProfile(() => {
      void refresh();
    });
    return () => {
      active = false;
      unsub();
    };
  }, [user?.id]);

  const joined = profile
    ? new Date(profile.joinedAt).toLocaleDateString(
        locale === "hi" ? "hi-IN" : "en-IN",
        { day: "numeric", month: "short", year: "numeric" },
      )
    : "";

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
        <div className="relative mx-auto max-w-3xl px-5 py-6 sm:px-8 sm:py-8">
          {!ready || status === "loading" ? (
            <p className="py-20 text-center text-ink-muted">{t("ngo.loading")}</p>
          ) : status !== "authenticated" || !user ? (
            <div className="py-20 text-center">
              <p className="text-ink-muted">{t("ngo.errSignIn")}</p>
              <Link
                href="/?signin=1&next=/profile/ngo"
                className="mt-4 inline-flex h-10 items-center rounded-xl bg-sky-600 px-4 text-sm font-bold text-white"
              >
                {t("profile.signIn")}
              </Link>
            </div>
          ) : !profile ? (
            <div className="mx-auto max-w-md py-16 text-center">
              <Link
                href="/profile"
                className="text-xs font-bold uppercase tracking-[0.18em] text-sky-800 hover:underline"
              >
                {t("profile.backAccount")}
              </Link>
              <h1 className="mt-4 font-display text-3xl font-black text-ink">
                {t("ngo.noOrg")}
              </h1>
              <p className="mt-2 text-sm text-ink-muted">{t("ngo.noOrgBody")}</p>
              <Link
                href="/become-ngo"
                className="mt-6 inline-flex h-11 items-center rounded-xl bg-gradient-to-r from-sky-500 to-blue-800 px-5 text-sm font-bold text-white"
              >
                {t("ngo.registerNgo")}
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              <Link
                href="/profile"
                className="text-xs font-bold uppercase tracking-[0.18em] text-sky-800 hover:underline"
              >
                {t("profile.backAccount")}
              </Link>

              <section
                className="request-step-panel overflow-hidden p-5 sm:p-6"
                data-tone="slate"
              >
                <div className="flex items-start gap-3.5">
                  <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-800 text-white shadow-[0_14px_28px_-12px_rgba(37,99,235,0.7)]">
                    <Building2 className="size-6" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-800">
                      {t("ngo.registered")}
                    </p>
                    <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                      {profile.name}
                    </h1>
                    <p className="mt-1.5 text-sm font-semibold text-ink-muted">
                      {t("ngo.regNo")} · {profile.registrationNo}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {t("ngo.joined")} {joined}
                    </p>
                  </div>
                </div>
              </section>

              <dl className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    {
                      key: "address",
                      label: t("ngo.address"),
                      value: profile.address,
                      Icon: MapPin,
                    },
                    {
                      key: "phone",
                      label: t("ngo.phone"),
                      value: profile.phone,
                      Icon: Phone,
                    },
                    {
                      key: "person",
                      label: t("ngo.person"),
                      value: profile.authorizedPerson,
                      Icon: UserRound,
                    },
                    {
                      key: "cert",
                      label: t("ngo.certificate"),
                      value: profile.certificateName || "—",
                      Icon: Building2,
                    },
                  ] as const
                ).map(({ key, label, value, Icon }) => (
                  <div
                    key={key}
                    className="rounded-xl border border-line bg-white/80 px-3.5 py-2.5"
                  >
                    <dt className="flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-ink-muted">
                      <Icon className="size-3.5" aria-hidden />
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
                  </div>
                ))}
              </dl>

              <Link
                href="/become-ngo"
                className="inline-flex h-10 items-center rounded-xl border border-line bg-white px-3.5 text-sm font-bold text-ink hover:bg-black/[0.02]"
              >
                {t("ngo.edit")}
              </Link>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
