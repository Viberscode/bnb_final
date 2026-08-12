"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { BrandLogo } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  className?: string;
  variant?: "transparent" | "solid";
}

export function SiteHeader({
  className,
  variant = "transparent",
}: SiteHeaderProps) {
  const isSolid = variant === "solid";
  const { user, status, signOut } = useAuth();
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "Profile";
  const avatar = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <header className={cn("absolute inset-x-0 top-0 z-40", className)}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:h-20 sm:px-8">
        <Link
          href="/"
          className={cn(
            "group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            isSolid
              ? "focus-visible:ring-crimson"
              : "focus-visible:ring-white",
          )}
          aria-label="BloodKit home"
        >
          <BrandLogo tone={isSolid ? "brand" : "light"} size="md" />
        </Link>

        <nav
          className="hidden items-center gap-7 text-[0.95rem] font-medium md:flex"
          aria-label="Primary"
        >
          {[
            ["#network", "Network"],
            ["/requests", "Live requests"],
            ["#how-it-works", "How it works"],
            ["#compatibility", "Compatibility"],
          ].map(([href, label]) =>
            href.startsWith("/") ? (
              <Link
                key={href}
                href={href}
                className={cn(
                  "transition-opacity hover:opacity-75",
                  isSolid ? "text-ink-muted" : "text-white/85",
                )}
              >
                {label}
              </Link>
            ) : (
              <a
                key={href}
                href={href}
                className={cn(
                  "transition-opacity hover:opacity-75",
                  isSolid ? "text-ink-muted" : "text-white/85",
                )}
              >
                {label}
              </a>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {status === "authenticated" && user ? (
            <>
              <Link
                href="/profile"
                className={cn(
                  "flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2",
                  isSolid
                    ? "text-ink hover:bg-black/5 focus-visible:ring-crimson"
                    : "text-white/90 hover:bg-white/10 focus-visible:ring-white",
                )}
              >
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatar}
                    alt=""
                    className="size-8 rounded-lg ring-1 ring-white/30"
                  />
                ) : null}
                <span className="hidden max-w-28 truncate sm:inline">
                  {String(displayName).split(" ")[0]}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className={cn(
                  "rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2",
                  isSolid
                    ? "text-ink-muted hover:bg-black/5 focus-visible:ring-crimson"
                    : "text-white/80 hover:bg-white/10 focus-visible:ring-white",
                )}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth"
                className={cn(
                  "rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2",
                  isSolid
                    ? "text-ink hover:bg-black/5 focus-visible:ring-crimson"
                    : "text-white/90 hover:bg-white/10 focus-visible:ring-white",
                )}
              >
                Sign in
              </Link>
              <Link
                href="/become-donor"
                className={cn(
                  "rounded-xl px-4 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2",
                  isSolid
                    ? "bg-teal text-white hover:bg-teal-deep focus-visible:ring-teal"
                    : "bg-white/15 text-white ring-1 ring-white/35 backdrop-blur-sm hover:bg-white/25 focus-visible:ring-white",
                )}
              >
                Become a Donor
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
