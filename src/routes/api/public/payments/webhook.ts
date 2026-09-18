import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhook } from "@/lib/stripe.server";
import { TRIAL_DAYS } from "@/lib/payments";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    );
  }
  return _supabase;
}

async function notify(userId: string, title: string, body: string) {
  const { data: salon } = await getSupabase()
    .from("salons")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();
  const salonId = (salon as { id?: string } | null)?.id;
  if (!salonId) return;

  await getSupabase().from("notifications").insert({
    user_id: userId,
    salon_id: salonId,
    type: "subscription",
    title,
    body,
  });
}

async function handleSubscriptionCreated(subscription: any) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }

  const item = subscription.items?.data?.[0];
  const priceId =
    item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const productId =
    typeof item?.price?.product === "string"
      ? item.price.product
      : item?.price?.product?.id;

  if (!priceId || !productId) {
    console.warn("Skipping subscription: missing price or product", {
      rawPriceId: item?.price?.id,
      rawProductId: productId,
    });
    return;
  }

  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id,
      product_id: productId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  await notify(
    userId,
    subscription.status === "trialing" ? "Free trial started" : "Subscription active",
    subscription.status === "trialing"
      ? `Your ${TRIAL_DAYS} day free trial of My Salon Renters Unlimited has started. You won't be charged until it ends.`
      : "Your My Salon Renters Unlimited plan is active. Thanks for subscribing!",
  );
}

async function handleSubscriptionUpdated(subscription: any) {
  const item = subscription.items?.data?.[0];
  const priceId =
    item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const productId =
    typeof item?.price?.product === "string"
      ? item.price.product
      : item?.price?.product?.id;

  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  const { data: rows } = await getSupabase()
    .from("subscriptions")
    .update({
      status: subscription.status,
      product_id: productId,
      price_id: priceId,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .select("user_id");

  const userId = (rows?.[0] as { user_id?: string } | undefined)?.user_id;
  if (!userId) return;

  if (subscription.status === "past_due") {
    await notify(
      userId,
      "Payment failed",
      "We couldn't take your My Salon Renters payment. Update your payment method to keep full access.",
    );
  } else if (subscription.cancel_at_period_end) {
    await notify(
      userId,
      "Plan set to cancel",
      "Your plan will end at the close of the current billing period. You'll keep full access until then.",
    );
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  const { data: rows } = await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .select("user_id");

  const userId = (rows?.[0] as { user_id?: string } | undefined)?.user_id;
  if (userId) {
    await notify(
      userId,
      "Subscription cancelled",
      "Your salon is now read only. Your data is safe. Resubscribe any time to start managing chairs and rent again.",
    );
  }
}

async function handleRentCheckout(session: any) {
  const meta = session.metadata ?? {};
  if (meta.kind !== "rent" || !meta.chargeId) return;
  if (session.payment_status !== "paid") return;

  const supabase = getSupabase();

  // Idempotent: the unique index on stripe_session_id blocks a second insert.
  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();
  if (existing) return;

  const { data: charge } = await supabase
    .from("rent_charges")
    .select("id, salon_id, renter_id, amount, currency")
    .eq("id", meta.chargeId)
    .maybeSingle();
  if (!charge) return;

  const amount = Number(session.amount_total ?? 0) / 100;

  const { error: insertError } = await supabase.from("payments").insert({
    salon_id: charge.salon_id,
    charge_id: charge.id,
    renter_id: charge.renter_id,
    amount,
    currency: (session.currency ?? charge.currency ?? "GBP").toUpperCase(),
    method: "bank_transfer",
    reference: "Paid from bank account",
    paid_at: new Date().toISOString(),
    receipt_issued_at: new Date().toISOString(),
    stripe_session_id: session.id,
    stripe_payment_intent_id:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id,
  });
  if (insertError) {
    console.error("Rent payment insert failed:", insertError);
    return;
  }

  const { data: paidRows } = await supabase
    .from("payments")
    .select("amount")
    .eq("charge_id", charge.id);
  const paidTotal = (paidRows ?? []).reduce(
    (sum: number, row: any) => sum + Number(row.amount),
    0,
  );

  if (paidTotal + 0.005 >= Number(charge.amount)) {
    await supabase
      .from("rent_charges")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", charge.id);
  }

  const { data: salon } = await supabase
    .from("salons")
    .select("owner_id")
    .eq("id", charge.salon_id)
    .maybeSingle();

  const ownerId = (salon as { owner_id?: string } | null)?.owner_id;
  if (ownerId) {
    await supabase.from("notifications").insert({
      user_id: ownerId,
      salon_id: charge.salon_id,
      charge_id: charge.id,
      type: "payment_receipt",
      title: "Rent paid from bank",
      body: `A renter paid ${amount.toFixed(2)} straight from their bank account. It is on its way to your payout account.`,
    });
  }
}

async function handleWebhook(req: Request) {
  const event = await verifyWebhook(req);

  switch (event.type) {
    case "customer.subscription.created":
      await handleSubscriptionCreated(event.data.object);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object);
      break;
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await handleRentCheckout(event.data.object);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await handleWebhook(request);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
