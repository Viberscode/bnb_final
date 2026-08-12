import type { Metadata } from "next";
import { Suspense } from "react";
import AuthClientPage from "./auth-client";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to BloodKit with Google.",
};

export default function AuthRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-ink-muted">
          Loading sign-in…
        </div>
      }
    >
      <AuthClientPage />
    </Suspense>
  );
}
