import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live requests",
  description:
    "Open blood needs on BloodKit — urgency-sorted feed of requests that need donors now.",
};

export default function RequestsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
