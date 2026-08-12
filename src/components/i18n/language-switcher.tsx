"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { LOCALES } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  variant = "hero",
}: {
  variant?: "hero" | "header" | "header-solid";
}) {
  const { locale, setLocale, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = LOCALES.find((item) => item.id === locale) ?? LOCALES[0];

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const isHero = variant === "hero";
  const isSolid = variant === "header-solid";

  return (
    <div ref={rootRef} className={cn("relative", isHero ? "inline-block" : "")}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("lang.label")}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg text-sm font-bold transition",
          isHero &&
            "h-11 min-w-[11.5rem] justify-between rounded-md border border-white/25 bg-white/10 px-3.5 text-base text-white backdrop-blur-md hover:bg-white/16",
          variant === "header" &&
            "h-9 border border-white/20 bg-white/10 px-2.5 text-white hover:bg-white/18",
          isSolid &&
            "h-9 border border-line bg-white px-2.5 text-ink hover:bg-black/[0.03]",
        )}
      >
        <span className="inline-flex items-center gap-2.5">
          <Globe
            className={cn("opacity-90", isHero ? "-ml-0.5 size-5" : "size-3.5")}
            strokeWidth={isHero ? 2.5 : 2}
            aria-hidden
          />
          {current.native}
        </span>
        <ChevronDown
          className={cn("size-3.5 opacity-70 transition", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? (
        <ul
          role="listbox"
          className={cn(
            "absolute z-30 mt-1.5 overflow-hidden rounded-xl py-1 shadow-[0_16px_40px_-18px_rgba(0,0,0,0.65)]",
            isHero || variant === "header"
              ? "border border-white/15 bg-[#1c0d14]/95 backdrop-blur-md"
              : "border border-line bg-white shadow-lg",
            isHero ? "left-0 min-w-full rounded-md" : "right-0 min-w-36",
          )}
        >
          {LOCALES.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={item.id === locale}
                onClick={() => {
                  setLocale(item.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-3.5 py-2 text-left text-sm font-bold hover:bg-black/[0.04]",
                  isHero || variant === "header"
                    ? "text-white/85 hover:bg-white/10"
                    : "text-ink",
                  item.id === locale &&
                    (isHero || variant === "header"
                      ? "bg-white/12 text-white"
                      : "bg-crimson-soft text-crimson"),
                )}
              >
                {item.native}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
