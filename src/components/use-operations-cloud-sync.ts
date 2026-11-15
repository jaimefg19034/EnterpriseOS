"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { parseOperationsState, type OperationsState } from "@/domain/operations";
import type { Language } from "@/i18n/translations";

const URL_VALUE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SESSION_KEY = "enterpriseos:auth-session:v1";

export function useOperationsCloudSync(data: OperationsState, setData: React.Dispatch<React.SetStateAction<OperationsState>>, loaded: boolean, language: Language) {
  const { configured, loading, user } = useAuth();
  const [status, setStatus] = useState(language === "es" ? "Solo este navegador" : "This browser only");
  const [ready, setReady] = useState(false);
  const lastUpdated = useRef<string | null>(null);
  const skipNextSave = useRef(false);

  useEffect(() => {
    if (loading || !loaded) return;
    let cancelled = false;
    async function load() {
      if (!configured || !user?.id) { setStatus(language === "es" ? "Solo este navegador" : "This browser only"); setReady(true); return; }
      setReady(false);
      setStatus(language === "es" ? "Conectando con la nube…" : "Connecting to cloud…");
      try {
        const session = JSON.parse(window.localStorage.getItem(SESSION_KEY) || "{}");
        const base = URL_VALUE.replace(/\/$/, "");
        const endpoint = base + "/rest/v1/operations_workspaces?select=data,updated_at&user_id=eq." + encodeURIComponent(user.id) + "&limit=1";
        const response = await fetch(endpoint, { headers: { apikey: ANON_KEY, Authorization: "Bearer " + (session.access_token ?? "") }, cache: "no-store" });
        if (!response.ok) throw new Error("read failed");
        const rows = await response.json() as { data: unknown; updated_at: string }[];
        if (cancelled) return;
        if (rows[0]) {
          const restored = parseOperationsState(JSON.stringify(rows[0].data));
          if (restored) { skipNextSave.current = true; setData(restored); }
          lastUpdated.current = rows[0].updated_at;
        }
        setStatus(language === "es" ? "Sincronizado con tu cuenta" : "Synced to your account");
      } catch {
        if (!cancelled) setStatus(language === "es" ? "Nube no disponible · copia local activa" : "Cloud unavailable · local copy active");
      } finally { if (!cancelled) setReady(true); }
    }
    void load();
    return () => { cancelled = true; };
  }, [loading, configured, user?.id, loaded, language, setData]);

  useEffect(() => {
    if (!ready || !configured || !user?.id) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    const timer = window.setTimeout(async () => {
      try {
        const session = JSON.parse(window.localStorage.getItem(SESSION_KEY) || "{}");
        if (!session.access_token) throw new Error("missing session");
        const endpoint = URL_VALUE.replace(/\/$/, "") + "/rest/v1/operations_workspaces?on_conflict=user_id";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { apikey: ANON_KEY, Authorization: "Bearer " + session.access_token, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify({ user_id: user.id, data, updated_at: new Date().toISOString() }),
        });
        if (!response.ok) throw new Error("write failed");
        const rows = await response.json().catch(() => []);
        if (rows?.[0]?.updated_at) lastUpdated.current = rows[0].updated_at;
        setStatus(language === "es" ? "Guardado y sincronizado con tu cuenta" : "Saved and synced to your account");
      } catch { setStatus(language === "es" ? "Error de sincronización · datos locales conservados" : "Sync error · local data preserved"); }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [data, ready, configured, user?.id, language]);

  useEffect(() => {
    if (!ready || !configured || !user?.id) return;
    const interval = window.setInterval(async () => {
      try {
        const session = JSON.parse(window.localStorage.getItem(SESSION_KEY) || "{}");
        if (!session.access_token) return;
        const endpoint = URL_VALUE.replace(/\/$/, "") + "/rest/v1/operations_workspaces?select=data,updated_at&user_id=eq." + encodeURIComponent(user.id) + "&limit=1";
        const response = await fetch(endpoint, { headers: { apikey: ANON_KEY, Authorization: "Bearer " + session.access_token }, cache: "no-store" });
        if (!response.ok) return;
        const rows = await response.json() as { data: unknown; updated_at: string }[];
        if (!rows[0] || !lastUpdated.current || rows[0].updated_at <= lastUpdated.current) return;
        const restored = parseOperationsState(JSON.stringify(rows[0].data));
        if (restored) { skipNextSave.current = true; setData(restored); lastUpdated.current = rows[0].updated_at; setStatus(language === "es" ? "Actualizado desde la nube" : "Updated from cloud"); }
      } catch { /* Keep last valid local data during network interruptions. */ }
    }, 15000);
    return () => window.clearInterval(interval);
  }, [ready, configured, user?.id, language, setData]);

  return status;
}
