"use client";

import type { ReactNode } from "react";
import { SignInPromptProvider } from "@/components/auth/sign-in-prompt";

export function SignInPromptRoot({ children }: { children: ReactNode }) {
  return <SignInPromptProvider>{children}</SignInPromptProvider>;
}
