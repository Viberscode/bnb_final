"use client";

import { useEffect, useState } from "react";
import { MapPin, Phone, X } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { formatDistance } from "@/lib/geo";
import { fetchDonorProfile } from "@/lib/donor-profile";
import { WhatsAppConnectButton } from "@/components/request-help/whatsapp-connect-button";
import type { DonorAssignment, DonorProfile } from "@/types";

export function AssignedDonorDetails({
  assignment,
  requestId,
  onClose,
}: {
  assignment: DonorAssignment;
  requestId: string;
  onClose: () => void;
}) {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const [profile, setProfile] = useState<DonorProfile | null>(null);
  const isOwnProfile = Boolean(
    user?.id && (assignment.donorId === user.id || profile?.id === user.id),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (user?.id && assignment.donorId === user.id) {
      onClose();
    }
  }, [assignment.donorId, onClose, user?.id]);

  useEffect(() => {
    let active = true;
    if (user?.id && assignment.donorId === user.id) return;
    void fetchDonorProfile(assignment.donorId).then((next) => {
      if (active) setProfile(next);
    });
    return () => {
      active = false;
    };
  }, [assignment.donorId, user?.id]);

  if (isOwnProfile) return null;

  const lastDonation = profile?.lastDonation
    ? new Date(profile.lastDonation).toLocaleDateString(
        locale === "hi" ? "hi-IN" : "en-IN",
      )
    : "—";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#1c0d14]/65 backdrop-blur-[2px]"
        aria-label={t("match.closeDetails")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="assigned-donor-title"
        className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/40 bg-white p-6 shadow-[0_30px_80px_-24px_rgba(28,13,20,0.55)] sm:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-xl p-2 text-ink-muted hover:bg-black/5 hover:text-ink"
          aria-label={t("match.closeDetails")}
        >
          <X className="size-4" aria-hidden />
        </button>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-deep">
          {t("match.assigned")}
        </p>
        <h2
          id="assigned-donor-title"
          className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink"
        >
          {profile?.fullName || assignment.donorName}
        </h2>
        <p className="mt-1 text-sm font-semibold text-ink-muted">
          {profile?.bloodGroup || assignment.bloodGroup} ·{" "}
          {formatDistance(assignment.distanceKm)}
        </p>

        <dl className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {[
            [t("profile.phone"), profile?.phone || "—"],
            [t("profile.email"), profile?.email || "—"],
            [
              t("match.location"),
              profile ? `${profile.area}, ${profile.city}` : "—",
            ],
            [t("profile.age"), profile?.age ? String(profile.age) : "—"],
            [t("profile.donations"), String(profile?.donationsCompleted ?? assignment.donationsCompleted)],
            [t("profile.livesHelped"), String(profile?.livesHelped ?? "—")],
            [t("profile.trust"), profile ? String(profile.trustScore) : "—"],
            [t("profile.lastDonation"), lastDonation],
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

        {profile?.phone ? (
          <>
            <a
              href={`tel:${profile.phone}`}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal to-teal-deep text-sm font-black uppercase tracking-[0.08em] text-white"
            >
              <Phone className="size-4" aria-hidden />
              {profile.phone}
            </a>
            <WhatsAppConnectButton requestId={requestId} className="mt-2" />
          </>
        ) : null}

        {profile ? (
          <p className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-ink-muted">
            <MapPin className="size-3" aria-hidden />
            {profile.area}, {profile.city}
          </p>
        ) : null}
      </div>
    </div>
  );
}
