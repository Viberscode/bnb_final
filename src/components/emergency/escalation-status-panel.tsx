"use client";

import { useEffect, useState } from "react";
import { Loader2, PhoneCall } from "lucide-react";
import type { EscalationPublicStatus } from "@/lib/emergency/types";
import { cn } from "@/lib/utils";

export function EscalationStatusPanel({
  requestId,
  urgency,
  verificationStatus,
}: {
  requestId: string;
  urgency: string;
  verificationStatus?: string;
}) {
  const [status, setStatus] = useState<EscalationPublicStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (urgency !== "critical") return;
    let active = true;
    let timer: number | undefined;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/emergency/status?requestId=${encodeURIComponent(requestId)}`,
          { cache: "no-store", credentials: "include" },
        );
        if (!res.ok) return;
        const body = (await res.json()) as { status?: EscalationPublicStatus | null };
        if (active) setStatus(body.status ?? null);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    timer = window.setInterval(() => void load(), 8000);
    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
    };
  }, [requestId, urgency]);

  if (urgency !== "critical") return null;

  const pendingVerify = verificationStatus === "pending";

  return (
    <div className="mt-4 rounded-2xl border-2 border-[#c4122f]/35 bg-[#fff5f6] p-4">
      <div className="flex items-center gap-2">
        <PhoneCall className="size-4 text-[#c4122f]" aria-hidden />
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8e0c22]">
          Critical emergency
        </p>
        {loading ? (
          <Loader2 className="ml-auto size-4 animate-spin text-[#c4122f]/70" />
        ) : null}
      </div>

      {pendingVerify ? (
        <p className="mt-2 text-sm font-semibold text-ink-muted">
          Waiting for registered NGO/hospital partner verification before voice
          escalation can begin.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm font-bold text-ink">
            Escalation:{" "}
            <span
              className={cn(
                status?.escalationStatus === "active" && "text-[#c4122f]",
                status?.donorFound && "text-emerald-700",
              )}
            >
              {status?.donorFound
                ? "DONOR FOUND"
                : status?.escalationStatus === "active"
                  ? "ACTIVE"
                  : status?.escalationStatus?.toUpperCase() ?? "STANDBY"}
            </span>
          </p>
          {status?.message ? (
            <p className="mt-1 text-sm font-semibold text-emerald-800">
              {status.message}
            </p>
          ) : null}
          <div className="mt-3 grid gap-1 text-xs font-semibold text-ink-muted">
            <p>
              Calls made: {status?.callsMade ?? 0} · Responses:{" "}
              {status?.responses ?? 0}
            </p>
            {(status?.queue ?? []).map((row) => (
              <p key={`${row.donorId}-${row.label}`}>
                {row.label} —{" "}
                {row.state === "calling"
                  ? "Calling..."
                  : row.state === "accepted"
                    ? "Accepted"
                    : row.state === "queued"
                      ? "Queued"
                      : row.state.replaceAll("_", " ")}
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
