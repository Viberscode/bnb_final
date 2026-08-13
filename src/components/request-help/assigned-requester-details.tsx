"use client";

import { useEffect } from "react";
import { Check, MapPin, Phone, X } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { neededBloodGroups, totalUnits } from "@/lib/blood-compatibility";
import { formatCountdown, remainingMs } from "@/lib/donor-assignment";
import { formatDistance } from "@/lib/geo";
import { VoiceNotePlayer } from "@/components/request-help/voice-note-player";
import type { BloodRequest } from "@/types";

export function AssignedRequesterDetails({
  request,
  onClose,
  onAccept,
  onDecline,
}: {
  request: BloodRequest;
  onClose: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
}) {
  const { t } = useLanguage();
  const assignment = request.assignment;
  const wait = remainingMs(assignment);
  const pending = assignment?.status === "pending" && Boolean(assignment.donorId);
  const groups = neededBloodGroups(request).join(" · ");
  const units = totalUnits(request);
  const urgencyLabel =
    request.urgency === "critical"
      ? t("urgency.critical")
      : request.urgency === "urgent"
        ? t("urgency.urgent")
        : t("urgency.planned");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#1c0d14]/65 backdrop-blur-[2px]"
        aria-label={t("match.closeRequester")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="assigned-requester-title"
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[1.75rem] border border-white/40 bg-white p-6 shadow-[0_30px_80px_-24px_rgba(28,13,20,0.55)] sm:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-xl p-2 text-ink-muted hover:bg-black/5 hover:text-ink"
          aria-label={t("match.closeRequester")}
        >
          <X className="size-4" aria-hidden />
        </button>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-crimson">
          {t("match.assignedRequest")}
        </p>
        <h2
          id="assigned-requester-title"
          className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink"
        >
          {request.contactName}
        </h2>
        <p className="mt-1 text-sm font-semibold text-ink-muted">
          {groups} · {request.hospitalName}
          {typeof request.distanceKm === "number"
            ? ` · ${formatDistance(request.distanceKm)}`
            : ""}
        </p>
        <p className="mt-2 text-sm font-semibold text-crimson">
          {t("match.matchAlert")}
        </p>
        {pending ? (
          <p className="mt-1 text-xs font-semibold text-ink-muted">
            {t("match.respondNow")}
          </p>
        ) : null}

        <dl className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {[
            [t("profile.phone"), request.phone || t("live.notShared")],
            [t("live.hospital"), request.hospitalName],
            [t("match.location"), request.hospitalArea],
            [t("live.bloodGroup"), groups],
            [
              t("live.unitsNeeded"),
              `${units} ${units > 1 ? t("live.units") : t("live.unit")}`,
            ],
            [t("live.status"), `${urgencyLabel} · ${request.status.replaceAll("_", " ")}`],
            [
              t("live.people"),
              String(request.patientsCount ?? 1),
            ],
            pending
              ? [t("match.donorTimer"), formatCountdown(wait)]
              : [t("match.accepted"), t("match.searchFound")],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-line bg-paper/70 px-3.5 py-2.5"
            >
              <dt className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-ink-muted">
                {label}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        {request.notes ? (
          <p className="mt-3 rounded-xl border border-line bg-paper/70 px-3.5 py-2.5 text-sm font-semibold leading-relaxed text-ink">
            {request.notes}
          </p>
        ) : null}

        {request.voiceNoteUrl ? (
          <div className="mt-3">
            <VoiceNotePlayer src={request.voiceNoteUrl} compact />
          </div>
        ) : null}

        {pending ? (
          <p className="mt-4 text-xs font-bold text-crimson">
            {t("match.respondBy", { time: formatCountdown(wait) })}
          </p>
        ) : null}

        {pending ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onAccept}
              className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-teal px-4 text-sm font-black uppercase tracking-wider text-white"
            >
              <Check className="size-4" aria-hidden />
              {t("match.accept")}
            </button>
            <button
              type="button"
              onClick={onDecline}
              className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-line bg-white px-4 text-sm font-black uppercase tracking-wider text-ink"
            >
              <X className="size-4" aria-hidden />
              {t("match.decline")}
            </button>
          </div>
        ) : null}

        {request.phone ? (
          <a
            href={`tel:${request.phone}`}
            className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#c91833] to-[#8a1024] text-sm font-black uppercase tracking-[0.08em] text-white"
          >
            <Phone className="size-4" aria-hidden />
            {request.phone}
          </a>
        ) : null}

        <p className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-ink-muted">
          <MapPin className="size-3" aria-hidden />
          {request.hospitalArea}
        </p>
      </div>
    </div>
  );
}
