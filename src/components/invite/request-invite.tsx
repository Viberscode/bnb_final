"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { BloodGroupList } from "@/components/request-help/blood-group-mark";
import { donorMatchesRequest, neededBloodGroups } from "@/lib/blood-compatibility";
import {
  isOwnDonor,
  respondToRequestInvite,
  subscribeAssignments,
  syncAssignments,
} from "@/lib/donor-assignment";
import { fetchDonorProfile } from "@/lib/donor-profile";
import { fetchRequestById, isActiveRequestStatus } from "@/lib/live-requests";
import type { BloodRequest, DonorAssignment, DonorProfile } from "@/types";

export function RequestInvite({ requestId }: { requestId: string }) {
  const router = useRouter();
  const { user, status } = useAuth();
  const { t } = useLanguage();
  const [request, setRequest] = useState<BloodRequest | null | undefined>(
    undefined,
  );
  const [donor, setDonor] = useState<DonorProfile | null>(null);
  const [assignment, setAssignment] = useState<DonorAssignment | undefined>();
  const [working, setWorking] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      const nextRequest = await fetchRequestById(requestId);
      if (!active) return;
      setRequest(nextRequest);

      if (!user?.id || !nextRequest) {
        setDonor(null);
        setAssignment(nextRequest?.assignment);
        return;
      }

      const profile = await fetchDonorProfile(user.id);
      if (!active) return;
      setDonor(profile);

      const pool = profile ? [profile] : [];
      const [synced] = await syncAssignments([nextRequest], pool, {
        allowCreate: false,
      });
      if (!active) return;
      setRequest(synced ?? nextRequest);
      setAssignment(synced?.assignment);
    };

    void refresh();
    const unsub = subscribeAssignments(() => {
      void refresh();
    });
    return () => {
      active = false;
      unsub();
    };
  }, [requestId, user?.id]);

  const groups = useMemo(
    () => (request ? neededBloodGroups(request) : []),
    [request],
  );
  const urgencyLabel =
    request?.urgency === "critical"
      ? t("urgency.critical")
      : request?.urgency === "urgent"
        ? t("urgency.urgent")
        : t("urgency.planned");
  const eligible = Boolean(donor && assignment?.eligibleDonorIds?.includes(donor.id));
  const declined = Boolean(donor && assignment?.declinedDonorIds?.includes(donor.id));
  const compatible = Boolean(
    donor && request && donorMatchesRequest(donor.bloodGroup, request),
  );
  const own = Boolean(donor && request && isOwnDonor(request, donor));
  const live = Boolean(request && isActiveRequestStatus(request.status));

  async function reply(action: "accept" | "decline") {
    if (!donor || !request) return;
    setError(null);
    setWorking(action);
    try {
      const next = await respondToRequestInvite(request.id, donor, action, request);
      setAssignment(next);
      if (action === "accept") {
        router.push(`/requests?highlight=${request.id}`);
        return;
      }
    } catch {
      setError(t("invite.errReply"));
    }
    setWorking(null);
  }

  return (
    <main className="flex-1 bg-paper-atmosphere px-5 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/40 bg-white p-6 shadow-[0_30px_80px_-24px_rgba(28,13,20,0.35)] sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-crimson">
          {t("invite.kicker")}
        </p>

        {request === undefined || status === "loading" ? (
          <div className="mt-8 flex items-center justify-center py-10 text-ink-muted">
            <Loader2 className="size-6 animate-spin" aria-hidden />
          </div>
        ) : request === null ? (
          <>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink">
              {t("invite.missing")}
            </h1>
            <Link
              href="/requests"
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-crimson text-sm font-black uppercase tracking-wider text-white"
            >
              {t("invite.seeRequest")}
            </Link>
          </>
        ) : !live ? (
          <>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink">
              {t("invite.closedTitle")}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {t("invite.closedBody")}
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink">
              {t("invite.title")}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {t("invite.body")}
            </p>

            <dl className="mt-6 space-y-3 rounded-2xl bg-paper-atmosphere px-4 py-4 text-sm">
              <div>
                <dt className="text-xs font-black uppercase tracking-[0.14em] text-ink-muted">
                  {t("invite.need")}
                </dt>
                <dd className="mt-1 font-bold text-ink">
                  <BloodGroupList groups={groups} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase tracking-[0.14em] text-ink-muted">
                  {t("invite.hospital")}
                </dt>
                <dd className="mt-1 font-bold text-ink">
                  {request.hospitalName}
                  {request.hospitalArea ? ` · ${request.hospitalArea}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase tracking-[0.14em] text-ink-muted">
                  {t("invite.urgency")}
                </dt>
                <dd className="mt-1 font-bold text-ink">{urgencyLabel}</dd>
              </div>
              {donor ? (
                <div>
                  <dt className="text-xs font-black uppercase tracking-[0.14em] text-ink-muted">
                    {t("invite.yourGroup")}
                  </dt>
                  <dd className="mt-1 font-bold text-ink">{donor.bloodGroup}</dd>
                </div>
              ) : null}
            </dl>

            {status !== "authenticated" ? (
              <div className="mt-6">
                <h2 className="font-display text-xl font-extrabold text-ink">
                  {t("invite.signInTitle")}
                </h2>
                <p className="mt-1 mb-4 text-sm text-ink-muted">
                  {t("invite.signInBody")}
                </p>
                <GoogleSignInButton
                  callbackUrl={`/invite/${requestId}`}
                  label={t("invite.signIn")}
                />
              </div>
            ) : own ? (
              <p className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
                {t("invite.ownRequest")}
              </p>
            ) : !donor ? (
              <div className="mt-6">
                <h2 className="font-display text-xl font-extrabold text-ink">
                  {t("invite.becomeTitle")}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {t("invite.becomeBody")}
                </p>
                <Link
                  href={`/become-donor?next=${encodeURIComponent(`/invite/${requestId}`)}`}
                  className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-teal text-sm font-black uppercase tracking-wider text-white"
                >
                  {t("invite.becomeCta")}
                </Link>
              </div>
            ) : !compatible ? (
              <p className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
                {t("invite.incompatible", { group: donor.bloodGroup })}
              </p>
            ) : declined ? (
              <p className="mt-6 rounded-2xl bg-black/5 px-4 py-3 text-sm font-semibold text-ink">
                {t("invite.declined")}
              </p>
            ) : eligible ? (
              <div className="mt-6">
                <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-950">
                  {t("invite.accepted")}
                </p>
                <p className="mt-2 text-sm text-ink-muted">
                  {t("invite.acceptedBody")}
                </p>
                <Link
                  href={`/requests?highlight=${request.id}`}
                  className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-crimson text-sm font-black uppercase tracking-wider text-white"
                >
                  {t("invite.seeRequest")}
                </Link>
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={Boolean(working)}
                  onClick={() => void reply("accept")}
                  className="inline-flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-teal px-4 text-sm font-black uppercase tracking-wider text-white disabled:opacity-70"
                >
                  {working === "accept" ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Check className="size-4" aria-hidden />
                  )}
                  {working ? t("invite.working") : t("invite.accept")}
                </button>
                <button
                  type="button"
                  disabled={Boolean(working)}
                  onClick={() => void reply("decline")}
                  className="inline-flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-line bg-white px-4 text-sm font-black uppercase tracking-wider text-ink disabled:opacity-70"
                >
                  <X className="size-4" aria-hidden />
                  {t("invite.decline")}
                </button>
              </div>
            )}
          </>
        )}

        {error ? (
          <p role="alert" className="mt-4 text-center text-sm font-semibold text-crimson">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
