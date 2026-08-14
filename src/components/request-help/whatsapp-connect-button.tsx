"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { cn } from "@/lib/utils";

function WhatsAppMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.72 14.13c-.24.67-1.4 1.24-1.94 1.32-.5.07-1.13.1-1.83-.12-.42-.13-.96-.31-1.66-.61-2.92-1.26-4.82-4.2-4.97-4.39-.14-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.24-.27.64-.39 1.02-.39.12 0 .23 0 .33.01.29.01.44.03.63.49.24.58.82 2.01.89 2.16.07.15.12.32.02.52-.09.2-.14.32-.28.5-.14.17-.3.38-.42.51-.14.14-.28.3-.12.58.16.29.7 1.15 1.5 1.86 1.03.92 1.9 1.21 2.19 1.35.28.13.45.11.62-.07.17-.18.73-.85.93-1.14.2-.29.4-.24.66-.14.27.1 1.7.8 1.99.95.29.15.48.22.55.35.07.13.07.75-.17 1.42z" />
    </svg>
  );
}

export function WhatsAppConnectButton({
  requestId,
  className,
}: {
  requestId: string;
  className?: string;
}) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      const payload = (await response.json()) as {
        chatUrl?: string;
        error?: string;
      };
      if (!response.ok || !payload.chatUrl) {
        throw new Error(payload.error || t("match.whatsappError"));
      }
      window.open(payload.chatUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("match.whatsappError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("w-full", className)}>
      <button
        type="button"
        onClick={() => void connect()}
        disabled={busy}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_12px_24px_-12px_rgba(37,211,102,0.85)] hover:brightness-105 disabled:opacity-70"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <WhatsAppMark className="size-4" />
        )}
        {busy ? t("match.whatsappSending") : t("match.whatsapp")}
      </button>
      {error ? (
        <p className="mt-1.5 text-center text-xs font-semibold text-crimson">
          {error}
        </p>
      ) : null}
    </div>
  );
}
