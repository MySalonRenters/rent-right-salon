import { createServerFn } from "@tanstack/react-start";
import type Stripe from "stripe";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type PayoutAccountStatus = {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsDue: string[];
};

type StatusResult = PayoutAccountStatus | { error: string };
type LinkResult = { url: string } | { error: string };

async function loadOwnedSalon(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("salons")
    .select("id, name, currency, stripe_account_id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("You don't have a salon yet");
  return data as {
    id: string;
    name: string;
    currency: string;
    stripe_account_id: string | null;
  };
}

/** Owner: current state of the salon's connected payout account. */
export const getPayoutAccountStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StatusResult> => {
    try {
      const salon = await loadOwnedSalon(context.supabase, context.userId);
      const accountId = salon.stripe_account_id;

      if (!accountId) {
        return {
          connected: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          requirementsDue: [],
        };
      }

      const stripe = createStripeClient();

      let chargesEnabled = false;
      let payoutsEnabled = false;
      let detailsSubmitted = false;
      let requirementsDue: string[] = [];

      try {
        const v2Account = await (stripe as any).v2.core.accounts.retrieve(accountId, {
          include: ["configuration.recipient", "requirements"],
        });
        const balance = v2Account.configuration?.recipient?.capabilities?.stripe_balance;
        payoutsEnabled =
          balance?.stripe_transfers?.status === "active" || balance?.payouts?.status === "active";
        chargesEnabled = payoutsEnabled;

        requirementsDue = (v2Account.requirements?.entries ?? [])
          .filter((entry: any) => entry.awaiting_requirement || entry.minimum_deadline)
          .map((entry: any) => entry.description ?? entry.requirement ?? "information")
          .slice(0, 10);
        detailsSubmitted = requirementsDue.length === 0;
      } catch {
        const account = await stripe.accounts.retrieve(accountId);
        chargesEnabled = account.charges_enabled ?? false;
        payoutsEnabled = account.payouts_enabled ?? false;
        detailsSubmitted = account.details_submitted ?? false;
        requirementsDue = account.requirements?.currently_due ?? [];
      }

      await context.supabase
        .from("salons")
        .update({
          stripe_charges_enabled: chargesEnabled,
          stripe_payouts_enabled: payoutsEnabled,
          stripe_details_submitted: detailsSubmitted,
        })
        .eq("id", salon.id);

      return {
        connected: true,
        chargesEnabled,
        payoutsEnabled,
        detailsSubmitted,
        requirementsDue,
      };

    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Owner: create (if needed) the connected account and return an onboarding link. */
export const startPayoutOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl: string }) => {
    if (!/^https?:\/\//.test(data.returnUrl)) throw new Error("Invalid return URL");
    return data;
  })
  .handler(async ({ data, context }): Promise<LinkResult> => {
    try {
      const salon = await loadOwnedSalon(context.supabase, context.userId);
      const stripe = createStripeClient();

      let accountId = salon.stripe_account_id;
      let isV2Account = false;

      if (!accountId) {
        const {
          data: { user },
        } = await context.supabase.auth.getUser();

        // Accounts v2 is the current Connect account model.
        const account = await (stripe as any).v2.core.accounts.create({
          display_name: salon.name,
          ...(user?.email ? { contact_email: user.email } : {}),
          identity: { country: "gb" },
          include: ["configuration.recipient", "requirements"],
          dashboard: "express",
          configuration: {
            recipient: {
              capabilities: {
                stripe_balance: {
                  stripe_transfers: { requested: true },
                },
              },
            },
          },

          defaults: {
            currency: (salon.currency || "gbp").toLowerCase(),
            responsibilities: { fees_collector: "application", losses_collector: "application" },
          },
          metadata: { salonId: salon.id, userId: context.userId },
        });
        accountId = account.id as string;
        isV2Account = true;

        const { error } = await context.supabase
          .from("salons")
          .update({ stripe_account_id: accountId })
          .eq("id", salon.id);
        if (error) throw new Error(error.message);
      }

      try {
        const link = await (stripe as any).v2.core.accountLinks.create({
          account: accountId,
          use_case: {
            type: "account_onboarding",
            account_onboarding: {
              configurations: ["recipient"],
              refresh_url: data.returnUrl,
              return_url: data.returnUrl,
            },
          },
        });
        return { url: link.url as string };
      } catch (linkError) {
        if (isV2Account) throw linkError;
        // Older v1 accounts created before the upgrade.
        const legacyLink = await stripe.accountLinks.create({
          account: accountId!,
          refresh_url: data.returnUrl,
          return_url: data.returnUrl,
          type: "account_onboarding",
        });
        return { url: legacyLink.url };
      }
    } catch (error) {
      const message = getStripeErrorMessage(error);
      if (/signed up for Connect|Connect, which you can do/i.test(message)) {
        return {
          error:
            "Bank payouts aren't switched on for your payment account yet. Ask our support team to enable payouts to salon bank accounts, then try again.",
        };
      }
      return { error: message };
    }

  });


/** Owner: link into the Stripe-hosted dashboard for the connected account. */
export const openPayoutDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LinkResult> => {
    try {
      const salon = await loadOwnedSalon(context.supabase, context.userId);
      const accountId = salon.stripe_account_id;
      if (!accountId) throw new Error("No payout account connected yet");

      const stripe = createStripeClient();
      const login = await stripe.accounts.createLoginLink(accountId);
      return { url: login.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Renter: bank-to-bank checkout for one rent charge, paid into the salon's account. */
export const createRentBankPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { chargeId: string; returnUrl: string }) => {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.chargeId)
    ) {
      throw new Error("Invalid charge");
    }
    if (!/^https?:\/\//.test(data.returnUrl)) throw new Error("Invalid return URL");
    return data;
  })
  .handler(async ({ data, context }): Promise<LinkResult> => {
    try {
      // RLS keeps this to charges the caller is allowed to see.
      const { data: charge, error: chargeError } = await context.supabase
        .from("rent_charges")
        .select("id, salon_id, renter_id, amount, currency, status, due_date")
        .eq("id", data.chargeId)
        .maybeSingle();
      if (chargeError) throw new Error(chargeError.message);
      if (!charge) throw new Error("Rent charge not found");
      if (charge.renter_id !== context.userId) throw new Error("Not your rent charge");
      if (charge.status === "paid" || charge.status === "void") {
        throw new Error("This rent charge is already settled");
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: salon } = await supabaseAdmin
        .from("salons")
        .select("id, name, stripe_account_id, stripe_charges_enabled")
        .eq("id", charge.salon_id)
        .maybeSingle();

      if (!salon?.stripe_account_id || !salon.stripe_charges_enabled) {
        throw new Error("This salon has not finished setting up bank payments yet");
      }

      // Already-received part payments reduce what is still owed.
      const { data: priorPayments } = await supabaseAdmin
        .from("payments")
        .select("amount")
        .eq("charge_id", charge.id);
      const alreadyPaid = (priorPayments ?? []).reduce(
        (sum: number, row: { amount: number | string }) => sum + Number(row.amount),
        0,
      );
      const remaining = Math.round((Number(charge.amount) - alreadyPaid) * 100);
      if (remaining <= 0) throw new Error("This rent charge is already settled");

      const stripe = createStripeClient();
      const currency = (charge.currency || "GBP").toLowerCase();

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["pay_by_bank", "bacs_debit"],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: remaining,
              product_data: {
                name: `Chair rent · ${salon.name}`,
                description: `Rent due ${charge.due_date}`,
              },
            },
          },
        ],
        success_url: `${data.returnUrl}?rent=paid`,
        cancel_url: `${data.returnUrl}?rent=cancelled`,
        payment_intent_data: {
          on_behalf_of: salon.stripe_account_id,
          transfer_data: { destination: salon.stripe_account_id },
          metadata: { kind: "rent", chargeId: charge.id, salonId: charge.salon_id },
        },
        metadata: {
          kind: "rent",
          chargeId: charge.id,
          salonId: charge.salon_id,
          renterId: context.userId,
        },
      } as Stripe.Checkout.SessionCreateParams);

      if (!session.url) throw new Error("Stripe did not return a payment page");
      return { url: session.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
