export const PLAN_PRICE_ID = "unlimited_monthly";
export const PLAN_NAME = "My Salon Renters Unlimited";
export const PLAN_PRICE_LABEL = "£24.99";
export const TRIAL_DAYS = 14;

export function getPaymentsEnvironment(): "sandbox" | "live" {
  const token = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"];
  if (token?.startsWith("pk_test_") || token?.startsWith("test_")) return "sandbox";
  if (token?.startsWith("pk_live_") || token?.startsWith("live_")) return "live";
  // During local development the sandbox token must be present.
  // In production the live token is injected at build time.
  throw new Error("Payments client token is not configured for this build.");
}
