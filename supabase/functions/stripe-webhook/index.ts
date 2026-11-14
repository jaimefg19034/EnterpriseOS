import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

function planForPrice(priceId: string): string | null {
  if (priceId === Deno.env.get("STRIPE_PRICE_ESSENTIAL")) return "essential";
  if (priceId === Deno.env.get("STRIPE_PRICE_PROFESSIONAL")) return "professional";
  if (priceId === Deno.env.get("STRIPE_PRICE_BUSINESS")) return "business";
  return null;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing Stripe signature", { status: 400 });

  try {
    const rawBody = await request.text();
    const event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );

    if (event.type.startsWith("customer.subscription.")) {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata.user_id;
      const priceId = subscription.items.data[0]?.price.id;
      const plan = priceId ? planForPrice(priceId) : null;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      if (!userId || !priceId || !plan) return new Response("Subscription metadata or price is invalid", { status: 400 });

      const { error } = await supabase.from("subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        plan,
        status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      }, { onConflict: "stripe_subscription_id" });
      if (error) throw error;
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook verification failed.";
    return new Response(message, { status: 400 });
  }
});
