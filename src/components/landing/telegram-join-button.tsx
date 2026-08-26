"use client";

import { Send } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { telegramChannelUrl } from "@/lib/telegram-public";
import { cn } from "@/lib/utils";

export function TelegramJoinButton({ className }: { className?: string }) {
  const { t } = useLanguage();
  const href = telegramChannelUrl();

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group relative inline-flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-[#2AABEE] via-[#229ED9] to-[#1B86BC] px-4 py-3.5 text-left text-white shadow-[0_16px_36px_-12px_rgba(42,171,238,0.85)] ring-2 ring-white/25 transition hover:-translate-y-0.5 hover:brightness-110",
        className,
      )}
    >
      <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30">
        <Send className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base font-extrabold tracking-tight">
          {t("hero.telegramTitle")}
        </span>
        <span className="mt-0.5 block text-xs font-semibold text-white/85 sm:text-sm">
          {t("hero.telegramSub")}
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wider">
        {t("hero.telegramCta")}
      </span>
    </a>
  );
}
