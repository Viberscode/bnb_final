"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { useLanguage } from "@/components/i18n/language-provider";
import { cn } from "@/lib/utils";

interface SignInOptions {
  next?: string;
  message?: string;
}

interface SignInPromptContextValue {
  openSignIn: (options?: SignInOptions) => void;
  closeSignIn: () => void;
  requireAuth: (next: string, message?: string) => boolean;
}

const SignInPromptContext = createContext<SignInPromptContextValue | null>(
  null,
);

export function useSignInPrompt() {
  const ctx = useContext(SignInPromptContext);
  if (!ctx) {
    throw new Error("useSignInPrompt must be used within SignInPromptProvider");
  }
  return ctx;
}

function SignInPromptUrlListener({
  onOpen,
}: {
  onOpen: (options?: SignInOptions) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("signin") !== "1") return;
    const dest = searchParams.get("next") || "/";
    onOpen({ next: dest });
    const params = new URLSearchParams(searchParams.toString());
    params.delete("signin");
    params.delete("next");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [onOpen, pathname, router, searchParams]);

  return null;
}

function SignInPromptUrlListenerBoundary({
  onOpen,
}: {
  onOpen: (options?: SignInOptions) => void;
}) {
  return (
    <Suspense fallback={null}>
      <SignInPromptUrlListener onOpen={onOpen} />
    </Suspense>
  );
}

export function SignInPromptProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState("/");
  const [message, setMessage] = useState("");

  const closeSignIn = useCallback(() => {
    setOpen(false);
  }, []);

  const openSignIn = useCallback((options?: SignInOptions) => {
    setNext(options?.next || "/");
    setMessage(options?.message || t("auth.defaultMessage"));
    setOpen(true);
  }, [t]);

  const requireAuth = useCallback(
    (destination: string, promptMessage?: string) => {
      if (status === "authenticated") return true;
      openSignIn({ next: destination, message: promptMessage });
      return false;
    },
    [openSignIn, status],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSignIn();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeSignIn, open]);

  const value = useMemo(
    () => ({ openSignIn, closeSignIn, requireAuth }),
    [openSignIn, closeSignIn, requireAuth],
  );

  return (
    <SignInPromptContext.Provider value={value}>
      <SignInPromptUrlListenerBoundary onOpen={openSignIn} />
      {children}
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-5">
          <button
            type="button"
            aria-label={t("auth.closeSignIn")}
            className="absolute inset-0 bg-[#1c0d14]/65 backdrop-blur-[2px]"
            onClick={closeSignIn}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="signin-title"
            className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/40 bg-white p-6 shadow-[0_30px_80px_-24px_rgba(28,13,20,0.55)] sm:p-8"
          >
            <button
              type="button"
              onClick={closeSignIn}
              className="absolute right-3 top-3 rounded-xl p-2 text-ink-muted transition hover:bg-black/5 hover:text-ink"
              aria-label={t("auth.close")}
            >
              <X className="size-4" aria-hidden />
            </button>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-crimson">
              {t("auth.signIn")}
            </p>
            <h2
              id="signin-title"
              className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink"
            >
              {t("auth.continueGoogle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {message || t("auth.defaultMessage")}
            </p>
            <div className="mt-6">
              <GoogleSignInButton
                callbackUrl={next}
                label={t("auth.continueGoogle")}
              />
            </div>
            <p className="mt-4 text-center text-xs text-ink-muted">
              Your session syncs to BloodNearby in real time.
            </p>
          </div>
        </div>
      ) : null}
    </SignInPromptContext.Provider>
  );
}

/** Link that opens sign-in when the user is not authenticated. */
export function AuthGateLink({
  href,
  children,
  className,
  message,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  message?: string;
}) {
  const { status } = useAuth();
  const { requireAuth } = useSignInPrompt();
  const router = useRouter();

  return (
    <a
      href={href}
      className={cn(className)}
      onClick={(e) => {
        if (status === "authenticated") return;
        e.preventDefault();
        if (requireAuth(href, message)) router.push(href);
      }}
    >
      {children}
    </a>
  );
}
