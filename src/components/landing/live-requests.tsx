"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  Droplets,
  MapPin,
  Radio,
} from "lucide-react";
import { URGENCY_OPTIONS } from "@/data/demo";
import {
  fetchLiveRequests,
  subscribeLiveRequests,
  urgencyRank,
} from "@/lib/live-requests";
import { cn } from "@/lib/utils";
import type { BloodRequest, UrgencyLevel } from "@/types";

function timeAgo(iso: string): string {
  const mins = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 60_000),
  );
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function urgencyMeta(urgency: UrgencyLevel) {
  return URGENCY_OPTIONS.find((o) => o.value === urgency)!;
}

function UrgencyBadge({ urgency }: { urgency: UrgencyLevel }) {
  const meta = urgencyMeta(urgency);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider",
        urgency === "critical" && "bg-[#fff1f3] text-[#c4122f]",
        urgency === "urgent" && "bg-amber-50 text-amber-800",
        urgency === "planned" && "bg-teal-soft text-teal-deep",
      )}
    >
      {urgency === "critical" ? (
        <AlertTriangle className="size-3" aria-hidden />
      ) : (
        <Clock3 className="size-3" aria-hidden />
      )}
      {meta.label} · {meta.window}
    </span>
  );
}

function RequestCard({
  request,
  highlighted,
}: {
  request: BloodRequest;
  highlighted?: boolean;
}) {
  return (
    <article
      id={`request-${request.id}`}
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-white p-5 transition duration-300",
        highlighted
          ? "border-crimson shadow-[0_0_0_2px_rgba(196,18,47,0.25)] ring-2 ring-crimson/20"
          : "border-line hover:-translate-y-1 hover:border-crimson/25 hover:shadow-[0_22px_40px_-22px_rgba(20,28,34,0.3)]",
        request.urgency === "critical" && !highlighted && "border-[#ffd0d8]",
      )}
    >
      {request.urgency === "critical" ? (
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#ff2d4a] via-[#c4122f] to-[#ff2d4a]"
          aria-hidden
        />
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22] font-display text-xl font-extrabold text-white shadow-[0_12px_24px_-12px_rgba(196,18,47,0.7)]">
            {request.bloodGroup}
          </span>
          <div>
            <p className="font-display text-lg font-bold tracking-tight text-ink">
              {request.units} unit{request.units > 1 ? "s" : ""} needed
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {timeAgo(request.createdAt)}
              {request.isDemo ? " · demo" : " · your request"}
            </p>
          </div>
        </div>
        <UrgencyBadge urgency={request.urgency} />
      </div>

      <p className="mt-4 flex items-start gap-2 text-sm text-ink">
        <MapPin className="mt-0.5 size-4 shrink-0 text-crimson" aria-hidden />
        <span>
          <span className="font-semibold">{request.hospitalName}</span>
          <span className="mt-0.5 block text-ink-muted">
            {request.hospitalArea}
            {typeof request.distanceKm === "number"
              ? ` · ${request.distanceKm.toFixed(1)} km`
              : ""}
          </span>
        </span>
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm">
        <span className="text-ink-muted">
          Contact:{" "}
          <span className="font-semibold text-ink">{request.contactName}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-emerald-700">
          <Radio className="size-3 animate-pulse" aria-hidden />
          Live · {request.status.replace("_", " ")}
        </span>
      </div>
    </article>
  );
}

interface LiveRequestsProps {
  /** Limit cards on homepage preview; omit for full feed. */
  limit?: number;
  highlightId?: string | null;
  showHeaderCta?: boolean;
}

export function LiveRequests({
  limit,
  highlightId = null,
  showHeaderCta = true,
}: LiveRequestsProps) {
  const [requests, setRequests] = useState<BloodRequest[]>([]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const rows = await fetchLiveRequests();
      if (active) setRequests(rows);
    };
    void refresh();
    const unsubscribe = subscribeLiveRequests(() => {
      void refresh();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const sorted = useMemo(() => {
    return [...requests].sort((a, b) => {
      const urg = urgencyRank(a.urgency) - urgencyRank(b.urgency);
      if (urg !== 0) return urg;
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  }, [requests]);

  const visible = typeof limit === "number" ? sorted.slice(0, limit) : sorted;
  const criticalCount = sorted.filter((r) => r.urgency === "critical").length;

  return (
    <section
      id="live-requests"
      className="scroll-mt-20 bg-paper-atmosphere px-5 py-16 sm:px-8 sm:py-20"
      aria-labelledby="live-requests-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-crimson">
              <Droplets className="size-4" aria-hidden />
              Live requests
            </p>
            <h2
              id="live-requests-heading"
              className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-5xl"
            >
              Open blood needs{" "}
              <span className="text-crimson">right now</span>
            </h2>
            <p className="mt-3 text-ink-muted sm:text-lg">
              Requests submitted from Request Help appear here instantly.
              Critical needs float to the top.
              {criticalCount > 0
                ? ` ${criticalCount} critical open.`
                : null}
            </p>
          </div>

          {showHeaderCta ? (
            <div className="flex flex-wrap gap-3">
              <Link
                href="/request-help"
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-crimson px-5 text-sm font-bold text-white hover:bg-crimson-deep"
              >
                Raise a request
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
              {typeof limit === "number" ? (
                <Link
                  href="/requests"
                  className="inline-flex h-12 items-center rounded-2xl border border-line bg-white px-5 text-sm font-bold text-ink hover:bg-black/[0.02]"
                >
                  View all
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              highlighted={highlightId === request.id}
            />
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-dashed border-line bg-white/70 px-6 py-12 text-center text-ink-muted">
            No live requests yet. Be the first to{" "}
            <Link
              href="/request-help"
              className="font-semibold text-crimson underline-offset-2 hover:underline"
            >
              request help
            </Link>
            .
          </p>
        ) : null}
      </div>
    </section>
  );
}
