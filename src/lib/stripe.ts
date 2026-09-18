import { loadStripe, type Stripe } from "@stripe/stripe-js";

const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"];

function assertPaymentsConfigured(): void {
  if (!clientToken?.startsWith("pk_test_") && !clientToken?.startsWith("pk_live_")) {
    throw new Error(
      "Payments are not configured for this build. Complete payments setup to enable checkout.",
    );
  }
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    assertPaymentsConfigured();
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}

export function isTestMode(): boolean {
  return !!clientToken?.startsWith("pk_test_");
}
