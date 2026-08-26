"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  Droplets,
  Hospital as HospitalIcon,
  Loader2,
  MapPin,
  Navigation,
  Sparkles,
  UserRound,
  Users,
  Minus,
  Plus,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { AssignedDonorLine } from "@/components/request-help/assigned-donor";
import { AssignedDonorDetails } from "@/components/request-help/assigned-donor-details";
import { DonorSearchModal } from "@/components/request-help/donor-search-modal";
import { RequesterConfirmPanel } from "@/components/request-help/requester-confirm-panel";
import { BloodGroupMark, BloodGroupText } from "@/components/request-help/blood-group-mark";
import { VoiceNoteRecorder } from "@/components/request-help/voice-note-recorder";
import { DEMO_HOSPITALS, URGENCY_OPTIONS } from "@/data/demo";
import { useLiveLocation } from "@/hooks/use-live-location";
import { BLOOD_GROUPS } from "@/lib/blood-compatibility";
import {
  formatDistance,
  getNearbyPlaces,
  NEARBY_HOSPITAL_RADIUS_KM,
} from "@/lib/geo";
import { useAssignmentEngine } from "@/hooks/use-assignment-engine";
import { canViewAssignedDonor, startAssignmentForRequest, waitForAnotherDonor, withAssignments } from "@/lib/donor-assignment";
import { fetchAvailableDonors } from "@/lib/donor-profile";
import { notifyDonorsRequestIsLive } from "@/lib/notify-donors";
import {
  addLiveRequest,
  cancelLiveRequest,
  completeLiveRequest,
  fetchActiveRequestForUser,
  subscribeLiveRequests,
} from "@/lib/live-requests";
import { uploadVoiceNote } from "@/lib/voice-notes";
import { cn } from "@/lib/utils";
import type { BloodGroup, BloodRequest, DonorProfile, UrgencyLevel } from "@/types";

type NearbyHospital = (typeof DEMO_HOSPITALS)[number] & { distanceKm: number };
type PanelTone = "crimson" | "amber" | "teal" | "slate";

const MIN_PEOPLE = 2;
const MAX_PEOPLE = 19;

function indianMobileDigits(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length > 10) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

function StepPanel({
  tone,
  step,
  stepLabel,
  title,
  icon: Icon,
  delayMs,
  children,
}: {
  tone: PanelTone;
  step: string;
  stepLabel: string;
  title: string;
  icon: typeof Droplets;
  delayMs: number;
  children: ReactNode;
}) {
  return (
    <section
      className="request-step-panel p-4 sm:p-5"
      data-tone={tone}
      style={{ animationDelay: `${delayMs}ms, ${delayMs}ms` }}
    >
      <header className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_10px_22px_-10px_rgba(0,0,0,0.45)] sm:size-11",
            tone === "crimson" &&
              "bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22]",
            tone === "amber" &&
              "bg-gradient-to-br from-amber-400 to-orange-600",
            tone === "teal" && "bg-gradient-to-br from-teal to-teal-deep",
            tone === "slate" &&
              "bg-gradient-to-br from-slate-500 to-slate-800",
          )}
        >
          <Icon className="size-4 sm:size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p
            className={cn(
              "text-[0.65rem] font-bold uppercase tracking-[0.18em]",
              tone === "crimson" && "text-crimson",
              tone === "amber" && "text-amber-700",
              tone === "teal" && "text-teal-deep",
              tone === "slate" && "text-slate-600",
            )}
          >
            {stepLabel} {step}
          </p>
          <h2 className="mt-0.5 font-display text-xl font-extrabold tracking-[-0.03em] text-ink sm:text-2xl">
            {title}
          </h2>
        </div>
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function RequestHelpForm() {
  const { t } = useLanguage();
  const { user, status: authStatus } = useAuth();
  const [patientScope, setPatientScope] = useState<"single" | "multiple" | null>(
    null,
  );
  const [patientsCount, setPatientsCount] = useState(2);
  const [bloodGroups, setBloodGroups] = useState<BloodGroup[]>([]);
  const [groupUnits, setGroupUnits] = useState<Partial<Record<BloodGroup, number>>>(
    {},
  );
  const [urgency, setUrgency] = useState<UrgencyLevel | null>(null);
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [units, setUnits] = useState(1);
  const [notes, setNotes] = useState("");
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const { coords, status: locStatus, retry: retryLocation } = useLiveLocation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRequest, setActiveRequest] = useState<BloodRequest | null>(null);
  const [donors, setDonors] = useState<DonorProfile[]>([]);
  const [checkingActive, setCheckingActive] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [waitingMore, setWaitingMore] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [donorOpen, setDonorOpen] = useState(false);
  const ownedRequest = useMemo(() => {
    if (!activeRequest) return null;
    if (!user?.id || activeRequest.userId) return activeRequest;
    return { ...activeRequest, userId: user.id };
  }, [activeRequest, user?.id]);
  const otherDonors = useMemo(
    () => (user?.id ? donors.filter((donor) => donor.id !== user.id) : donors),
    [donors, user?.id],
  );
  const now = useAssignmentEngine(ownedRequest ? [ownedRequest] : [], otherDonors);
  const liveActive = useMemo(
    () =>
      ownedRequest
        ? withAssignments([ownedRequest], otherDonors)[0] ?? ownedRequest
        : null,
    [ownedRequest, otherDonors, now],
  );
  const showAssignedDonor = Boolean(
    liveActive && canViewAssignedDonor(liveActive, liveActive.assignment, user?.id),
  );

  const nearby = useMemo<NearbyHospital[]>(() => {
    if (!coords) return [];
    return getNearbyPlaces(DEMO_HOSPITALS, coords.lat, coords.lng);
  }, [coords]);

  const selectedHospital = nearby.find((h) => h.id === hospitalId) ?? null;
  const blockedByActive = Boolean(liveActive);

  function setPeopleAffected(next: number) {
    const count = Math.min(MAX_PEOPLE, Math.max(MIN_PEOPLE, Math.round(next) || MIN_PEOPLE));
    setPatientsCount(count);
    setBloodGroups((current) => {
      if (current.length <= count) return current;
      const keptGroups = current.slice(0, count);
      setGroupUnits((prev) => {
        const kept: Partial<Record<BloodGroup, number>> = {};
        for (const group of keptGroups) {
          kept[group] = prev[group] ?? 1;
        }
        return kept;
      });
      return keptGroups;
    });
  }

  useEffect(() => {
    if (hospitalId && !nearby.some((h) => h.id === hospitalId)) {
      setHospitalId(null);
    }
  }, [nearby, hospitalId]);

  useEffect(() => {
    let active = true;

    async function check() {
      if (authStatus === "loading") return;
      if (!user?.id) {
        if (active) {
          setActiveRequest(null);
          setCheckingActive(false);
        }
        return;
      }

      setCheckingActive(true);
      const [existing, donors] = await Promise.all([
        fetchActiveRequestForUser(user.id),
        fetchAvailableDonors(),
      ]);
      if (!active) return;
      setDonors(donors);
      setActiveRequest(existing);
      setCheckingActive(false);
      if (
        existing &&
        existing.assignment?.status !== "accepted" &&
        existing.status !== "cancelled"
      ) {
        setSearchOpen(true);
      }
    }

    void check();
    const unsub = subscribeLiveRequests(() => {
      void check();
    });
    return () => {
      active = false;
      unsub();
    };
  }, [user?.id, authStatus]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (blockedByActive && activeRequest) {
      setError(t("request.errAlreadyOpen"));
      return;
    }
    if (!patientScope) {
      setError(t("request.errChooseScope"));
      return;
    }
    if (bloodGroups.length === 0) {
      setError(
        patientScope === "multiple"
          ? t("request.errSelectEvery")
          : t("request.errSelectOne"),
      );
      return;
    }
    if (patientScope === "multiple" && bloodGroups.length > patientsCount) {
      setError(t("request.errMaxTypes", { n: patientsCount }));
      return;
    }
    if (
      patientScope === "multiple" &&
      (patientsCount < MIN_PEOPLE || patientsCount > MAX_PEOPLE)
    ) {
      setError(t("request.errPeopleRange", { min: MIN_PEOPLE, max: MAX_PEOPLE }));
      return;
    }
    if (!urgency) {
      setError(t("request.errUrgency"));
      return;
    }
    if (!selectedHospital) {
      if (!coords) {
        setError(t("request.errLocation"));
      } else if (nearby.length === 0) {
        setError(t("request.noHospitals", { km: NEARBY_HOSPITAL_RADIUS_KM }));
      } else {
        setError(t("request.errHospital"));
      }
      return;
    }
    if (!contactName.trim()) {
      setError(t("request.errName"));
      return;
    }
    const mobile = indianMobileDigits(phone);
    if (mobile.length !== 10) {
      setPhoneTouched(true);
      return;
    }

    const primaryGroup = bloodGroups[0];
    if (!primaryGroup) {
      setError(t("request.errSelectOne"));
      return;
    }

    const resolvedGroupUnits =
      patientScope === "multiple"
        ? Object.fromEntries(
            bloodGroups.map((group) => [group, groupUnits[group] ?? 1]),
          )
        : { [primaryGroup]: units };
    const totalUnitsNeeded =
      patientScope === "multiple"
        ? bloodGroups.reduce((sum, group) => sum + (groupUnits[group] ?? 1), 0)
        : units;

    setSubmitting(true);
    try {
      let voiceNoteUrl: string | undefined;
      if (voiceBlob) {
        if (!user?.id) {
          throw new Error(t("request.errVoice"));
        }
        voiceNoteUrl = await uploadVoiceNote(voiceBlob, user.id);
      }

      const request = await addLiveRequest({
        bloodGroup: primaryGroup,
        bloodGroups,
        groupUnits: resolvedGroupUnits,
        patientsCount: patientScope === "multiple" ? patientsCount : 1,
        urgency,
        hospitalId: selectedHospital.id,
        hospitalName: selectedHospital.name,
        hospitalArea: `${selectedHospital.area}, ${selectedHospital.city}`,
        contactName: contactName.trim(),
        phone: `+91${mobile}`,
        units: totalUnitsNeeded,
        notes: notes.trim() || undefined,
        voiceNoteUrl,
        distanceKm: selectedHospital.distanceKm,
      });
      const nextDonors = (await fetchAvailableDonors()).filter(
        (donor) => donor.id !== user?.id,
      );
      const owned = user?.id
        ? { ...request, userId: request.userId ?? user.id }
        : request;
      void notifyDonorsRequestIsLive(owned.id);
      const assigned = await startAssignmentForRequest(owned, nextDonors);
      setDonors(nextDonors);
      setActiveRequest(assigned ?? owned);
      setSearchOpen(true);
      setSubmitting(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("request.errPublish"),
      );
      setSubmitting(false);
    }
  }

  if (checkingActive && authStatus !== "unauthenticated") {
    return (
      <p className="rounded-2xl border border-line bg-white/80 px-4 py-8 text-center text-sm text-ink-muted">
        {t("request.checking")}
      </p>
    );
  }

  if (blockedByActive && liveActive) {
    return (
      <>
      <div className="overflow-hidden rounded-[1.75rem] border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-white to-rose-50 shadow-[0_20px_48px_-20px_rgba(180,83,9,0.45)]">
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-white">
          <AlertTriangle className="size-4" aria-hidden />
          <p className="text-xs font-black uppercase tracking-[0.2em]">
            {t("request.oneAtATime")}
          </p>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <h2 className="font-display text-3xl font-black tracking-tight text-ink sm:text-[2.1rem]">
              {t("request.alreadyOpenTitle")}
            </h2>
            <p className="mt-2 text-sm font-semibold text-ink-muted">
              {t("request.alreadyOpenBody")}
            </p>
          </div>

          <div className="rounded-2xl border-2 border-amber-300 bg-white p-4 shadow-[0_10px_28px_-18px_rgba(180,83,9,0.5)]">
            <div className="flex items-start gap-3.5">
              <BloodGroupMark request={liveActive} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-black tracking-tight text-ink">
                  {liveActive.hospitalName}
                </p>
                <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-ink-muted">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  {liveActive.hospitalArea}
                </p>
                {(liveActive.patientsCount ?? 1) > 1 ? (
                  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-crimson">
                    {t("request.peopleAffected", {
                      n: liveActive.patientsCount ?? 1,
                    })}
                  </p>
                ) : null}
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wider text-white",
                      liveActive.urgency === "critical" && "bg-[#c4122f]",
                      liveActive.urgency === "urgent" && "bg-amber-500",
                      liveActive.urgency === "planned" && "bg-teal",
                    )}
                  >
                    {liveActive.urgency === "critical"
                      ? t("urgency.critical")
                      : liveActive.urgency === "urgent"
                        ? t("urgency.urgent")
                        : t("urgency.planned")}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wider text-emerald-700">
                    {t("request.liveStatus")} · {liveActive.status.replaceAll("_", " ")}
                  </span>
                </div>
                <AssignedDonorLine
                  assignment={liveActive.assignment}
                  viewer="requester"
                  requestId={liveActive.id}
                  onViewDonor={
                    showAssignedDonor ? () => setDonorOpen(true) : undefined
                  }
                />
                <RequesterConfirmPanel
                  request={liveActive}
                  confirming={completing}
                  waiting={waitingMore}
                  onAccepted={async () => {
                    setError(null);
                    setCompleting(true);
                    try {
                      await completeLiveRequest(liveActive.id);
                      setActiveRequest(null);
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : t("request.errComplete"),
                      );
                    } finally {
                      setCompleting(false);
                    }
                  }}
                  onWaitMore={async () => {
                    setError(null);
                    setWaitingMore(true);
                    try {
                      await waitForAnotherDonor(liveActive.id);
                      await startAssignmentForRequest(liveActive, otherDonors);
                      setSearchOpen(true);
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : t("request.errWaitMore"),
                      );
                    } finally {
                      setWaitingMore(false);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-crimson hover:underline"
                >
                  {t("match.liveMatch")}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={cancelling}
              onClick={async () => {
                if (!liveActive) return;
                setError(null);
                setCancelling(true);
                try {
                  await cancelLiveRequest(liveActive.id);
                  setActiveRequest(null);
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : t("request.errCancel"),
                  );
                } finally {
                  setCancelling(false);
                }
              }}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#c91833] to-[#8a1024] px-5 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[0_14px_28px_-12px_rgba(196,18,47,0.75)] hover:brightness-110 disabled:opacity-70"
            >
              {cancelling ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t("request.cancelling")}
                </>
              ) : (
                t("request.cancelAndNew")
              )}
            </button>
            <Link
              href="/profile/requests"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border-2 border-ink/10 bg-white px-5 text-sm font-black text-ink hover:bg-black/[0.03]"
            >
              {t("request.viewMyRequest")}
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
            <Link
              href={`/requests?highlight=${liveActive.id}`}
              className="inline-flex h-12 items-center justify-center rounded-xl border-2 border-ink/10 bg-white px-5 text-sm font-black text-ink hover:bg-black/[0.03]"
            >
              {t("request.openLiveFeed")}
            </Link>
          </div>
          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-crimson/30 bg-crimson-soft px-3 py-2 text-sm font-semibold text-crimson-deep"
            >
              {error}
            </p>
          ) : null}
        </div>
      </div>
      {searchOpen ? (
        <DonorSearchModal
          request={liveActive}
          onClose={() => setSearchOpen(false)}
          onViewDonor={showAssignedDonor ? () => setDonorOpen(true) : undefined}
        />
      ) : null}
      {donorOpen && showAssignedDonor && liveActive.assignment?.donorId ? (
        <AssignedDonorDetails
          assignment={liveActive.assignment}
          requestId={liveActive.id}
          onClose={() => setDonorOpen(false)}
        />
      ) : null}
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      <StepPanel
        tone="crimson"
        step="01"
        stepLabel={t("request.step")}
        title={t("request.who")}
        icon={Droplets}
        delayMs={40}
      >
        <div className="grid gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setPatientScope("single");
              setPatientsCount(1);
              setBloodGroups((current) => {
                const next = current.slice(0, 1);
                if (next[0]) {
                  setUnits(groupUnits[next[0]] ?? units);
                  setGroupUnits(next[0] ? { [next[0]]: groupUnits[next[0]] ?? 1 } : {});
                } else {
                  setGroupUnits({});
                }
                return next;
              });
            }}
            className={cn(
              "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition duration-200 hover:-translate-y-0.5",
              patientScope === "single"
                ? "border-crimson bg-[#fff1f3] shadow-[0_16px_32px_-18px_rgba(196,18,47,0.55)]"
                : "border-rose-100 bg-white/90 hover:border-crimson/35",
            )}
          >
            <span
              className={cn(
                "inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-white",
                patientScope === "single"
                  ? "bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22]"
                  : "bg-slate-400",
              )}
            >
              <UserRound className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-display text-xl font-extrabold tracking-tight text-ink">
                {t("request.onePerson")}
              </span>
              <span className="mt-0.5 block text-sm font-semibold text-ink-muted">
                {t("request.onePersonHint")}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPatientScope("multiple");
              setPatientsCount((count) => Math.max(2, count));
            }}
            className={cn(
              "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition duration-200 hover:-translate-y-0.5",
              patientScope === "multiple"
                ? "border-crimson bg-[#fff1f3] shadow-[0_16px_32px_-18px_rgba(196,18,47,0.55)]"
                : "border-rose-100 bg-white/90 hover:border-crimson/35",
            )}
          >
            <span
              className={cn(
                "inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-white",
                patientScope === "multiple"
                  ? "bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22]"
                  : "bg-slate-400",
              )}
            >
              <Users className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-display text-xl font-extrabold tracking-tight text-ink">
                {t("request.multiple")}
              </span>
              <span className="mt-0.5 block text-sm font-semibold text-ink-muted">
                {t("request.multipleHint")}
              </span>
            </span>
          </button>
        </div>

        {patientScope === "multiple" ? (
          <div className="mt-4">
            <p className="text-base font-black text-ink">{t("request.howMany")}</p>
            <div className="mt-2 flex max-w-[220px] items-center gap-2">
              <button
                type="button"
                aria-label={t("request.fewerPeople")}
                disabled={patientsCount <= MIN_PEOPLE}
                onClick={() => setPeopleAffected(patientsCount - 1)}
                className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-ink shadow-sm transition hover:border-crimson/35 disabled:opacity-40"
              >
                <Minus className="size-4" aria-hidden />
              </button>
              <input
                type="number"
                min={MIN_PEOPLE}
                max={MAX_PEOPLE}
                value={patientsCount}
                onChange={(e) => setPeopleAffected(Number(e.target.value))}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white/95 text-center font-display text-xl font-extrabold text-ink shadow-sm outline-none transition focus:border-crimson/40 focus:ring-2 focus:ring-crimson/25"
              />
              <button
                type="button"
                aria-label={t("request.morePeople")}
                disabled={patientsCount >= MAX_PEOPLE}
                onClick={() => setPeopleAffected(patientsCount + 1)}
                className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-ink shadow-sm transition hover:border-crimson/35 disabled:opacity-40"
              >
                <Plus className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        ) : null}

        {patientScope ? (
          <div className="mt-4">
            <p className="text-base font-black text-ink">
              {patientScope === "multiple"
                ? t("request.groupsNeeded")
                : t("request.groupNeeded")}
            </p>
            <div className="mt-2.5 grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-2.5">
              {BLOOD_GROUPS.map((group) => {
                const selected = bloodGroups.includes(group);
                const atLimit =
                  patientScope === "multiple" &&
                  !selected &&
                  bloodGroups.length >= patientsCount;
                return (
                  <button
                    key={group}
                    type="button"
                    disabled={atLimit}
                    title={
                      atLimit
                        ? t("request.typesAllowed", { n: patientsCount })
                        : undefined
                    }
                    onClick={() => {
                      if (patientScope === "single") {
                        setBloodGroups([group]);
                        setGroupUnits({ [group]: groupUnits[group] ?? units });
                        return;
                      }
                      setBloodGroups((current) => {
                        if (current.includes(group)) {
                          setGroupUnits((prev) => {
                            const next = { ...prev };
                            delete next[group];
                            return next;
                          });
                          return current.filter((item) => item !== group);
                        }
                        if (current.length >= patientsCount) return current;
                        setGroupUnits((prev) => ({
                          ...prev,
                          [group]: prev[group] ?? 1,
                        }));
                        return [...current, group];
                      });
                    }}
                    className={cn(
                      "rounded-xl border px-2 py-3 font-display text-base font-extrabold tracking-tight transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson",
                      selected
                        ? "border-transparent bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22] text-white shadow-[0_12px_24px_-10px_rgba(196,18,47,0.85)] hover:-translate-y-0.5"
                        : atLimit
                          ? "cursor-not-allowed border-rose-50 bg-slate-50 text-ink-muted/50"
                          : "border-rose-100 bg-white/90 text-ink shadow-sm hover:-translate-y-0.5 hover:border-crimson/35 hover:shadow-md",
                    )}
                  >
                    <BloodGroupText group={group} />
                  </button>
                );
              })}
            </div>
            {bloodGroups.length > 0 ? (
              <div className="mt-3 space-y-2">
                {patientScope === "multiple" ? (
                  <p className="text-sm font-bold text-ink">
                    {t("request.unitsEach")}
                  </p>
                ) : null}
                <div
                  className={cn(
                    "grid gap-2",
                    patientScope === "multiple" && "sm:grid-cols-2",
                  )}
                >
                  {bloodGroups.map((group) => (
                    <label
                      key={group}
                      className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-white/95 px-3 py-2.5"
                    >
                      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22] font-display text-sm font-extrabold text-white">
                        <BloodGroupText group={group} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-ink">
                          {t("request.units")}
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={
                            patientScope === "single"
                              ? units
                              : (groupUnits[group] ?? 1)
                          }
                          onChange={(e) => {
                            const next = Math.min(
                              10,
                              Math.max(1, Number(e.target.value) || 1),
                            );
                            if (patientScope === "single") {
                              setUnits(next);
                              setGroupUnits({ [group]: next });
                              return;
                            }
                            setGroupUnits((prev) => ({ ...prev, [group]: next }));
                          }}
                          className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-ink shadow-sm outline-none transition focus:border-crimson/40 focus:ring-2 focus:ring-crimson/25"
                        />
                      </span>
                    </label>
                  ))}
                </div>
                {patientScope === "multiple" ? (
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-crimson">
                    {bloodGroups.length}{" "}
                    {bloodGroups.length > 1
                      ? t("request.groups")
                      : t("request.group")}{" "}
                    · {patientsCount} {t("request.people")} ·{" "}
                    {bloodGroups.reduce(
                      (sum, group) => sum + (groupUnits[group] ?? 1),
                      0,
                    )}{" "}
                    {t("request.unitsTotal")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm font-semibold text-ink-muted">
            {t("request.chooseScope")}
          </p>
        )}
      </StepPanel>

      <StepPanel
        tone="amber"
        step="02"
        stepLabel={t("request.step")}
        title={t("request.urgency")}
        icon={AlertTriangle}
        delayMs={140}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {URGENCY_OPTIONS.map((option) => {
            const selected = urgency === option.value;
            return (
              <button
                key={option.value}
                type="button"
                data-urgency={option.value}
                onClick={() => setUrgency(option.value)}
                className={cn(
                  "urgency-card rounded-2xl p-4 text-left transition duration-200 focus-visible:outline-none hover:-translate-y-1",
                  option.value === "critical" &&
                    "focus-visible:ring-2 focus-visible:ring-[#ff2d4a]/40",
                  option.value === "urgent" &&
                    "focus-visible:ring-2 focus-visible:ring-amber-400/40",
                  option.value === "planned" &&
                    "focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                  selected
                    ? option.value === "critical"
                      ? "bg-[#fff1f3] shadow-[0_18px_34px_-16px_rgba(255,45,74,0.55)]"
                      : option.value === "urgent"
                        ? "bg-amber-50 shadow-[0_18px_34px_-16px_rgba(245,158,11,0.5)]"
                        : "bg-emerald-50 shadow-[0_18px_34px_-16px_rgba(16,185,129,0.45)]"
                    : "bg-white/90 shadow-sm hover:shadow-md",
                )}
              >
                <span className="flex items-center gap-2">
                  {option.value === "critical" ? (
                    <AlertTriangle className="size-4 text-[#ff2d4a]" />
                  ) : (
                    <Clock3
                      className={cn(
                        "size-4",
                        option.value === "urgent"
                          ? "text-amber-600"
                          : "text-teal",
                      )}
                    />
                  )}
                  <span className="font-display text-xl font-extrabold tracking-tight text-ink">
                    {option.value === "critical"
                      ? t("urgency.critical")
                      : option.value === "urgent"
                        ? t("urgency.urgent")
                        : t("urgency.planned")}
                  </span>
                </span>
                <span className="mt-2 block text-sm font-bold text-ink">
                  {option.value === "critical"
                    ? t("urgency.criticalWindow")
                    : option.value === "urgent"
                      ? t("urgency.urgentWindow")
                      : t("urgency.plannedWindow")}
                </span>
                <span className="mt-1 block text-xs text-ink-muted">
                  {option.value === "critical"
                    ? t("urgency.criticalDetail")
                    : option.value === "urgent"
                      ? t("urgency.urgentDetail")
                      : t("urgency.plannedDetail")}
                </span>
              </button>
            );
          })}
        </div>
      </StepPanel>

      <StepPanel
        tone="teal"
        step="03"
        stepLabel={t("request.step")}
        title={t("request.hospital")}
        icon={HospitalIcon}
        delayMs={240}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex flex-wrap items-center gap-2 text-ink-muted">
            <Navigation className="size-4 text-teal" aria-hidden />
            {locStatus === "loading" && (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" /> {t("request.gettingLocation")}
              </span>
            )}
            {locStatus === "tracking" && coords && (
              <span className="inline-flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-soft px-2 py-0.5 text-xs font-bold text-teal-deep">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                  {t("request.live")}
                </span>
                {t("request.withinKm", {
                  km: NEARBY_HOSPITAL_RADIUS_KM,
                  m: Math.round(coords.accuracy),
                })}
              </span>
            )}
            {locStatus === "denied" && (
              <span>{t("request.locationBlocked")}</span>
            )}
            {locStatus === "unavailable" && (
              <span>{t("request.locationUnavailable")}</span>
            )}
          </div>
          {(locStatus === "denied" || locStatus === "unavailable") && (
            <button
              type="button"
              onClick={retryLocation}
              className="rounded-lg bg-teal-soft px-2.5 py-1 text-xs font-bold text-teal-deep hover:bg-teal/20"
            >
              {t("request.tryAgain")}
            </button>
          )}
        </div>

        <div className="mt-4 max-h-80 space-y-2.5 overflow-y-auto rounded-2xl bg-white/70 p-2 ring-1 ring-teal/15">
          {locStatus === "loading" ? (
            <p className="px-3 py-8 text-center text-sm text-ink-muted">
              {t("request.findingHospitals")}
            </p>
          ) : !coords ? (
            <p className="px-3 py-8 text-center text-sm text-ink-muted">
              {t("request.allowLocation")}
            </p>
          ) : nearby.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-ink-muted">
              {t("request.noHospitals", { km: NEARBY_HOSPITAL_RADIUS_KM })}
            </p>
          ) : (
            nearby.map((hospital) => {
              const selected = hospitalId === hospital.id;
              return (
                <button
                  key={hospital.id}
                  type="button"
                  onClick={() => setHospitalId(hospital.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border px-3.5 py-3.5 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal",
                    selected
                      ? "border-teal bg-teal-soft/70 shadow-sm"
                      : "border-transparent bg-white/60 hover:border-teal/25 hover:bg-white",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex size-11 shrink-0 items-center justify-center rounded-xl transition",
                      selected
                        ? "bg-gradient-to-br from-teal to-teal-deep text-white shadow-[0_12px_22px_-10px_rgba(13,115,112,0.75)]"
                        : "bg-ink/5 text-ink-muted",
                    )}
                  >
                    <HospitalIcon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">
                      {hospital.name}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                      <MapPin className="size-3 shrink-0" aria-hidden />
                      {hospital.area}, {hospital.city}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-teal-soft px-2.5 py-1 text-xs font-bold tabular-nums text-teal-deep">
                    {formatDistance(hospital.distanceKm)}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </StepPanel>

      <StepPanel
        tone="slate"
        step="04"
        stepLabel={t("request.step")}
        title={t("request.contact")}
        icon={UserRound}
        delayMs={340}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-ink">
              {t("request.yourName")} <span className="text-crimson">*</span>
            </span>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-3.5 text-ink shadow-sm outline-none transition focus:border-crimson/40 focus:ring-2 focus:ring-crimson/25"
              placeholder={t("request.namePlaceholder")}
              autoComplete="name"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-ink">
              {t("request.phone")} <span className="text-crimson">*</span>
            </span>
            <div
              className={cn(
                "mt-2 flex items-center rounded-2xl border bg-white/95 shadow-sm outline-none transition focus-within:ring-2",
                phoneTouched && phone.length !== 10
                  ? "border-crimson focus-within:border-crimson focus-within:ring-crimson/25"
                  : "border-slate-200 focus-within:border-crimson/40 focus-within:ring-crimson/25",
              )}
            >
              <span className="shrink-0 pl-4 font-display text-base font-extrabold text-ink">
                +91
              </span>
              <input
                value={phone}
                onChange={(e) => {
                  setPhoneTouched(true);
                  setPhone(indianMobileDigits(e.target.value));
                }}
                onBlur={() => setPhoneTouched(true)}
                className="min-w-0 flex-1 bg-transparent px-3 py-3.5 text-ink outline-none"
                placeholder="98765 43210"
                autoComplete="tel"
                inputMode="numeric"
                maxLength={10}
                required
              />
            </div>
            {phoneTouched && phone.length !== 10 ? (
              <p className="mt-1.5 text-xs font-bold text-crimson">{t("request.invalid")}</p>
            ) : null}
          </label>
        </div>
        <div className="mt-4">
          <div className="block">
            <label className="text-sm font-bold text-ink" htmlFor="request-notes">
              {t("request.notes")}{" "}
              <span className="font-normal text-ink-muted">{t("request.optional")}</span>
            </label>
            <input
              id="request-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-3.5 text-ink shadow-sm outline-none transition focus:border-crimson/40 focus:ring-2 focus:ring-crimson/25"
              placeholder={t("request.notesPlaceholder")}
            />
            <VoiceNoteRecorder blob={voiceBlob} onChange={setVoiceBlob} />
          </div>
        </div>
      </StepPanel>

      {error ? (
        <p
          role="alert"
          className="rounded-2xl border border-crimson/30 bg-crimson-soft px-4 py-3 text-sm font-semibold text-crimson-deep"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="shiny-card group relative inline-flex h-16 w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-[#c91833] via-[#e11d48] to-[#8a1024] text-lg font-extrabold text-white shadow-[0_20px_44px_-14px_rgba(201,24,51,0.9)] ring-1 ring-white/30 transition hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-70 sm:w-auto sm:min-w-80 sm:px-12"
      >
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent"
          aria-hidden
        />
        {submitting ? (
          <>
            <Loader2 className="relative size-5 animate-spin" /> {t("request.goingLive")}
          </>
        ) : (
          <>
            <Sparkles className="relative size-5 opacity-95" aria-hidden />
            <span className="relative">{t("request.submit")}</span>
          </>
        )}
      </button>
    </form>
  );
}
