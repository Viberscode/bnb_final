"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Plus, Radio } from "lucide-react";
import { MyRequestCard } from "@/components/profile/my-request-card";
import { DonorSearchModal } from "@/components/request-help/donor-search-modal";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { useAssignmentEngine } from "@/hooks/use-assignment-engine";
import { startAssignmentForRequest, waitForAnotherDonor, withAssignments } from "@/lib/donor-assignment";
import { fetchAvailableDonorsPage } from "@/lib/donor-profile";
import {
  completeLiveRequest,
  fetchMyLiveRequestsPage,
  subscribeLiveRequests,
} from "@/lib/live-requests";
import { MATCH_DONOR_LIMIT, MY_REQUEST_PAGE_SIZE, mergeUniqueById } from "@/lib/pagination";
import type { BloodRequest, DonorProfile } from "@/types";

export default function MyRequestsPage() {
  const { user, status } = useAuth();
  const { t } = useLanguage();
  const [myRequests, setMyRequests] = useState<BloodRequest[]>([]);
  const [donors, setDonors] = useState<DonorProfile[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [ready, setReady] = useState(false);
  const [watchId, setWatchId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [waitingId, setWaitingId] = useState<string | null>(null);
  const ownedRequests = useMemo(
    () =>
      myRequests.map((request) =>
        user?.id && !request.userId
          ? { ...request, userId: user.id }
          : request,
      ),
    [myRequests, user?.id],
  );
  const otherDonors = useMemo(
    () => (user?.id ? donors.filter((donor) => donor.id !== user.id) : donors),
    [donors, user?.id],
  );
  const now = useAssignmentEngine(ownedRequests, otherDonors);
  const assigned = useMemo(
    () => withAssignments(ownedRequests, otherDonors),
    [ownedRequests, otherDonors, now],
  );

  useEffect(() => {
    const accepted = assigned.find(
      (request) => request.assignment?.status === "accepted",
    );
    if (accepted) {
      setWatchId(accepted.id);
    }
  }, [
    assigned
      .map(
        (request) =>
          `${request.id}:${request.assignment?.status}:${request.assignment?.assignedAt}`,
      )
      .join("|"),
  ]);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      const [page, donorPage] = await Promise.all([
        fetchMyLiveRequestsPage(user?.id, 0, MY_REQUEST_PAGE_SIZE),
        fetchAvailableDonorsPage(0, MATCH_DONOR_LIMIT),
      ]);
      if (!active) return;
      setMyRequests(page.items);
      setHasMore(page.hasMore);
      setDonors(donorPage.items);
      setReady(true);
    };

    void refresh();
    const unsub = subscribeLiveRequests(() => {
      void refresh();
    });

    return () => {
      active = false;
      unsub();
    };
  }, [user?.id]);

  return (
    <>
      <SiteHeader
        variant="solid"
        className="relative border-b border-line/70 bg-white/80 backdrop-blur-md"
      />
      <main className="relative flex-1 overflow-hidden bg-blood-flow">
        <div
          className="pointer-events-none absolute inset-0 bg-dot-grid opacity-25"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-24 top-0 size-72 rounded-full bg-crimson/12 blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto max-w-3xl px-5 py-6 sm:px-8 sm:py-8">
          {!ready || status === "loading" ? (
            <p className="py-20 text-center text-ink-muted">{t("profile.loadingRequests")}</p>
          ) : status !== "authenticated" || !user ? (
            <div className="py-20 text-center">
              <p className="text-ink-muted">{t("profile.signInRequests")}</p>
              <Link
                href="/?signin=1&next=/profile/requests"
                className="mt-4 inline-flex h-10 items-center rounded-xl bg-crimson px-4 text-sm font-bold text-white"
              >
                {t("profile.signIn")}
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <Link
                    href="/profile"
                    className="text-xs font-bold uppercase tracking-[0.18em] text-crimson hover:underline"
                  >
                    {t("profile.backAccount")}
                  </Link>
                  <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-ink sm:text-4xl">
                    {t("profile.my")}{" "}
                    <span className="request-heading-live bg-gradient-to-r from-[#9f1239] via-[#ff2d4a] to-[#c4122f] bg-clip-text text-transparent">
                      {t("profile.requestsAccent")}
                    </span>
                  </h1>
                  <p className="mt-1 text-sm text-ink-muted">
                    {t("profile.trackerBody")}
                  </p>
                </div>
                <Link
                  href="/request-help"
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ff4d6d] to-[#c4122f] px-4 text-sm font-bold text-white shadow-[0_12px_28px_-14px_rgba(196,18,47,0.65)]"
                >
                  {t("profile.newRequest")}
                  <Plus className="size-4" aria-hidden />
                </Link>
              </header>

              <section
                className="request-step-panel p-5 sm:p-6"
                data-tone="crimson"
              >
                <div className="space-y-3">
                  {assigned.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-crimson/25 bg-white/70 px-5 py-12 text-center">
                      <span className="mx-auto inline-flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff4d6d] to-[#8e0c22] text-white">
                        <Radio className="size-5" aria-hidden />
                      </span>
                      <p className="mt-4 font-display text-xl font-extrabold text-ink">
                        {t("profile.noRequests")}
                      </p>
                      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
                        {t("profile.noRequestsBody")}
                      </p>
                      <Link
                        href="/request-help"
                        className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-xl bg-crimson px-4 text-sm font-bold text-white hover:bg-crimson-deep"
                      >
                        {t("profile.requestHelp")}
                        <ArrowUpRight className="size-4" aria-hidden />
                      </Link>
                    </div>
                  ) : (
                    assigned.map((request) => (
                      <MyRequestCard
                        key={request.id}
                        request={request}
                        onWatchSearch={() => setWatchId(request.id)}
                        confirming={completingId === request.id}
                        waiting={waitingId === request.id}
                        onConfirmSolved={() => {
                          setCompletingId(request.id);
                          void completeLiveRequest(request.id)
                            .then(() =>
                              fetchMyLiveRequestsPage(user.id, 0, MY_REQUEST_PAGE_SIZE),
                            )
                            .then((page) => {
                              setMyRequests(page.items);
                              setHasMore(page.hasMore);
                            })
                            .finally(() => setCompletingId(null));
                        }}
                        onWaitMore={() => {
                          setWaitingId(request.id);
                          void waitForAnotherDonor(request.id)
                            .then(() => startAssignmentForRequest(request, otherDonors))
                            .then(() =>
                              fetchMyLiveRequestsPage(user.id, 0, MY_REQUEST_PAGE_SIZE),
                            )
                            .then((page) => {
                              setMyRequests(page.items);
                              setHasMore(page.hasMore);
                            })
                            .finally(() => setWaitingId(null));
                        }}
                      />
                    ))
                  )}
                  {hasMore ? (
                    <button
                      type="button"
                      disabled={loadingMore}
                      onClick={() => {
                        if (!user?.id) return;
                        setLoadingMore(true);
                        void fetchMyLiveRequestsPage(
                          user.id,
                          myRequests.length,
                          MY_REQUEST_PAGE_SIZE,
                        )
                          .then((page) => {
                            setMyRequests((prev) =>
                              mergeUniqueById(prev, page.items),
                            );
                            setHasMore(page.hasMore);
                          })
                          .finally(() => setLoadingMore(false));
                      }}
                      className="flex h-11 w-full items-center justify-center rounded-2xl border border-line bg-white text-sm font-bold text-ink hover:bg-black/[0.02] disabled:opacity-60"
                    >
                      {loadingMore ? t("profile.loadingMore") : t("profile.loadMore")}
                    </button>
                  ) : null}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
      {watchId
        ? (() => {
            const watching = assigned.find((item) => item.id === watchId);
            return watching ? (
              <DonorSearchModal
                request={watching}
                onClose={() => setWatchId(null)}
              />
            ) : null;
          })()
        : null}
    </>
  );
}
