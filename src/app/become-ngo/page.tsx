"use client";

import { useEffect, useState } from "react";
import { BecomeNgoForm } from "@/components/ngo/become-ngo-form";
import { BecomeNgoHero } from "@/components/ngo/become-ngo-hero";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { useAuth } from "@/components/auth/auth-provider";
import { fetchNgoProfile, subscribeNgoProfile } from "@/lib/ngo-profile";

export default function BecomeNgoPage() {
  const { user } = useAuth();
  const [orgName, setOrgName] = useState<string | undefined>();

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const profile = await fetchNgoProfile(user?.id);
      if (!active) return;
      setOrgName(profile?.name);
    };
    void refresh();
    const unsub = subscribeNgoProfile(() => {
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
          className="pointer-events-none absolute inset-0 bg-dot-grid opacity-35"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-28 top-0 size-[28rem] rounded-full bg-sky-300/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-20 top-48 size-80 rounded-full bg-indigo-300/20 blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto max-w-5xl px-5 py-4 sm:px-8 sm:py-5">
          <BecomeNgoHero orgName={orgName} />
          <div className="mt-4">
            <BecomeNgoForm onSaved={setOrgName} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
