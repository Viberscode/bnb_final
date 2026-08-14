"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Loader2, MapPin } from "lucide-react";
import { AssignedDonorLine } from "@/components/request-help/assigned-donor";
import { BloodGroupMark, UnitsNeededLine } from "@/components/request-help/blood-group-mark";
import { VoiceNotePlayer } from "@/components/request-help/voice-note-player";
import { useLanguage } from "@/components/i18n/language-provider";
import { canShareContactDetails } from "@/lib/donor-assignment";
import { formatDistance } from "@/lib/geo";
import { cn } from "@/lib/utils";
import type { BloodRequest } from "@/types";

export function MyRequestCard({
  request,
  onWatchSearch,
  onViewDonor,
  onConfirmSolved,
  confirming,
}: {
  request: BloodRequest;
  onWatchSearch?: () => void;
  onViewDonor?: () => void;
  onConfirmSolved?: () => void;
  confirming?: boolean;
}) {
  const { t, locale } = useLanguage();
  const created = new Date(request.createdAt).toLocaleString(
    locale === "hi" ? "hi-IN" : "en-IN",
    {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  return (
    <article
      id={`my-request-${request.id}`}
      className="group rounded-2xl border border-line bg-white/90 p-4 transition hover:-translate-y-0.5 hover:border-crimson/25 hover:shadow-[0_14px_32px_-20px_rgba(196,18,47,0.4)]"
    >
      <div className="flex items-start gap-3">
        <BloodGroupMark request={request} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider",
                request.urgency === "critical" && "bg-[#fff1f3] text-[#c4122f]",
                request.urgency === "urgent" && "bg-amber-50 text-amber-800",
                request.urgency === "planned" && "bg-teal-soft text-teal-deep",
              )}
            >
              {request.urgency === "critical"
                ? t("urgency.critical")
                : request.urgency === "urgent"
                  ? t("urgency.urgent")
                  : t("urgency.planned")}
            </span>
            <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-ink-muted">
              {request.status.replaceAll("_", " ")}
            </span>
          </div>
          <h3 className="mt-2 font-display text-lg font-extrabold tracking-tight text-ink">
            {request.hospitalName}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-ink-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {request.hospitalArea}
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            <UnitsNeededLine request={request} />
            {(request.patientsCount ?? 1) > 1
              ? ` · ${request.patientsCount} ${t("live.people")}`
              : ""}{" "}
            · {created}
            {typeof request.distanceKm === "number"
              ? ` · ${formatDistance(request.distanceKm)}`
              : ""}
          </p>
          <AssignedDonorLine
            assignment={request.assignment}
            viewer="requester"
            requestId={request.id}
            onViewDonor={onViewDonor}
          />
          {onWatchSearch && request.assignment?.status !== "accepted" ? (
            <button
              type="button"
              onClick={onWatchSearch}
              className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-crimson hover:underline"
            >
              {t("match.liveMatch")}
            </button>
          ) : null}
          {request.voiceNoteUrl ? (
            <div className="mt-3">
              <VoiceNotePlayer src={request.voiceNoteUrl} compact />
            </div>
          ) : null}
          {onConfirmSolved &&
          canShareContactDetails(request.assignment) &&
          request.status !== "completed" ? (
            <button
              type="button"
              disabled={confirming}
              onClick={onConfirmSolved}
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-black uppercase tracking-[0.12em] text-white hover:bg-emerald-700 disabled:opacity-70"
            >
              {confirming ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Check className="size-4" aria-hidden />
              )}
              {confirming ? t("request.confirming") : t("request.confirmSolved")}
            </button>
          ) : null}
        </div>
        <Link
          href={`/requests?highlight=${request.id}`}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-crimson-soft text-crimson transition hover:bg-crimson hover:text-white"
          aria-label={t("request.openLiveFeed")}
        >
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
