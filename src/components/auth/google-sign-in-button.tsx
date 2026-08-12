"use client";

import { useState } from "react";
import { tryCreateClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

interface GoogleSignInButtonProps {
  callbackUrl?: string;
  className?: string;
  label?: string;
}

export function GoogleSignInButton({
  callbackUrl = "/profile",
  className,
  label = "Continue with Google",
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);

    if (!isSupabaseConfigured()) {
      setError(
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then enable Google in Supabase Auth.",
      );
      return;
    }

    const supabase = tryCreateClient();
    if (!supabase) {
      setError("Could not start Supabase client.");
      return;
    }

    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(callbackUrl)}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  }

  return (
    <div className={cn("w-full", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="group relative flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-line bg-white px-5 text-base font-bold text-ink shadow-[0_14px_32px_-18px_rgba(20,28,34,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-16px_rgba(20,28,34,0.4)] disabled:opacity-70"
      >
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white to-transparent"
          aria-hidden
        />
        <GoogleMark className="relative size-5 shrink-0" />
        <span className="relative">
          {loading ? "Opening Google…" : label}
        </span>
      </button>
      {error ? (
        <p
          role="alert"
          className="mt-3 text-center text-sm font-semibold text-crimson"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
