"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function AuthClientPage() {
  const { user, status, configured } = useAuth();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/profile";
  const role = params.get("role");
  const error = params.get("error");

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "Account";
  const avatar = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <>
      <SiteHeader
        variant="solid"
        className="relative border-b border-line/70 bg-white/80 backdrop-blur-md"
      />
      <main className="relative flex-1 overflow-hidden bg-blood-flow">
        <div
          className="pointer-events-none absolute inset-0 bg-dot-grid opacity-30"
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-lg flex-col px-5 py-12 sm:px-8 sm:py-16">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-crimson">
            Sign in
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Welcome to{" "}
            <span className="request-heading-live bg-gradient-to-r from-[#9f1239] via-[#ff2d4a] to-[#c4122f] bg-clip-text text-transparent">
              BloodKit
            </span>
          </h1>
          <p className="mt-3 text-ink-muted">
            {role === "donor"
              ? "Sign in with Google via Supabase to join as a donor."
              : role === "ngo"
                ? "Sign in with Google via Supabase for NGO / hospital access."
                : "Google login powered by Supabase Auth — your session syncs to the database in real time."}
          </p>

          {!configured ? (
            <p className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              Add Supabase keys in `.env.local`, run `supabase/schema.sql`, and
              enable Google provider in Supabase Auth.
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-2xl border border-crimson/30 bg-crimson-soft px-4 py-3 text-sm font-semibold text-crimson-deep">
              Sign-in failed ({error}). Try again.
            </p>
          ) : null}

          <div
            className="request-step-panel mt-8 p-6 sm:p-8"
            data-tone="crimson"
          >
            {status === "loading" ? (
              <p className="text-center text-ink-muted">Checking session…</p>
            ) : user ? (
              <div className="text-center">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatar}
                    alt=""
                    className="mx-auto size-16 rounded-2xl ring-2 ring-crimson/20"
                  />
                ) : null}
                <p className="mt-4 font-display text-2xl font-extrabold text-ink">
                  {displayName}
                </p>
                <p className="mt-1 text-sm text-ink-muted">{user.email}</p>
                <Link
                  href={
                    role === "donor"
                      ? "/become-donor"
                      : role === "patient"
                        ? "/request-help"
                        : callbackUrl
                  }
                  className="mt-6 inline-flex h-12 items-center gap-2 rounded-2xl bg-crimson px-6 text-sm font-bold text-white hover:bg-crimson-deep"
                >
                  Continue
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            ) : (
              <>
                <GoogleSignInButton
                  callbackUrl={
                    role === "donor"
                      ? "/become-donor"
                      : role === "patient"
                        ? "/request-help"
                        : callbackUrl
                  }
                />
                <p className="mt-4 text-center text-xs text-ink-muted">
                  Supabase Auth + Google OAuth — real accounts, real-time DB.
                </p>
              </>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-ink-muted">
            New donor?{" "}
            <Link
              href="/become-donor"
              className="font-semibold text-teal underline-offset-2 hover:underline"
            >
              Complete your donor profile
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
