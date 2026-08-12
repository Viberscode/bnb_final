import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Account",
  description:
    "Your BloodKit account — live requests and donor profile hub.",
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
