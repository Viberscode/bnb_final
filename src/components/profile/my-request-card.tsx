"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { AssignedDonorLine } from "@/components/request-help/assigned-donor";
import { BloodGroupMark, UnitsNeededLine } from "@/components/request-help/blood-group-mark";
import { RequesterConfirmPanel } from "@/components/request-help/requester-confirm-panel";
import { VoiceNotePlayer } from "@/components/request-help/voice-note-player";
import { useLanguage } from "@/components/i18n/language-provider";
import { formatDistance } from "@/lib/geo";
import { cn } from "@/lib/utils";
import type { BloodRequest } from "@/types";

export function MyRequestCard({
  request,
  onWatchSearch,
  onViewDonor,
  onConfirmSolved,
  onWaitMore,
  confirming,
  waiting,
}: {
  request: BloodRequest;
  onWatchSearch?: () => void;
  onViewDonor?: () => void;
  onConfirmSolved?: () => void;
  onWaitMore?: () => void;
  confirming?: boolean;
  waiting?: boolean;
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
          <RequesterConfirmPanel
            request={request}
            confirming={confirming}
            waiting={waiting}
            onAccepted={onConfirmSolved}
            onWaitMore={onWaitMore}
          />
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
