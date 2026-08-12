"use client";

import { Mic } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";

export function VoiceNotePlayer({
  src,
  compact = false,
}: {
  src: string;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div
      className={
        compact
          ? "rounded-xl border border-crimson/20 bg-crimson-soft/50 px-3 py-2"
          : "rounded-2xl border border-crimson/25 bg-gradient-to-br from-[#fff1f3] to-white px-4 py-3"
      }
    >
      <p className="mb-2 flex items-center gap-1.5 text-[0.65rem] font-black uppercase tracking-[0.14em] text-crimson">
        <Mic className="size-3.5" aria-hidden />
        {t("voice.voiceNote")}
      </p>
      <audio
        controls
        preload="metadata"
        src={src}
        className="w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {t("voice.cannotPlay")}
      </audio>
    </div>
  );
}
