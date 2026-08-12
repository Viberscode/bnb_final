import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Profile",
  description:
    "Your BloodKit donor dashboard — availability, trust score, and matching requests.",
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
