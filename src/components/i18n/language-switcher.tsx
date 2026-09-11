"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Globe } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { LOCALES } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

const MENU_ESTIMATE_PX = 96;

export function LanguageSwitcher({
  variant = "hero",
}: {
  variant?: "hero" | "header" | "header-solid";
}) {
  const { locale, setLocale, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const current = LOCALES.find((item) => item.id === locale) ?? LOCALES[0];

  const isHero = variant === "hero";
  const isSolid = variant === "header-solid";
  const alignRight = !isHero;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setMenuStyle(null);
      return;
    }

    const update = () => {
      const r = buttonRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.max(r.width, isHero ? r.width : 144);
      const spaceBelow = window.innerHeight - r.bottom;
      const openUp = spaceBelow < MENU_ESTIMATE_PX + 12 && r.top > spaceBelow;
      const top = openUp ? Math.max(8, r.top - MENU_ESTIMATE_PX - 6) : r.bottom + 6;

      setMenuStyle({
        position: "fixed",
        top,
        ...(alignRight
          ? { right: Math.max(8, window.innerWidth - r.right), left: "auto" }
          : { left: r.left, right: "auto" }),
        minWidth: width,
        zIndex: 200,
      });
    };

    update();
    // Re-measure after paint once menu height is known
    const raf = window.requestAnimationFrame(() => {
      const menu = menuRef.current;
      const r = buttonRef.current?.getBoundingClientRect();
      if (!menu || !r) return;
      const height = menu.getBoundingClientRect().height;
      const spaceBelow = window.innerHeight - r.bottom;
      const openUp = spaceBelow < height + 12 && r.top > spaceBelow;
      setMenuStyle((prev) =>
        prev
          ? {
              ...prev,
              top: openUp
                ? Math.max(8, r.top - height - 6)
                : r.bottom + 6,
            }
          : prev,
      );
    });

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, alignRight, isHero]);

  const menu =
    open && mounted && menuStyle
      ? createPortal(
          <ul
            ref={menuRef}
            id="language-switcher-menu"
            role="listbox"
            style={menuStyle}
            className={cn(
              "overflow-hidden rounded-xl py-1 shadow-[0_16px_40px_-18px_rgba(0,0,0,0.65)]",
              isHero || variant === "header"
                ? "border border-white/15 bg-[#1c0d14]/95 backdrop-blur-md"
                : "border border-line bg-white shadow-lg",
              isHero ? "rounded-md" : "",
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
          </ul>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={cn("relative", isHero ? "inline-block" : "", open && "z-50")}
    >
      <button
        ref={buttonRef}
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
      {menu}
    </div>
  );
}
