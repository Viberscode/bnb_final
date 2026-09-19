"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCheck,
  Clock3,
  FileText,
  MapPin,
  Mic,
  Phone,
  Radio,
  X,
} from "lucide-react";
import { BloodGroupMark, UnitsNeededLine } from "@/components/request-help/blood-group-mark";
import { VoiceNotePlayer } from "@/components/request-help/voice-note-player";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage, type MessagePath } from "@/components/i18n/language-provider";
import { AssignedDonorLine } from "@/components/request-help/assigned-donor";
import { AssignedDonorDetails } from "@/components/request-help/assigned-donor-details";
import { AssignedRequesterDetails } from "@/components/request-help/assigned-requester-details";
import { ContactPhone } from "@/components/request-help/contact-phone";
import { RequesterConfirmPanel } from "@/components/request-help/requester-confirm-panel";
import { WhatsAppConnectButton } from "@/components/request-help/whatsapp-connect-button";
import { useAssignmentEngine } from "@/hooks/use-assignment-engine";
import { neededBloodGroups, totalUnits, unitsByGroup } from "@/lib/blood-compatibility";
import { formatDistance, distanceKm, resolveHospitalCoords } from "@/lib/geo";
import { DEMO_HOSPITALS } from "@/data/demo";
import { useDonorLiveCoords } from "@/hooks/use-donor-live-coords";
import {
  canShareContactDetails,
  canViewAssignedDonor,
  donorDistanceKm,
  isAssignedDonor,
  isOwnDonor,
  offerAssignmentToDonor,
  rankRequestsForDonor,
  respondToAssignment,
  waitForAnotherDonor,
  startAssignmentForRequest,
  withAssignments,
} from "@/lib/donor-assignment";
import {
  fetchAvailableDonorsPage,
  fetchDonorProfile,
} from "@/lib/donor-profile";
import {
  completeLiveRequest,
  fetchLiveRequestsPage,
  subscribeLiveRequests,
  urgencyRank,
} from "@/lib/live-requests";
import { LIVE_REQUEST_PAGE_SIZE, MATCH_DONOR_LIMIT, mergeUniqueById } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import type { BloodRequest, DonorProfile, UrgencyLevel } from "@/types";

function timeAgo(
  iso: string,
  t: (path: MessagePath, vars?: Record<string, string | number>) => string,
): string {
  const mins = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 60_000),
  );
  if (mins < 1) return t("live.justNow");
  if (mins < 60) return t("live.minAgo", { n: mins });
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return t("live.hAgo", { n: hrs });
  return t("live.dAgo", { n: Math.round(hrs / 24) });
}

function UrgencyBadge({ urgency }: { urgency: UrgencyLevel }) {
  const { t } = useLanguage();
  const label =
    urgency === "critical"
      ? t("urgency.critical")
      : urgency === "urgent"
        ? t("urgency.urgent")
        : t("urgency.planned");
  const window =
    urgency === "critical"
      ? t("urgency.criticalWindow")
      : urgency === "urgent"
        ? t("urgency.urgentWindow")
        : t("urgency.plannedWindow");
  return (
    <span
      className={cn(
        "live-urgency-badge inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.1em] text-white ring-1",
        urgency === "critical" &&
          "bg-[#c4122f] ring-[#ff8a9a] shadow-[0_6px_16px_-8px_rgba(196,18,47,0.9)]",
        urgency === "urgent" &&
          "bg-amber-500 ring-amber-200 shadow-[0_6px_16px_-8px_rgba(217,119,6,0.85)]",
        urgency === "planned" &&
          "bg-teal ring-teal/35 shadow-[0_6px_16px_-8px_rgba(13,115,112,0.7)]",
      )}
    >
      {urgency === "critical" ? (
        <AlertTriangle className="size-3.5" aria-hidden />
      ) : urgency === "urgent" ? (
        <Clock3 className="size-3.5" aria-hidden />
      ) : (
        <Radio className="size-3.5" aria-hidden />
      )}
      {label}
      <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[0.58rem] font-black tracking-wide">
        {window}
      </span>
    </span>
  );
}

function RequestCard({
  request,
  highlighted,
  isMine,
  canOpen,
  confirming,
  waiting,
  distanceLabel,
  onOpen,
  onAccepted,
  onWaitMore,
  onViewDonor,
}: {
  request: BloodRequest;
  highlighted?: boolean;
  isMine?: boolean;
  canOpen?: boolean;
  confirming?: boolean;
  waiting?: boolean;
  distanceLabel?: string | null;
  onOpen?: () => void;
  onAccepted?: () => void;
  onWaitMore?: () => void;
  onViewDonor?: () => void;
}) {
  const { t } = useLanguage();
  const done = request.status === "completed";
  const patients = request.patientsCount ?? 1;
  const donorAccepted =
    !done &&
    (request.assignment?.status === "accepted" ||
      request.status === "donor_accepted");
  const shownDistance =
    distanceLabel ??
    (typeof request.distanceKm === "number"
      ? formatDistance(request.distanceKm)
      : null);

  return (
    <article
      id={`request-${request.id}`}
      className={cn(
        "group relative overflow-hidden rounded-[1.35rem] border bg-white p-3.5 text-left shadow-[0_16px_36px_-26px_rgba(28,13,20,0.42)] transition duration-300",
        done && "border-emerald-200 bg-emerald-50/80 opacity-80 grayscale-[0.2]",
        !done &&
          highlighted &&
          "border-crimson/70 shadow-[0_16px_36px_-22px_rgba(196,18,47,0.45)] ring-2 ring-crimson/15",
        !done &&
          !highlighted &&
          request.urgency === "critical" &&
          "live-request-card--critical border-[#ffb3bf] bg-gradient-to-br from-white via-[#fff8f9] to-white",
        !done &&
          !highlighted &&
          request.urgency === "urgent" &&
          "live-request-card--urgent border-amber-200 bg-gradient-to-br from-white via-[#fffaf3] to-white",
        !done &&
          !highlighted &&
          request.urgency === "planned" &&
          "live-request-card--planned border-teal/25 bg-gradient-to-br from-white via-[#f7fcfb] to-white",
        canOpen &&
          !done &&
          "cursor-pointer hover:-translate-y-1 hover:shadow-[0_20px_40px_-22px_rgba(28,13,20,0.5)]",
      )}
      role={canOpen && !done ? "button" : undefined}
      tabIndex={canOpen && !done ? 0 : undefined}
      onClick={canOpen && !done ? onOpen : undefined}
      onKeyDown={
        canOpen && !done
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen?.();
              }
            }
          : undefined
      }
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-1.5",
          done && "bg-emerald-500",
          !done && request.urgency === "critical" && "bg-[#c4122f]",
          !done && request.urgency === "urgent" && "bg-amber-500",
          !done && request.urgency === "planned" && "bg-teal",
        )}
        aria-hidden
      />

      {done ? (
        <span className="mb-2 flex items-center justify-center rounded-xl bg-emerald-600 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-white">
          {t("live.done")}
        </span>
      ) : (
        <div className="mb-2.5 flex items-center justify-between gap-2 pl-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-wider text-white",
              donorAccepted
                ? "live-accepted-badge bg-sky-600"
                : "live-matching-badge bg-emerald-500",
            )}
          >
            <Radio className="size-3" aria-hidden />
            {donorAccepted
              ? `${t("live.liveStatus")} · ${t("live.donorAccepted")}`
              : `${t("live.liveStatus")} · ${t("live.matching")}`}
          </span>
          {isMine || donorAccepted ? (
            <span className="inline-flex shrink-0 items-center gap-1.5">
              {isMine ? (
                <span className="rounded-full bg-ink px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-[0.14em] text-white">
                  {t("live.yours")}
                </span>
              ) : null}
              {donorAccepted ? (
                <span
                  className="inline-flex size-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 ring-1 ring-emerald-200"
                  title={t("live.donorAccepted")}
                  aria-label={t("live.donorAccepted")}
                >
                  <CheckCheck className="size-4" strokeWidth={2.6} aria-hidden />
                </span>
              ) : null}
            </span>
          ) : null}
        </div>
      )}

      <div className="flex min-w-0 items-center gap-2.5 pl-2">
        <BloodGroupMark request={request} />
        <div className="min-w-0">
          <p className="font-display text-lg font-extrabold leading-tight tracking-tight text-ink">
            <UnitsNeededLine request={request} />
          </p>
          <p className="mt-0.5 text-xs font-semibold text-ink-muted">
            {patients > 1 ? `${patients} ${t("live.people")} · ` : ""}
            {timeAgo(request.createdAt, t)}
          </p>
        </div>
      </div>

      <div className="mt-2.5 pl-2">
        <UrgencyBadge urgency={request.urgency} />
      </div>

      <div className="ml-2 mt-2.5 rounded-xl border border-black/[0.04] bg-white/80 px-3 py-2.5">
        <p className="text-[0.6rem] font-black uppercase tracking-[0.16em] text-ink-muted">
          {t("live.hospital")}
        </p>
        <p className="mt-1 flex items-start gap-2 text-ink">
          <MapPin
            className={cn(
              "mt-0.5 size-4 shrink-0",
              request.urgency === "critical" && "text-crimson",
              request.urgency === "urgent" && "text-amber-600",
              request.urgency === "planned" && "text-teal",
            )}
            aria-hidden
          />
          <span className="min-w-0">
            <span className="block font-display text-[0.95rem] font-extrabold leading-snug tracking-tight">
              {request.hospitalName}
            </span>
            <span className="mt-0.5 block text-xs font-semibold text-ink-muted">
              {request.hospitalArea}
            </span>
            {shownDistance ? (
              <span className="mt-0.5 block text-xs font-bold text-ink">
                {shownDistance}
              </span>
            ) : null}
          </span>
        </p>
        {request.voiceNoteUrl ? (
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-crimson-soft px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-wider text-crimson">
            <Mic className="size-3" aria-hidden />
            {t("live.voiceNote")}
          </span>
        ) : null}
      </div>
      <div className="ml-2">
        <AssignedDonorLine
          assignment={request.assignment}
          viewer={isMine && !done ? "requester" : "public"}
          requestId={isMine && !done ? request.id : undefined}
          onViewDonor={isMine && !done ? onViewDonor : undefined}
        />
        {isMine && !done ? (
          <RequesterConfirmPanel
            request={request}
            confirming={confirming}
            waiting={waiting}
            onAccepted={onAccepted}
            onWaitMore={onWaitMore}
          />
        ) : null}
      </div>
      {canOpen && !done ? (
        <p className="ml-2 mt-3 text-xs font-bold uppercase tracking-[0.12em] text-crimson">
          {t("live.openNeed")}
        </p>
      ) : null}
    </article>
  );
}

function RequestDetailModal({
  request,
  donorId,
  donorCoords,
  onClose,
  onRespond,
}: {
  request: BloodRequest;
  donorId?: string;
  donorCoords?: { lat?: number; lng?: number } | null;
  onClose: () => void;
  onRespond?: (action: "accept" | "decline") => void;
}) {
  const { t } = useLanguage();
  const { coords: from } = useDonorLiveCoords(donorCoords);
  const breakdown = unitsByGroup(request);
  const unitsTotal = totalUnits(request);
  const assignedToViewer = isAssignedDonor(request, donorId);
  const revealContact =
    assignedToViewer && canShareContactDetails(request.assignment);
  const windowLabel =
    request.urgency === "critical"
      ? t("urgency.criticalWindow")
      : request.urgency === "urgent"
        ? t("urgency.urgentWindow")
        : t("urgency.plannedWindow");

  const hospital = useMemo(
    () =>
      resolveHospitalCoords({
        hospitalId: request.hospitalId,
        hospitalLat: request.hospitalLat,
        hospitalLng: request.hospitalLng,
        hospitals: DEMO_HOSPITALS,
      }),
    [request.hospitalId, request.hospitalLat, request.hospitalLng],
  );

  const liveDistanceLabel = useMemo(() => {
    if (from && hospital) {
      return formatDistance(
        distanceKm(from.lat, from.lng, hospital.lat, hospital.lng),
      );
    }
    if (donorCoords && typeof request.assignment?.distanceKm === "number") {
      return formatDistance(request.assignment.distanceKm);
    }
    if (typeof request.distanceKm === "number") {
      return formatDistance(request.distanceKm);
    }
    return null;
  }, [
    from?.lat,
    from?.lng,
    hospital?.lat,
    hospital?.lng,
    donorCoords,
    request.assignment?.distanceKm,
    request.distanceKm,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#1c0d14]/60 backdrop-blur-[2px]"
        aria-label={t("live.closeDetails")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-detail-title"
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] border border-white/50 bg-white p-5 shadow-[0_30px_80px_-24px_rgba(28,13,20,0.5)] sm:p-6"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-xl p-2 text-ink-muted hover:bg-black/5 hover:text-ink"
          aria-label={t("live.close")}
        >
          <X className="size-4" aria-hidden />
        </button>

        <p className="text-xs font-black uppercase tracking-[0.18em] text-crimson">
          {revealContact ? t("live.requesterDetails") : t("live.needDetails")}
        </p>
        <h2
          id="request-detail-title"
          className="mt-2 font-display text-3xl font-black tracking-tight text-ink"
        >
          {revealContact ? request.contactName : request.hospitalName}
        </h2>
        <p className="mt-1 text-sm font-semibold text-ink-muted">
          {t("live.posted")} {timeAgo(request.createdAt, t)}
        </p>
        {!revealContact ? (
          <p className="mt-2 text-xs font-semibold text-ink-muted">
            {t("live.contactAfterMatch")}
          </p>
        ) : null}
        <div className="mt-2.5">
          <UrgencyBadge urgency={request.urgency} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border-2 border-crimson/30 bg-gradient-to-br from-[#fff1f3] to-white px-4 py-4 text-center shadow-[0_12px_28px_-16px_rgba(196,18,47,0.45)]">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-crimson">
              {neededBloodGroups(request).length > 1
                ? t("live.bloodGroups")
                : t("live.bloodGroup")}
            </p>
            <div className="mt-2 flex justify-center">
              <BloodGroupMark request={request} size="sm" />
            </div>
            {(request.patientsCount ?? 1) > 1 ? (
              <p className="mt-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
                {request.patientsCount} {t("live.people")}
              </p>
            ) : null}
          </div>
          <div className="rounded-2xl border-2 border-crimson/30 bg-gradient-to-br from-[#fff1f3] to-white px-4 py-4 text-center shadow-[0_12px_28px_-16px_rgba(196,18,47,0.45)]">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-crimson">
              {t("live.unitsNeeded")}
            </p>
            {breakdown.length > 1 ? (
              <ul className="mt-2 space-y-1.5 text-left">
                {breakdown.map((item) => (
                  <li
                    key={item.group}
                    className="flex items-center justify-between gap-2 text-sm font-bold text-ink"
                  >
                    <span>{item.group}</span>
                    <span className="font-display text-lg font-black text-crimson">
                      {item.units}
                    </span>
                  </li>
                ))}
                <li className="flex items-center justify-between border-t border-crimson/20 pt-1.5 text-xs font-black uppercase tracking-wider text-ink-muted">
                  {t("live.total")}
                  <span className="font-display text-base text-crimson">
                    {unitsTotal}
                  </span>
                </li>
              </ul>
            ) : (
              <>
                <p className="mt-2 font-display text-4xl font-black tracking-tight text-crimson">
                  {unitsTotal}
                </p>
                <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  {unitsTotal > 1 ? t("live.units") : t("live.unit")}
                </p>
              </>
            )}
          </div>
        </div>

        <dl className="mt-4 grid gap-3">
          <div className="rounded-2xl border border-line bg-paper/60 px-4 py-3">
            <dt className="flex items-center gap-1.5 text-[0.65rem] font-black uppercase tracking-[0.14em] text-ink-muted">
              <Phone className="size-3.5" aria-hidden />
              {t("live.phone")}
            </dt>
            <dd className="mt-1">
              {revealContact && request.phone ? (
                <ContactPhone
                  phone={request.phone}
                  revealed
                  className="font-display text-lg font-extrabold text-crimson"
                />
              ) : (
                <ContactPhone
                  phone={request.phone}
                  revealed={false}
                  className="font-display text-lg font-extrabold text-ink"
                />
              )}
            </dd>
          </div>

          <div className="rounded-2xl border border-line bg-paper/60 px-4 py-3">
            <dt className="flex items-center gap-1.5 text-[0.65rem] font-black uppercase tracking-[0.14em] text-ink-muted">
              <MapPin className="size-3.5" aria-hidden />
              {t("live.hospital")}
            </dt>
            <dd className="mt-1 font-display text-lg font-extrabold text-ink">
              {request.hospitalName}
            </dd>
            <dd className="mt-0.5 text-sm font-semibold text-ink-muted">
              {request.hospitalArea}
              {liveDistanceLabel ? ` · ${liveDistanceLabel}` : ""}
            </dd>
          </div>

          <div className="rounded-2xl border border-line bg-paper/60 px-4 py-3">
            <dt className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-ink-muted">
              {t("live.status")}
            </dt>
            <dd className="mt-1 font-semibold capitalize text-ink">
              {request.status.replaceAll("_", " ")} · {windowLabel}
            </dd>
          </div>

          {request.notes ? (
            <div className="rounded-2xl border border-line bg-paper/60 px-4 py-3">
              <dt className="flex items-center gap-1.5 text-[0.65rem] font-black uppercase tracking-[0.14em] text-ink-muted">
                <FileText className="size-3.5" aria-hidden />
                {t("live.notes")}
              </dt>
              <dd className="mt-1 text-sm font-semibold leading-relaxed text-ink">
                {request.notes}
              </dd>
            </div>
          ) : null}

          {request.voiceNoteUrl ? (
            <VoiceNotePlayer src={request.voiceNoteUrl} />
          ) : null}

          {assignedToViewer ? (
            <div className="rounded-2xl border border-teal/25 bg-teal-soft/40 px-4 py-3">
              <AssignedDonorLine
                assignment={request.assignment}
                viewer="donor"
                youAreAssigned
                onAccept={() => onRespond?.("accept")}
                onDecline={() => onRespond?.("decline")}
              />
            </div>
          ) : null}
        </dl>

        {revealContact && request.phone ? (
          <>
            <a
              href={`tel:${request.phone}`}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#c91833] to-[#8a1024] text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_14px_28px_-12px_rgba(196,18,47,0.7)]"
            >
              <Phone className="size-4" aria-hidden />
              {t("live.callRequester")}
            </a>
            <WhatsAppConnectButton requestId={request.id} className="mt-2" />
          </>
        ) : null}
      </div>
    </div>
  );
}

interface LiveRequestsProps {
  /** Limit cards on homepage preview; omit for full feed. */
  limit?: number;
  highlightId?: string | null;
  showHeaderCta?: boolean;
  showAll?: boolean;
}

export function LiveRequests({
  limit,
  highlightId = null,
  showHeaderCta = true,
  showAll = false,
}: LiveRequestsProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [donors, setDonors] = useState<DonorProfile[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [donor, setDonor] = useState<DonorProfile | null>(null);
  const [openRequest, setOpenRequest] = useState<BloodRequest | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [waitingId, setWaitingId] = useState<string | null>(null);
  const [donorDetails, setDonorDetails] = useState<BloodRequest | null>(null);
  const { coords: liveDonorCoords } = useDonorLiveCoords(donor);
  const liveDonor = useMemo(() => {
    if (!donor) return null;
    if (!liveDonorCoords) return donor;
    return {
      ...donor,
      lat: liveDonorCoords.lat,
      lng: liveDonorCoords.lng,
    };
  }, [donor, liveDonorCoords?.lat, liveDonorCoords?.lng]);
  const pool =
    liveDonor && !donors.some((item) => item.id === liveDonor.id)
      ? [...donors, liveDonor]
      : liveDonor
        ? donors.map((item) =>
            item.id === liveDonor.id ? liveDonor : item,
          )
        : donors;
  const now = useAssignmentEngine(requests, pool, { allowCreate: false });

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const [page, profile, donorPage] = await Promise.all([
        fetchLiveRequestsPage(0, LIVE_REQUEST_PAGE_SIZE),
        fetchDonorProfile(user?.id),
        fetchAvailableDonorsPage(0, MATCH_DONOR_LIMIT),
      ]);
      if (!active) return;
      setRequests(page.items);
      setHasMore(page.hasMore);
      setDonor(profile);
      setDonors(donorPage.items);
    };
    void refresh();
    const unsubscribe = subscribeLiveRequests(() => {
      void refresh();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user?.id]);

  const filterToMatches = Boolean(liveDonor && !showAll);

  const sorted = useMemo(() => {
    let list = withAssignments(requests, pool, { allowCreate: false });
    if (filterToMatches && liveDonor) {
      const ranked = rankRequestsForDonor(list, liveDonor);
      if (highlightId && !ranked.some((item) => item.id === highlightId)) {
        const extra = list.find((item) => item.id === highlightId);
        return extra ? [extra, ...ranked] : ranked;
      }
      return ranked;
    }
    return list.sort((a, b) => {
      const urg = urgencyRank(a.urgency) - urgencyRank(b.urgency);
      if (urg !== 0) return urg;
      const dist = (a.distanceKm ?? 99) - (b.distanceKm ?? 99);
      if (dist !== 0) return dist;
      return (
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
  }, [requests, pool, filterToMatches, liveDonor, highlightId, now]);

  const visible = typeof limit === "number" ? sorted.slice(0, limit) : sorted;

  return (
    <section
      id="live-requests"
      className="scroll-mt-20 bg-paper-atmosphere px-5 py-6 sm:px-8 sm:py-8"
      aria-labelledby="live-requests-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2
            id="live-requests-heading"
            className="inline-flex items-center gap-3 font-display text-[clamp(1.7rem,4vw,2.6rem)] font-black uppercase tracking-[-0.04em] text-ink"
          >
            <span
              className={cn(
                "relative inline-flex size-11 shrink-0 items-center justify-center rounded-2xl text-white sm:size-12",
                filterToMatches
                  ? "bg-gradient-to-br from-teal to-teal-deep shadow-[0_12px_24px_-10px_rgba(13,115,112,0.75)]"
                  : "bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22] shadow-[0_12px_24px_-10px_rgba(196,18,47,0.8)]",
              )}
            >
              <Radio className="size-5 animate-pulse" aria-hidden />
              <span
                className={cn(
                  "absolute inset-0 rounded-2xl ring-2",
                  filterToMatches
                    ? "ring-teal/40"
                    : "ring-[#ff2d4a]/50 animate-emergency-pulse",
                )}
                aria-hidden
              />
            </span>
            <span>
              {filterToMatches ? (
                <>
                  {t("live.your")}{" "}
                  <span className="request-heading-live bg-gradient-to-r from-[#0d7370] via-[#14b8a6] to-[#0f766e] bg-clip-text text-transparent">
                    {t("live.matches")}
                  </span>
                </>
              ) : (
                <>
                  {t("live.liveWord")}{" "}
                  <span className="request-heading-live bg-gradient-to-r from-[#9f1239] via-[#ff2d4a] to-[#c4122f] bg-clip-text text-transparent">
                    {t("live.requestWord")}
                  </span>
                </>
              )}{" "}
              <span className="align-middle text-[0.55em] font-bold normal-case tracking-normal text-ink-muted sm:text-[0.5em]">
                {t("live.past24h")}
              </span>
            </span>
          </h2>

          {showHeaderCta ? (
            <div className="flex flex-wrap items-center gap-3">
              {donor && filterToMatches ? (
                <p className="nav-chip !cursor-default text-xs font-black uppercase tracking-[0.12em]">
                  {t("live.matchingGroup", { group: donor.bloodGroup })}
                </p>
              ) : null}
              {donor ? (
                showAll ? (
                  <Link
                    href="/requests"
                    className="inline-flex h-12 items-center gap-2 rounded-2xl border border-line bg-white px-5 text-sm font-black uppercase tracking-[0.08em] text-ink hover:bg-black/[0.02]"
                  >
                    {t("live.matchingOnly")}
                  </Link>
                ) : (
                  <Link
                    href="/requests?all=1"
                    className="live-raise-cta animate-light-sweep group relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#c91833] via-[#e11d48] to-[#8a1024] px-6 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_16px_32px_-12px_rgba(201,24,51,0.85)] ring-1 ring-white/25"
                  >
                    {t("live.seeAll")}
                    <ArrowUpRight
                      className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden
                    />
                  </Link>
                )
              ) : (
                <Link
                  href="/request-help"
                  className="live-raise-cta animate-light-sweep group relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#c91833] via-[#e11d48] to-[#8a1024] px-6 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_16px_32px_-12px_rgba(201,24,51,0.85)] ring-1 ring-white/25"
                >
                  {t("live.raise")}
                  <ArrowUpRight
                    className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden
                  />
                </Link>
              )}
              {typeof limit === "number" ? (
                <Link
                  href="/requests"
                  className="inline-flex h-12 items-center rounded-2xl border border-line bg-white px-5 text-sm font-bold text-ink hover:bg-black/[0.02]"
                >
                  {t("live.viewAll")}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              highlighted={highlightId === request.id}
              isMine={Boolean(user?.id && request.userId === user.id)}
              canOpen={Boolean(liveDonor && !isOwnDonor(request, liveDonor))}
              confirming={confirmingId === request.id}
              waiting={waitingId === request.id}
              distanceLabel={
                liveDonor
                  ? formatDistance(donorDistanceKm(liveDonor, request))
                  : null
              }
              onOpen={() => {
                if (liveDonor && !isOwnDonor(request, liveDonor)) {
                  const offered = offerAssignmentToDonor(request, liveDonor);
                  setRequests((prev) =>
                    prev.map((item) =>
                      item.id === offered.id
                        ? {
                            ...item,
                            assignment: offered.assignment,
                            status: offered.status,
                          }
                        : item,
                    ),
                  );
                  setOpenRequest(offered);
                  return;
                }
                setOpenRequest(request);
              }}
              onAccepted={
                user?.id && request.userId === user.id
                  ? () => {
                      setConfirmingId(request.id);
                      void completeLiveRequest(request.id)
                        .then(() => fetchLiveRequestsPage(0, LIVE_REQUEST_PAGE_SIZE))
                        .then((page) => {
                          setRequests(page.items);
                          setHasMore(page.hasMore);
                        })
                        .finally(() => setConfirmingId(null));
                    }
                  : undefined
              }
              onWaitMore={
                user?.id && request.userId === user.id
                  ? () => {
                      setWaitingId(request.id);
                      void waitForAnotherDonor(request.id)
                        .then(() => startAssignmentForRequest(request, pool))
                        .then(() => fetchLiveRequestsPage(0, LIVE_REQUEST_PAGE_SIZE))
                        .then((page) => {
                          setRequests(page.items);
                          setHasMore(page.hasMore);
                        })
                        .finally(() => setWaitingId(null));
                    }
                  : undefined
              }
              onViewDonor={
                user?.id &&
                request.userId === user.id &&
                canViewAssignedDonor(request, request.assignment, user.id)
                  ? () => setDonorDetails(request)
                  : undefined
              }
            />
          ))}
        </div>

        {typeof limit !== "number" && hasMore ? (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => {
                setLoadingMore(true);
                void fetchLiveRequestsPage(requests.length, LIVE_REQUEST_PAGE_SIZE)
                  .then((page) => {
                    setRequests((prev) => mergeUniqueById(prev, page.items));
                    setHasMore(page.hasMore);
                  })
                  .finally(() => setLoadingMore(false));
              }}
              className="inline-flex h-11 items-center rounded-2xl border border-line bg-white px-5 text-sm font-bold text-ink hover:bg-black/[0.02] disabled:opacity-60"
            >
              {loadingMore ? t("live.loadingMore") : t("live.loadMore")}
            </button>
          </div>
        ) : null}

        {visible.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-line bg-white/70 px-6 py-12 text-center text-ink-muted">
            {filterToMatches ? (
              <>
                {t("live.noMatches", { group: donor?.bloodGroup ?? "" })}{" "}
                <Link
                  href="/requests?all=1"
                  className="font-semibold text-crimson underline-offset-2 hover:underline"
                >
                  {t("live.seeAll")}
                </Link>
                .
              </>
            ) : (
              <>
                {t("live.noLive")}{" "}
                <Link
                  href="/request-help"
                  className="font-semibold text-crimson underline-offset-2 hover:underline"
                >
                  {t("live.requestHelp")}
                </Link>
                .
              </>
            )}
          </p>
        ) : null}
      </div>
      {donor && openRequest ? (
        isAssignedDonor(
          sorted.find((item) => item.id === openRequest.id) ?? openRequest,
          donor.id,
        ) ? (
          <AssignedRequesterDetails
            request={
              sorted.find((item) => item.id === openRequest.id) ?? openRequest
            }
            donorCoords={liveDonor}
            onClose={() => setOpenRequest(null)}
            onAccept={() => {
              void respondToAssignment(
                openRequest.id,
                donor.id,
                "accept",
                openRequest.userId,
              ).then(() => fetchLiveRequestsPage(0, LIVE_REQUEST_PAGE_SIZE)).then((page) => {
                setRequests(page.items);
                setHasMore(page.hasMore);
              });
            }}
            onDecline={() => {
              setOpenRequest(null);
              void respondToAssignment(
                openRequest.id,
                donor.id,
                "decline",
                openRequest.userId,
              ).then(() => fetchLiveRequestsPage(0, LIVE_REQUEST_PAGE_SIZE)).then((page) => {
                setRequests(page.items);
                setHasMore(page.hasMore);
              });
            }}
          />
        ) : (
          <RequestDetailModal
            request={
              sorted.find((item) => item.id === openRequest.id) ?? openRequest
            }
            donorId={donor.id}
            donorCoords={liveDonor}
            onClose={() => setOpenRequest(null)}
            onRespond={(action) => {
              void respondToAssignment(
                openRequest.id,
                donor.id,
                action,
                openRequest.userId,
              );
            }}
          />
        )
      ) : null}
      {donorDetails?.assignment?.donorId ? (
        <AssignedDonorDetails
          assignment={
            (sorted.find((item) => item.id === donorDetails.id) ?? donorDetails)
              .assignment!
          }
          requestId={donorDetails.id}
          onClose={() => setDonorDetails(null)}
        />
      ) : null}
    </section>
  );
}
