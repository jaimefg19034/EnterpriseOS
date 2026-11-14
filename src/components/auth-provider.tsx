"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { PlanId } from "@/lib/plans";

type AuthUser = { id: string; email?: string };
type StoredSession = { access_token: string; refresh_token: string; expires_at?: number; user: AuthUser };
type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  user: AuthUser | null;
  plan: PlanId | null;
  subscriptionStatus: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  startCheckout: (plan: PlanId) => Promise<void>;
  openBillingPortal: () => Promise<void>;
  refreshPlan: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_KEY = "enterpriseos:auth-session:v1";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const apiBase = SUPABASE_URL.replace(/\/$/, "");

async function authRequest(path: string, body: unknown) {
  const response = await fetch(apiBase + "/auth/v1/" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.msg ?? payload.message ?? payload.error_description ?? "No se pudo completar la operación.");
  return payload;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [plan, setPlan] = useState<PlanId | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const saveSession = useCallback((next: StoredSession | null) => {
    setSession(next);
    if (next) window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(SESSION_KEY);
  }, []);

  const refreshPlan = useCallback(async () => {
    if (!session?.access_token || !session.user.id || !configured) {
      setPlan(null);
      setSubscriptionStatus(null);
      return;
    }
    const url = apiBase + "/rest/v1/subscriptions?select=plan,status&user_id=eq." +
      encodeURIComponent(session.user.id) + "&status=in.(active,trialing)&limit=1";
    const response = await fetch(url, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("No se pudo verificar la suscripción.");
    const rows = await response.json() as { plan: PlanId; status: string }[];
    const active = rows[0];
    setPlan(active && ["essential", "professional", "business"].includes(active.plan) ? active.plan : null);
    setSubscriptionStatus(active?.status ?? null);
  }, [session]);

  useEffect(() => {
    let cancelled = false;
    async function initialise() {
      if (!configured) {
        setLoading(false);
        return;
      }
      try {
        const raw = window.localStorage.getItem(SESSION_KEY);
        if (!raw) return;
        let current = JSON.parse(raw) as StoredSession;
        if (current.expires_at && current.expires_at * 1000 < Date.now() + 60000) {
          const refreshed = await authRequest("token?grant_type=refresh_token", { refresh_token: current.refresh_token });
          current = {
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token,
            expires_at: refreshed.expires_at,
            user: refreshed.user,
          };
          if (!cancelled) saveSession(current);
        }
        if (!cancelled) setSession(current);
      } catch {
        if (!cancelled) {
          window.localStorage.removeItem(SESSION_KEY);
          setSession(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void initialise();
    return () => { cancelled = true; };
  }, [saveSession]);

  // Synchronize the authenticated session with the external subscription record.
  useEffect(() => {
    if (!session) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshPlan().catch(() => undefined);
  }, [session, refreshPlan]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await authRequest("token?grant_type=password", { email, password });
    setPlan(null);
    setSubscriptionStatus(null);
    saveSession({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      expires_at: result.expires_at,
      user: result.user,
    });
    setLoading(false);
  }, [saveSession]);

  const signUp = useCallback(async (email: string, password: string) => {
    const result = await authRequest("signup", { email, password });
    if (result.access_token && result.user) {
      setPlan(null);
      setSubscriptionStatus(null);
      saveSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        expires_at: result.expires_at,
        user: result.user,
      });
      return true;
    }
    return false;
  }, [saveSession]);

  const signOut = useCallback(async () => {
    if (session?.access_token && configured) {
      await fetch(apiBase + "/auth/v1/logout", {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + session.access_token },
      });
    }
    saveSession(null);
    setPlan(null);
    setSubscriptionStatus(null);
  }, [saveSession, session]);

  const startCheckout = useCallback(async (selectedPlan: PlanId) => {
    if (!session?.access_token) throw new Error("Inicia sesión antes de contratar un plan.");
    const response = await fetch(apiBase + "/functions/v1/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + session.access_token,
      },
      body: JSON.stringify({ plan: selectedPlan }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.url) throw new Error(payload.error ?? "No se pudo iniciar el pago.");
    window.location.assign(payload.url as string);
  }, [session]);

  const openBillingPortal = useCallback(async () => {
    if (!session?.access_token) throw new Error("Inicia sesión para gestionar tu suscripción.");
    const response = await fetch(apiBase + "/functions/v1/create-portal-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + session.access_token,
      },
      body: JSON.stringify({}),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.url) throw new Error(payload.error ?? "No se pudo abrir el portal de facturación.");
    window.location.assign(payload.url as string);
  }, [session]);

  const value = useMemo<AuthContextValue>(() => ({
    configured, loading, user: session?.user ?? null, plan, subscriptionStatus,
    signIn, signUp, signOut, startCheckout, openBillingPortal, refreshPlan,
  }), [loading, session, plan, subscriptionStatus, signIn, signUp, signOut, startCheckout, openBillingPortal, refreshPlan]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
