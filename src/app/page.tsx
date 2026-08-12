import { CompatibilityChecker } from "@/components/landing/compatibility-checker";
import { LandingHero } from "@/components/landing/landing-hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { NetworkStatus } from "@/components/landing/network-status";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { DEMO_NETWORK_STATS } from "@/data/demo";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <LandingHero />
        <NetworkStatus stats={DEMO_NETWORK_STATS} />
        <HowItWorks />
        <CompatibilityChecker />
      </main>
      <SiteFooter />
    </>
  );
}
