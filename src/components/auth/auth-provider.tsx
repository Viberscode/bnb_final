"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { tryCreateClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  status: AuthStatus;
  configured: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    configured ? "loading" : "unauthenticated",
  );

  const refresh = useCallback(async () => {
    const supabase = tryCreateClient();
    if (!supabase) {
      setSession(null);
      setStatus("unauthenticated");
      return;
    }
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    setStatus(data.session ? "authenticated" : "unauthenticated");
  }, []);

  useEffect(() => {
    const supabase = tryCreateClient();
    if (!supabase) return;

    void refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setStatus(nextSession ? "authenticated" : "unauthenticated");
    });

    return () => subscription.unsubscribe();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      status,
      configured,
      refresh,
      signOut: async () => {
        const supabase = tryCreateClient();
        if (supabase) await supabase.auth.signOut();
        setSession(null);
        setStatus("unauthenticated");
      },
    }),
    [session, status, configured, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
