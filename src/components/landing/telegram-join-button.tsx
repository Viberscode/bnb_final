"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Send } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { useSignInPrompt } from "@/components/auth/sign-in-prompt";
import { useLanguage } from "@/components/i18n/language-provider";
import { fetchDonorProfile } from "@/lib/donor-profile";
import { cn } from "@/lib/utils";

export function TelegramJoinButton({ className }: { className?: string }) {
  const { t } = useLanguage();
  const { user, status } = useAuth();
  const { requireAuth } = useSignInPrompt();
  const [linked, setLinked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!user?.id) {
      setLinked(false);
      return;
    }
    void fetchDonorProfile(user.id).then((profile) => {
      if (!active) return;
      setLinked(Boolean(profile?.telegramChatId));
    });
    return () => {
      active = false;
    };
  }, [user?.id]);

  async function syncLink() {
    try {
      const res = await fetch("/api/telegram/sync", { method: "POST" });
      const data = (await res.json()) as { linked?: boolean };
      if (data.linked) setLinked(true);
      return Boolean(data.linked);
    } catch {
      return false;
    }
  }

  async function connect() {
    setError(null);
    if (status !== "authenticated") {
      requireAuth("/", t("hero.telegramAuth"));
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/telegram/connect");
      const data = (await res.json()) as {
        url?: string;
        error?: string;
        needDonor?: boolean;
      };
      if (!res.ok || !data.url) {
        if (data.needDonor) {
          setError(t("hero.telegramNeedDonor"));
        } else {
          setError(data.error || t("hero.telegramConnectError"));
        }
        return;
      }

      window.open(data.url, "_blank", "noopener,noreferrer");

      // Local-friendly: poll getUpdates until the donor presses Start
      for (let i = 0; i < 12; i += 1) {
        await new Promise((r) => window.setTimeout(r, 2500));
        if (await syncLink()) break;
      }
    } catch {
      setError(t("hero.telegramConnectError"));
    } finally {
      setBusy(false);
    }
  }

  if (linked) {
    return (
      <div
        className={cn(
          "inline-flex w-full items-center gap-3 rounded-2xl bg-emerald-500/20 px-4 py-3.5 text-left text-white ring-1 ring-emerald-300/40",
          className,
        )}
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-400/20">
          <Check className="size-5 text-emerald-200" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-base font-extrabold tracking-tight">
            {t("hero.telegramLinked")}
          </span>
          <span className="mt-0.5 block text-xs font-semibold text-white/85 sm:text-sm">
            {t("hero.telegramLinkedSub")}
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <button
        type="button"
        onClick={() => void connect()}
        disabled={busy}
        className="group relative inline-flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-[#2AABEE] via-[#229ED9] to-[#1B86BC] px-4 py-3.5 text-left text-white shadow-[0_16px_36px_-12px_rgba(42,171,238,0.85)] ring-2 ring-white/25 transition hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-80"
      >
        <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30">
          {busy ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <Send className="size-5" aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-base font-extrabold tracking-tight">
            {t("hero.telegramTitle")}
          </span>
          <span className="mt-0.5 block text-xs font-semibold text-white/85 sm:text-sm">
            {busy ? t("hero.telegramWaiting") : t("hero.telegramSub")}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wider">
          {t("hero.telegramCta")}
        </span>
      </button>
      {error ? (
        <p className="mt-2 text-center text-xs font-semibold text-[#ffb4c0]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
