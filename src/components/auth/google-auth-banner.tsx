"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export function GoogleAuthBanner({
  callbackUrl,
  tone = "crimson",
}: {
  callbackUrl: string;
  tone?: "crimson" | "teal";
}) {
  const { user, status } = useAuth();

  if (status === "loading") {
    return (
      <div className="mb-4 rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink-muted">
        Checking Google session…
      </div>
    );
  }

  if (user) {
    const name =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email ||
      "Signed in";
    const avatar = user.user_metadata?.avatar_url as string | undefined;

    return (
      <div
        className={`mb-4 flex items-center gap-3 rounded-2xl border px-4 py-3 ${
          tone === "teal"
            ? "border-teal/20 bg-teal-soft/50"
            : "border-rose-200 bg-rose-50/80"
        }`}
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            className="size-10 rounded-xl ring-1 ring-black/5"
          />
        ) : null}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">
            Signed in with Google · Supabase
          </p>
          <p className="truncate font-semibold text-ink">
            {name}
            {user.email ? (
              <span className="font-normal text-ink-muted">
                {" "}
                · {user.email}
              </span>
            ) : null}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <GoogleSignInButton
        callbackUrl={callbackUrl}
        label="Sign in with Google"
      />
    </div>
  );
}
