"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
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
import { useAssignmentEngine } from "@/hooks/use-assignment-engine";
import { neededBloodGroups, totalUnits, unitsByGroup } from "@/lib/blood-compatibility";
import {
  isOwnDonor,
  rankRequestsForDonor,
  respondToAssignment,
  withAssignments,
} from "@/lib/donor-assignment";
import { fetchAvailableDonors, fetchDonorProfile } from "@/lib/donor-profile";
import {
  fetchLiveRequests,
  subscribeLiveRequests,
  urgencyRank,
} from "@/lib/live-requests";
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
        "live-urgency-badge inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.7rem] font-black uppercase tracking-[0.12em] ring-1",
        urgency === "critical" &&
          "bg-[#c4122f] text-white ring-[#ff6b81] shadow-[0_8px_20px_-8px_rgba(196,18,47,0.9)]",
        urgency === "urgent" &&
          "bg-amber-500 text-white ring-amber-300 shadow-[0_8px_20px_-8px_rgba(217,119,6,0.85)]",
        urgency === "planned" &&
          "bg-teal text-white ring-teal/40 shadow-[0_8px_20px_-8px_rgba(13,115,112,0.7)]",
      )}
    >
      {urgency === "critical" ? (
        <AlertTriangle className="size-3.5" aria-hidden />
      ) : urgency === "urgent" ? (
        <Clock3 className="size-3.5" aria-hidden />
      ) : (
        <Radio className="size-3.5" aria-hidden />
      )}
      {label} · {window}
    </span>
  );
}

function RequestCard({
  request,
  highlighted,
  isMine,
  canOpen,
  onOpen,
}: {
  request: BloodRequest;
  highlighted?: boolean;
  isMine?: boolean;
  canOpen?: boolean;
  onOpen?: () => void;
}) {
  const { t } = useLanguage();
  return (
    <article
      id={`request-${request.id}`}
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-white p-5 text-left transition duration-300",
        highlighted &&
          "border-crimson shadow-[0_0_0_2px_rgba(196,18,47,0.25)] ring-2 ring-crimson/20",
        !highlighted && request.urgency === "critical" &&
          "live-request-card--critical border-[#ff2d4a] bg-[#fff7f8]",
        !highlighted && request.urgency === "urgent" &&
          "live-request-card--urgent border-amber-400 bg-[#fffbeb]",
        !highlighted && request.urgency === "planned" &&
          "live-request-card--planned border-teal/40 bg-[#f4fbfa]",
        canOpen && "cursor-pointer hover:-translate-y-0.5",
      )}
      role={canOpen ? "button" : undefined}
      tabIndex={canOpen ? 0 : undefined}
      onClick={canOpen ? onOpen : undefined}
      onKeyDown={
        canOpen
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen?.();
              }
            }
          : undefined
      }
    >
      {isMine ? (
        <span className="absolute right-2.5 top-2.5 z-10 rounded-md bg-ink/90 px-1.5 py-0.5 text-[0.55rem] font-black uppercase tracking-[0.12em] text-white">
          {t("live.yours")}
        </span>
      ) : null}
      <span
        className={cn(
          "live-siren-bar pointer-events-none absolute inset-x-0 top-0 h-1.5",
          request.urgency === "critical" &&
            "bg-gradient-to-r from-[#ff2d4a] via-[#c4122f] to-[#ff2d4a]",
          request.urgency === "urgent" &&
            "bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400",
          request.urgency === "planned" &&
            "bg-gradient-to-r from-teal via-emerald-500 to-teal",
        )}
        aria-hidden
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <BloodGroupMark request={request} />
          <div>
            <p className="font-display text-lg font-black tracking-tight text-ink">
              <UnitsNeededLine request={request} />
            </p>
            <p className="mt-0.5 text-xs font-semibold text-ink-muted">
              {(request.patientsCount ?? 1) > 1
                ? `${request.patientsCount} ${t("live.people")} · `
                : ""}
              {timeAgo(request.createdAt, t)}
            </p>
          </div>
        </div>
        <div className={cn("flex items-start justify-end", isMine && "pt-4")}>
          <UrgencyBadge urgency={request.urgency} />
        </div>
      </div>

      <p className="mt-4 flex items-start gap-2 text-sm text-ink">
        <MapPin
          className={cn(
            "mt-0.5 size-4 shrink-0",
            request.urgency === "critical" && "text-crimson",
            request.urgency === "urgent" && "text-amber-600",
            request.urgency === "planned" && "text-teal",
          )}
          aria-hidden
        />
        <span>
          <span className="font-semibold">{request.hospitalName}</span>
          <span className="mt-0.5 block text-ink-muted">
            {request.hospitalArea}
            {typeof request.distanceKm === "number"
              ? ` · ${request.distanceKm.toFixed(1)} km`
              : ""}
          </span>
          {request.voiceNoteUrl ? (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-crimson-soft px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-wider text-crimson">
              <Mic className="size-3" aria-hidden />
              {t("live.voiceNote")}
            </span>
          ) : null}
        </span>
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-3 text-sm">
        <span className="text-ink-muted">
          {t("live.contact")}:{" "}
          <span className="font-semibold text-ink">{request.contactName}</span>
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wider",
            request.urgency === "critical" &&
              "bg-[#fff1f3] text-[#c4122f]",
            request.urgency === "urgent" && "bg-amber-100 text-amber-800",
            request.urgency === "planned" && "bg-teal-soft text-teal-deep",
          )}
        >
          <Radio className="size-3 animate-pulse" aria-hidden />
          {t("live.liveStatus")} · {request.status.replace("_", " ")}
        </span>
      </div>
      <AssignedDonorLine
        assignment={request.assignment}
        viewer={isMine ? "requester" : "public"}
      />
      {canOpen ? (
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-crimson">
          {t("live.openDetails")}
        </p>
      ) : null}
    </article>
  );
}

function RequestDetailModal({
  request,
  donorId,
  onClose,
  onRespond,
}: {
  request: BloodRequest;
  donorId?: string;
  onClose: () => void;
  onRespond?: (action: "accept" | "decline") => void;
}) {
  const { t } = useLanguage();
  const breakdown = unitsByGroup(request);
  const unitsTotal = totalUnits(request);
  const windowLabel =
    request.urgency === "critical"
      ? t("urgency.criticalWindow")
      : request.urgency === "urgent"
        ? t("urgency.urgentWindow")
        : t("urgency.plannedWindow");

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
          {t("live.requesterDetails")}
        </p>
        <h2
          id="request-detail-title"
          className="mt-2 font-display text-3xl font-black tracking-tight text-ink"
        >
          {request.contactName}
        </h2>
        <p className="mt-1 text-sm font-semibold text-ink-muted">
          {t("live.posted")} {timeAgo(request.createdAt, t)}
        </p>
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
              {request.phone ? (
                <a
                  href={`tel:${request.phone}`}
                  className="font-display text-lg font-extrabold text-crimson underline-offset-2 hover:underline"
                >
                  {request.phone}
                </a>
              ) : (
                <span className="font-semibold text-ink-muted">{t("live.notShared")}</span>
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
              {typeof request.distanceKm === "number"
                ? ` · ${request.distanceKm.toFixed(1)} km`
                : ""}
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

          <div className="rounded-2xl border border-teal/25 bg-teal-soft/40 px-4 py-3">
            <AssignedDonorLine
              assignment={request.assignment}
              viewer={request.assignment?.donorId === donorId ? "donor" : "public"}
              youAreAssigned={
                request.assignment?.donorId === donorId &&
                request.userId !== donorId
              }
              onAccept={() => onRespond?.("accept")}
              onDecline={() => onRespond?.("decline")}
            />
          </div>
        </dl>

        {request.phone ? (
          <a
            href={`tel:${request.phone}`}
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#c91833] to-[#8a1024] text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_14px_28px_-12px_rgba(196,18,47,0.7)]"
          >
            <Phone className="size-4" aria-hidden />
            {t("live.callRequester")}
          </a>
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
  const [donor, setDonor] = useState<DonorProfile | null>(null);
  const [openRequest, setOpenRequest] = useState<BloodRequest | null>(null);
  const pool =
    donor && !donors.some((item) => item.id === donor.id)
      ? [...donors, donor]
      : donors;
  const now = useAssignmentEngine(requests, pool);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const [rows, profile, nextDonors] = await Promise.all([
        fetchLiveRequests(),
        fetchDonorProfile(user?.id),
        fetchAvailableDonors(),
      ]);
      if (!active) return;
      setRequests(rows);
      setDonor(profile);
      setDonors(nextDonors);
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

  const filterToMatches = Boolean(donor && !showAll);

  const sorted = useMemo(() => {
    let list = withAssignments(requests, pool);
    if (filterToMatches && donor) {
      const ranked = rankRequestsForDonor(list, donor);
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
  }, [requests, pool, filterToMatches, donor, highlightId, now]);

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
              )}
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
              canOpen={Boolean(donor && !isOwnDonor(request, donor))}
              onOpen={() => setOpenRequest(request)}
            />
          ))}
        </div>

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
        <RequestDetailModal
          request={
            sorted.find((item) => item.id === openRequest.id) ?? openRequest
          }
          donorId={donor.id}
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
      ) : null}
    </section>
  );
}
