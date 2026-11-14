import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const planPrices: Record<string, string | undefined> = {
  essential: Deno.env.get("STRIPE_PRICE_ESSENTIAL"),
  professional: Deno.env.get("STRIPE_PRICE_PROFESSIONAL"),
  business: Deno.env.get("STRIPE_PRICE_BUSINESS"),
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return Response.json({ error: "Authentication required." }, { status: 401, headers: cors });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return Response.json({ error: "Invalid session." }, { status: 401, headers: cors });

    const body = await request.json();
    const plan = String(body.plan ?? "");
    const price = planPrices[plan];
    if (!price) return Response.json({ error: "This plan is not configured for checkout." }, { status: 400, headers: cors });

    const { data: activeSubscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .limit(1)
      .maybeSingle();
    if (subscriptionError) throw subscriptionError;
    if (activeSubscription) {
      return Response.json({ error: "Ya tienes una suscripción activa. Gestiona los cambios desde el portal de facturación." }, { status: 409, headers: cors });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
    const appUrl = Deno.env.get("APP_URL")!;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      success_url: appUrl + "/EnterpriseOS/account/?checkout=success",
      cancel_url: appUrl + "/EnterpriseOS/account/?checkout=cancel",
      metadata: { user_id: user.id, plan },
      subscription_data: { metadata: { user_id: user.id, plan } },
    });

    return Response.json({ url: session.url }, { headers: cors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout could not be created.";
    return Response.json({ error: message }, { status: 500, headers: cors });
  }
});
