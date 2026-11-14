"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { PLANS, type PlanId } from "@/lib/plans";

export default function AccountPage() {
  const auth = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "plans" | "manage">("login");
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("professional");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [routeReady, setRouteReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedPlan = params.get("plan");
    if (requestedPlan === "essential" || requestedPlan === "professional" || requestedPlan === "business") {
      setSelectedPlan(requestedPlan);
      setMode("signup");
    }
    if (params.get("mode") === "signup") setMode("signup");
    if (params.get("mode") === "plans") setMode("plans");
    if (params.get("mode") === "manage") setMode("manage");
    if (params.get("checkout") === "success") setMessage("Pago recibido. Estamos verificando tu suscripción; actualiza esta página en unos segundos.");
    if (params.get("checkout") === "cancel") setMessage("El pago se ha cancelado. No se ha activado ningún plan.");
    setRouteReady(true);
  }, []);

  useEffect(() => {
    if (!routeReady) return;
    if (!auth.loading && auth.user && mode !== "manage") {
      if (auth.plan) window.location.replace("/EnterpriseOS/");
      else setMode("plans");
    }
    if (!auth.loading && !auth.user && mode === "manage") setMode("login");
  }, [routeReady, auth.loading, auth.user, auth.plan, mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      if (mode === "login") {
        await auth.signIn(email, password);
        await auth.refreshPlan();
        window.location.assign("/EnterpriseOS/");
      } else {
        const signedIn = await auth.signUp(email, password);
        if (signedIn) {
          setMessage("Cuenta creada. Elige tu plan para continuar.");
          setMode("plans");
        } else {
          setMessage("Te hemos enviado un correo para confirmar la cuenta. Cuando la confirmes, inicia sesión y elige tu plan.");
          setMode("login");
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ha ocurrido un error.");
    } finally {
      setBusy(false);
    }
  }

  async function checkout() {
    setError("");
    setBusy(true);
    try {
      await auth.startCheckout(selectedPlan);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo iniciar el pago.");
      setBusy(false);
    }
  }

  return (
    <main className="eos-account">
      <a className="eos-account-brand" href="/EnterpriseOS/platform/"><span>EO</span><b>ENTERPRISEOS</b></a>
      <div className="eos-account-shell">
        <section className="eos-account-intro">
          <span className="eos-account-kicker">THE FINANCIAL ATLAS</span>
          <h1>Tu claridad financiera empieza aquí.</h1>
          <p>Accede a tu espacio de trabajo y a las herramientas incluidas en tu suscripción.</p>
          <div className="eos-account-security"><span /> ACCESO SEGURO A TU CUENTA</div>
        </section>

        <section className="eos-account-panel">
          {!auth.configured ? (
            <div className="eos-account-state">
              <h2>Autenticación pendiente de configuración</h2>
              <p>La interfaz ya está preparada, pero todavía no hay un proyecto Supabase conectado. Para activar cuentas reales hay que configurar la URL pública y la clave anónima del proyecto, además de aplicar la migración de base de datos.</p>
            </div>
          ) : auth.loading ? (
            <div className="eos-account-state"><h2>Comprobando tu sesión…</h2></div>
          ) : mode === "manage" ? (
            <div className="eos-account-state">
              <span className="eos-account-kicker">BILLING / ACCOUNT</span>
              <h2>Gestiona tu suscripción</h2>
              {auth.plan ? (
                <>
                  <p>Tu plan actual es <strong>{PLANS[auth.plan].name}</strong> — {PLANS[auth.plan].monthlyPrice} €/mes. Estado: {auth.subscriptionStatus ?? "verificando"}.</p>
                  <button className="eos-account-submit" type="button" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await auth.openBillingPortal(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo abrir la facturación."); setBusy(false); } }}>{busy ? "Abriendo facturación…" : "Cambiar o cancelar mi plan"}</button>
                  <button className="eos-account-switch" type="button" onClick={() => window.location.assign("/EnterpriseOS/")}>Volver al workspace</button>
                </>
              ) : (
                <>
                  <p>No hay una suscripción activa en esta cuenta.</p>
                  <button className="eos-account-submit" type="button" onClick={() => setMode("plans")}>Ver planes disponibles</button>
                </>
              )}
            </div>
          ) : mode === "plans" ? (
            <div className="eos-account-state">
              <span className="eos-account-kicker">ELIGE TU ACCESO</span>
              <h2>Selecciona tu plan</h2>
              <p>{auth.user ? "Tu cuenta está lista. Contrata el plan que mejor encaje con tu empresa." : "Crea una cuenta para contratar una suscripción."}</p>
              <div className="eos-account-plan-list">
                {(Object.keys(PLANS) as PlanId[]).map((id) => (
                  <button type="button" key={id} className={"eos-account-plan " + (selectedPlan === id ? "is-selected" : "")} onClick={() => setSelectedPlan(id)}>
                    <span><b>{PLANS[id].name}</b><small>{PLANS[id].description}</small></span>
                    <strong>{PLANS[id].monthlyPrice} €<small>/mes</small></strong>
                  </button>
                ))}
              </div>
              {auth.user ? (
                <button className="eos-account-submit" type="button" onClick={checkout} disabled={busy}>{busy ? "Conectando con Stripe…" : "Continuar al pago"}</button>
              ) : (
                <button className="eos-account-submit" type="button" onClick={() => setMode("signup")}>Crear cuenta y continuar</button>
              )}
              <button className="eos-account-switch" type="button" onClick={() => auth.user ? void auth.signOut() : setMode("login")}>{auth.user ? "Cerrar sesión" : "Ya tengo una cuenta"}</button>
            </div>
          ) : (
            <div className="eos-account-state">
              <span className="eos-account-kicker">{mode === "login" ? "BIENVENIDO DE NUEVO" : "EMPIEZA CON ENTERPRISEOS"}</span>
              <h2>{mode === "login" ? "Iniciar sesión" : "Crear tu cuenta"}</h2>
              <p>{mode === "login" ? "Entra en tu workspace financiero." : "Regístrate para configurar el acceso de tu empresa."}</p>
              <form className="eos-account-form" onSubmit={submit}>
                <label>Correo electrónico<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@empresa.com" /></label>
                <label>Contraseña<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 8 caracteres" /></label>
                <button className="eos-account-submit" disabled={busy}>{busy ? "Un momento…" : mode === "login" ? "Entrar en mi cuenta" : "Crear cuenta"}</button>
              </form>
              <button className="eos-account-switch" type="button" onClick={() => { setError(""); setMessage(""); setMode(mode === "login" ? "signup" : "login"); }}>{mode === "login" ? "¿Aún no tienes cuenta? Crear cuenta" : "¿Ya tienes cuenta? Iniciar sesión"}</button>
              <button className="eos-account-switch" type="button" onClick={() => setMode("plans")}>Ver los tres planes</button>
            </div>
          )}
          {message && <p className="eos-account-message" role="status">{message}</p>}
          {error && <p className="eos-account-error" role="alert">{error}</p>}
        </section>
      </div>
      <footer className="eos-account-footer"><span>© 2026 ENTERPRISEOS</span><span>FINANCIAL DECISION INTELLIGENCE</span></footer>
    </main>
  );
}
