"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { useSignInPrompt } from "@/components/auth/sign-in-prompt";
import { useLanguage } from "@/components/i18n/language-provider";
import { BrandLogo } from "@/components/brand-mark";
import { fetchNgoProfile, subscribeNgoProfile } from "@/lib/ngo-profile";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  className?: string;
  variant?: "transparent" | "solid";
}

const NAV_KEYS = [
  ["#network", "nav.network"],
  ["/requests", "nav.liveRequests"],
  ["#how-it-works", "nav.howItWorks"],
  ["#compatibility", "nav.compatibility"],
] as const;

export function SiteHeader({
  className,
  variant = "transparent",
}: SiteHeaderProps) {
  const isSolid = variant === "solid";
  const pathname = usePathname();
  const showSignIn = pathname === "/";
  const router = useRouter();
  const { user, status, signOut } = useAuth();
  const { openSignIn, requireAuth } = useSignInPrompt();
  const { t } = useLanguage();
  const [ngoName, setNgoName] = useState<string | null>(null);
  const displayName =
    ngoName ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "Profile";
  const firstName = String(displayName).split(" ")[0];
  const avatar = user?.user_metadata?.avatar_url as string | undefined;

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const profile = await fetchNgoProfile(user?.id);
      if (!active) return;
      setNgoName(profile?.name ?? null);
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

  function navHref(href: string) {
    if (href.startsWith("#") && pathname !== "/") return `/${href}`;
    return href;
  }

  return (
    <header className={cn("absolute inset-x-0 top-0 z-40", className)}>
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:h-[4.5rem] sm:px-6">
        <Link
          href="/"
          className={cn(
            "group -ml-1.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:-ml-2.5",
            isSolid
              ? "focus-visible:ring-crimson"
              : "focus-visible:ring-white",
          )}
          aria-label="BloodNearby home"
        >
          <BrandLogo tone={isSolid ? "brand" : "light"} size="md" />
        </Link>

        <nav
          className="hidden items-center gap-3 md:flex"
          aria-label="Primary"
        >
          {NAV_KEYS.map(([href, key]) => {
            const dest = navHref(href);
            const active =
              href === "/requests"
                ? pathname.startsWith("/requests")
                : false;
            const classNameNav = cn(
              "nav-chip",
              active && "nav-chip--active",
              !isSolid && !active && "nav-chip--ghost",
            );

            return href.startsWith("/") && !href.startsWith("/#") ? (
              <Link key={href} href={dest} className={classNameNav}>
                {t(key)}
              </Link>
            ) : (
              <a key={href} href={dest} className={classNameNav}>
                {t(key)}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {status === "authenticated" && user ? (
            <>
              <Link
                href="/profile"
                className={cn(
                  "flex items-center gap-2 rounded-xl px-2 py-1 text-sm font-bold transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2",
                  isSolid
                    ? "bg-white text-ink ring-1 ring-line hover:ring-crimson/25 focus-visible:ring-crimson"
                    : "bg-white/12 text-white ring-1 ring-white/20 hover:bg-white/20 focus-visible:ring-white",
                )}
              >
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatar}
                    alt=""
                    className="size-7 rounded-lg object-cover ring-1 ring-black/10"
                  />
                ) : (
                  <span
                    className={cn(
                      "inline-flex size-7 items-center justify-center rounded-lg text-[0.7rem] font-black",
                      isSolid
                        ? "bg-crimson-soft text-crimson"
                        : "bg-white/20 text-white",
                    )}
                  >
                    {firstName.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="hidden max-w-32 truncate sm:inline">
                  {ngoName || firstName}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className={cn(
                  "rounded-xl px-3.5 py-2 text-xs font-black uppercase tracking-[0.08em] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2",
                  isSolid
                    ? "bg-ink text-white shadow-[0_8px_18px_-10px_rgba(20,28,34,0.55)] hover:bg-ink/90 focus-visible:ring-ink"
                    : "bg-white text-ink shadow-[0_8px_18px_-10px_rgba(0,0,0,0.35)] hover:bg-white/90 focus-visible:ring-white",
                )}
              >
                {t("nav.signOut")}
              </button>
            </>
          ) : (
            <>
              {showSignIn ? (
                <button
                  type="button"
                  onClick={() =>
                    openSignIn({
                      next: "/",
                      message: t("auth.useMessage"),
                    })
                  }
                  className={cn(
                    "rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.08em] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2",
                    isSolid
                      ? "bg-white text-crimson ring-1 ring-crimson/30 hover:bg-crimson-soft focus-visible:ring-crimson"
                      : "bg-white/15 text-white ring-1 ring-white/40 backdrop-blur-sm hover:bg-white/25 focus-visible:ring-white",
                  )}
                >
                  {t("nav.signIn")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (
                    requireAuth(
                      "/become-donor",
                      t("auth.donorMessage"),
                    )
                  ) {
                    router.push("/become-donor");
                  }
                }}
                className={cn(
                  "rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.06em] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2",
                  isSolid
                    ? "bg-teal text-white shadow-[0_8px_18px_-10px_rgba(13,115,112,0.7)] hover:bg-teal-deep focus-visible:ring-teal"
                    : "bg-white text-ink shadow-[0_8px_18px_-10px_rgba(0,0,0,0.3)] hover:bg-white/90 focus-visible:ring-white",
                )}
              >
                {t("nav.becomeDonor")}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
