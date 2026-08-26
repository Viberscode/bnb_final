import type { Metadata } from "next";
import { RequestInvite } from "@/components/invite/request-invite";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Donor invite",
  description: "Accept or decline a live BloodNearby request from WhatsApp.",
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;

  return (
    <>
      <SiteHeader
        variant="solid"
        className="relative border-b border-line bg-paper-elevated"
      />
      <RequestInvite requestId={requestId} />
      <SiteFooter />
    </>
  );
}
