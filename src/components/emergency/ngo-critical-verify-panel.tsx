"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { tryCreateClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type PendingRequest = {
  id: string;
  hospital_name: string;
  blood_group: string;
  urgency: string;
  created_at: string;
};

export function NgoCriticalVerifyPanel({ ngoUserId }: { ngoUserId: string }) {
  const [rows, setRows] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }
      const supabase = tryCreateClient();
      if (!supabase) return;
      const { data } = await supabase
        .from("blood_requests")
        .select("id, hospital_name, blood_group, urgency, created_at, verification_status")
        .eq("urgency", "critical")
        .eq("verification_status", "pending")
        .in("status", ["pending", "matching", "donor_accepted", "donor_enroute"])
        .order("created_at", { ascending: false })
        .limit(8);
      if (active) {
        setRows((data as PendingRequest[] | null) ?? []);
        setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 12_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [ngoUserId]);

  async function verify(requestId: string) {
    setBusyId(requestId);
    try {
      const res = await fetch("/api/emergency/escalate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "verify" }),
      });
      if (res.ok) {
        setRows((prev) => prev.filter((row) => row.id !== requestId));
      }
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <p className="mt-6 flex items-center gap-2 text-sm text-ink-muted">
        <Loader2 className="size-4 animate-spin" /> Loading critical requests…
      </p>
    );
  }

  if (!rows.length) return null;

  return (
    <section className="mt-8 rounded-2xl border border-sky-200 bg-white p-4 shadow-sm">
      <h2 className="flex items-center gap-2 font-display text-lg font-black text-ink">
        <ShieldCheck className="size-5 text-sky-700" aria-hidden />
        Critical requests awaiting verification
      </h2>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line/60 bg-sky-50/40 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">
                {row.hospital_name} · {row.blood_group}
              </p>
              <p className="text-xs text-ink-muted">
                {new Date(row.created_at).toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              disabled={busyId === row.id}
              onClick={() => void verify(row.id)}
              className="rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
            >
              {busyId === row.id ? "Verifying…" : "Verify & escalate"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
