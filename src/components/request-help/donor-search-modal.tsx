"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  Phone,
  Radio,
  X,
} from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { BloodGroupText } from "@/components/request-help/blood-group-mark";
import { ContactPhone } from "@/components/request-help/contact-phone";
import { WhatsAppConnectButton } from "@/components/request-help/whatsapp-connect-button";
import {
  ASSIGNMENT_WAIT_MS,
  canShareContactDetails,
  formatCountdown,
  remainingMs,
} from "@/lib/donor-assignment";
import { formatDistance } from "@/lib/geo";
import { fetchDonorProfile } from "@/lib/donor-profile";
import { trustScoreFor } from "@/lib/trust-score";
import { cn } from "@/lib/utils";
import type { BloodRequest, DonorProfile } from "@/types";

export function DonorSearchModal({
  request,
  onClose,
}: {
  request: BloodRequest;
  onClose: () => void;
  /** @deprecated Donor details show inline after accept. */
  onViewDonor?: () => void;
}) {
  const { t } = useLanguage();
  const assignment = request.assignment;
  const wait = remainingMs(assignment);
  const searching =
    !assignment || assignment.status === "searching" || !assignment.donorId;
  const pending = assignment?.status === "pending" && Boolean(assignment.donorId);
  const accepted = assignment?.status === "accepted";
  const contactsOpen = canShareContactDetails(assignment);
  const [donor, setDonor] = useState<DonorProfile | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!accepted || !assignment?.donorId) {
      setDonor(null);
      return;
    }
    let active = true;
    void fetchDonorProfile(assignment.donorId).then((profile) => {
      if (!active) return;
      setDonor(profile);
      setFlash(true);
    });
    return () => {
      active = false;
    };
  }, [accepted, assignment?.donorId, assignment?.assignedAt]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(false), 1400);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const donorName = donor?.fullName || assignment?.donorName || t("match.assigned");
  const donorGroup = donor?.bloodGroup || assignment?.bloodGroup;
  const donorPhone = donor?.phone;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#1c0d14]/70 backdrop-blur-[3px]"
        aria-label={t("match.closeSearch")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="donor-search-title"
        className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[1.75rem] border border-white/40 bg-white p-6 shadow-[0_30px_80px_-24px_rgba(28,13,20,0.55)] sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-xl p-2 text-ink-muted hover:bg-black/5 hover:text-ink"
          aria-label={t("match.closeSearch")}
        >
          <X className="size-4" aria-hidden />
        </button>

        <p className="text-xs font-black uppercase tracking-[0.18em] text-crimson">
          {t("match.liveMatch")}
        </p>
        <h2
          id="donor-search-title"
          className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink"
        >
          {accepted
            ? t("match.searchAccepted")
            : pending
              ? t("match.searchWaiting")
              : t("match.searchTitle")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {accepted
            ? t("match.searchAcceptedBody")
            : pending
              ? t("match.searchWaitingBody")
              : t("match.searchBody")}
        </p>

        {!accepted ? (
          <>
            <div className="relative mx-auto mt-8 flex size-36 items-center justify-center">
              <span
                className="absolute inset-0 animate-ping rounded-full border-2 border-crimson/30"
                aria-hidden
              />
              <span
                className="absolute inset-3 animate-pulse rounded-full border-2 border-crimson/40"
                aria-hidden
              />
              <span className="relative inline-flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22] text-white shadow-lg">
                <Radio className="size-8 animate-pulse" aria-hidden />
              </span>
            </div>

            <div className="mt-8 space-y-2">
              <StatusRow
                done={!searching}
                active={searching}
                label={t("match.stepScan")}
              />
              <StatusRow
                done={pending || accepted}
                active={pending}
                label={t("match.stepAssign")}
              />
              <StatusRow
                done={accepted}
                active={pending}
                label={t("match.stepConfirm")}
              />
            </div>

            <div className="mt-6 rounded-2xl border border-line bg-paper/70 px-4 py-3 text-center">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-ink-muted">
                {pending ? t("match.donorTimer") : t("match.searchTimer")}
              </p>
              <p className="mt-1 font-display text-4xl font-black tracking-tight text-crimson">
                {formatCountdown(
                  pending
                    ? wait
                    : Math.max(
                        0,
                        ASSIGNMENT_WAIT_MS -
                          (Date.now() - new Date(request.createdAt).getTime()),
                      ),
                )}
              </p>
            </div>

            <p className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-ink-muted">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              {t("match.realtime")}
            </p>
          </>
        ) : (
          <div
            className={cn(
              "mt-6 space-y-4 rounded-[1.5rem] border border-teal/25 bg-gradient-to-br from-[#f3fbfa] via-white to-white p-4 sm:p-5",
              flash && "donor-accept-flash",
            )}
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-deep text-white shadow-[0_12px_24px_-12px_rgba(13,115,112,0.7)]">
                <CheckCircle2 className="size-6" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-teal-deep">
                  {t("match.assigned")}
                </p>
                <h3 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink">
                  {donorName}
                </h3>
                <p className="mt-0.5 text-sm font-semibold text-ink-muted">
                  {donorGroup ? <BloodGroupText group={donorGroup} /> : null}
                  {typeof assignment?.distanceKm === "number"
                    ? ` · ${formatDistance(assignment.distanceKm)}`
                    : ""}
                </p>
              </div>
            </div>

            <dl className="grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-xl border border-teal/15 bg-white/90 px-3.5 py-2.5">
                <dt className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-ink-muted">
                  {t("profile.phone")}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-ink">
                  <ContactPhone
                    phone={donorPhone}
                    revealed={contactsOpen}
                    asLink={false}
                  />
                </dd>
              </div>
              {[
                [
                  t("match.location"),
                  donor ? `${donor.area}, ${donor.city}` : "—",
                ],
                [
                  t("profile.donations"),
                  String(
                    donor?.donationsCompleted ??
                      assignment?.donationsCompleted ??
                      "—",
                  ),
                ],
                [
                  t("profile.trust"),
                  donor ? String(trustScoreFor(donor)) : "—",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-teal/15 bg-white/90 px-3.5 py-2.5"
                >
                  <dt className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-ink-muted">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            {contactsOpen && donorPhone ? (
              <a
                href={`tel:${donorPhone}`}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal to-teal-deep text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_14px_28px_-12px_rgba(13,115,112,0.7)]"
              >
                <Phone className="size-4" aria-hidden />
                {donorPhone}
              </a>
            ) : null}

            {contactsOpen ? (
              <WhatsAppConnectButton requestId={request.id} />
            ) : null}

            {donor ? (
              <p className="flex items-center justify-center gap-1 text-xs font-semibold text-ink-muted">
                <MapPin className="size-3" aria-hidden />
                {donor.area}, {donor.city}
              </p>
            ) : (
              <p className="flex items-center justify-center gap-2 text-xs font-bold text-ink-muted">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                {t("profile.loadingProfile")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusRow({
  done,
  active,
  label,
}: {
  done: boolean;
  active: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line/70 bg-white px-3 py-2.5">
      <span
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-full text-[0.65rem] font-black",
          done
            ? "bg-teal text-white"
            : active
              ? "bg-crimson text-white"
              : "bg-slate-100 text-ink-muted",
        )}
      >
        {done ? "✓" : active ? "…" : ""}
      </span>
      <p
        className={cn(
          "text-sm font-bold",
          done || active ? "text-ink" : "text-ink-muted",
        )}
      >
        {label}
      </p>
    </div>
  );
}
