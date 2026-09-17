import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CreditCard,
  ExternalLink,
  Loader2,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useMembership } from "@/hooks/use-session";
import { useSubscription, type SubscriptionState } from "@/hooks/use-subscription";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { getPaymentsEnvironment, PLAN_NAME, PLAN_PRICE_LABEL, TRIAL_DAYS } from "@/lib/payments";
import { createPortalSession } from "@/utils/payments.functions";
import { daysUntil, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/billing")({
  validateSearch: (search: Record<string, unknown>) => ({
    checkout:
      typeof search["checkout"] === "string" ? (search["checkout"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Billing & plan My Salon Renters" },
      {
        name: "description",
        content:
          "See your My Salon Renters plan, trial status and next billing date, and manage or cancel your subscription.",
      },
      { property: "og:title", content: "Billing & plan My Salon Renters" },
      {
        property: "og:description",
        content: "Manage your My Salon Renters subscription, billing date and payment details.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BillingPage,
});

const features = [
  "Unlimited chairs and chair renters",
  "Rent charges generated automatically each cycle",
  "Payment tracking with receipts and history",
  "Rental agreements: sign electronically or upload your own",
  "Automated due, overdue and payment reminders",
  "Private renter portal for every stylist",
];

type StatusInfo = {
  label: string;
  tone: "good" | "warn" | "bad" | "muted";
  headline: string;
  detail: string;
};

function describe(sub: SubscriptionState | undefined): StatusInfo {
  if (!sub || !sub.hasEverSubscribed) {
    return {
      label: "No plan",
      tone: "muted",
      headline: "You're not subscribed yet",
      detail: `Start your ${TRIAL_DAYS} day free trial to unlock everything. You won't be charged until it ends.`,
    };
  }

  const days = daysUntil(sub.currentPeriodEnd);
  const endLabel = formatDate(sub.currentPeriodEnd);

  if (sub.isTrialing) {
    return {
      label: "Free trial",
      tone: "good",
      headline:
        days === null
          ? "Your free trial is running"
          : days <= 0
            ? "Your trial ends today"
            : `${days} day${days === 1 ? "" : "s"} left of your free trial`,
      detail: sub.cancelAtPeriodEnd
        ? `Your trial ends on ${endLabel} and you won't be charged.`
        : `Your first payment of ${PLAN_PRICE_LABEL} is due on ${endLabel}.`,
    };
  }

  if (sub.isPastDue) {
    return {
      label: "Payment failed",
      tone: "bad",
      headline: "We couldn't take your last payment",
      detail:
        "Update your payment method to keep your salon out of read only mode. We'll retry automatically in the meantime.",
    };
  }

  if (sub.isPaused) {
    return {
      label: "Paused",
      tone: "warn",
      headline: "Your plan is paused",
      detail: "Resume it from the billing portal to start making changes again.",
    };
  }

  if (sub.cancelAtPeriodEnd && sub.isActive) {
    return {
      label: "Ending soon",
      tone: "warn",
      headline: "Your plan is set to cancel",
      detail: `You keep full access until ${endLabel}. After that your salon goes read only. Nothing is deleted.`,
    };
  }

  if (sub.isActive) {
    return {
      label: "Active",
      tone: "good",
      headline: "Your plan is active",
      detail: `Next payment of ${PLAN_PRICE_LABEL} on ${endLabel}.`,
    };
  }

  return {
    label: "Cancelled",
    tone: "bad",
    headline: "Your plan has ended",
    detail:
      "Your salon is read only. Everything is safely stored. Resubscribe to start making changes again.",
  };
}

const toneClass: Record<StatusInfo["tone"], string> = {
  good: "bg-primary/10 text-primary border-primary/20",
  warn: "bg-amber-100 text-amber-900 border-amber-200",
  bad: "bg-destructive/10 text-destructive border-destructive/20",
  muted: "bg-muted text-muted-foreground border-border",
};

function BillingPage() {
  const { data: membership } = useMembership();
  const { data: subscription, isLoading } = useSubscription();
  const { openCheckout, isOpen: checkoutOpen, checkoutElement } = useStripeCheckout();
  const portalFn = useServerFn(createPortalSession);
  const [portalAction, setPortalAction] = useState<string | null>(null);
  const [portalError, setPortalError] = useState<{
    action: "overview" | "cancel" | "payment";
    message: string;
    url?: string;
    attempts: number;
  } | null>(null);

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const search = Route.useSearch();

  useEffect(() => {
    if (search.checkout !== "success") return;
    toast.success("You're all set", {
      description: `Your ${TRIAL_DAYS} day free trial has started.`,
    });
    const timers = [2000, 6000, 12000].map((ms) =>
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["subscription"] }), ms),
    );
    return () => timers.forEach(clearTimeout);
  }, [search.checkout, queryClient]);

  if (membership && !membership.isOwner) {
    return (
      <AppShell title="Billing" description="Your salon owner covers the subscription.">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Nothing to pay</CardTitle>
            <CardDescription>
              My Salon Renters is free for chair renters. Your salon owner pays for the account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
              Back to dashboard
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  type PortalAction = "overview" | "cancel" | "payment";

  const actionLabels: Record<PortalAction, string> = {
    overview: "open your subscription details",
    cancel: "open the cancellation page",
    payment: "open the payment method page",
  };

  function friendlyError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error ?? "");
    if (/no subscription found/i.test(message))
      return "We couldn't find an active subscription to update. Start a plan first, then add your card.";
    if (/failed to fetch|network|timeout|econn/i.test(message))
      return "We couldn't reach our payment provider. Check your connection and try again.";
    if (/401|403|unauthor/i.test(message))
      return "Your session expired. Sign out and back in, then try again.";
    if (/429|rate limit/i.test(message))
      return "Too many attempts in a row. Wait a few seconds and try again.";
    return message || "Something went wrong while contacting our payment provider.";
  }

  async function openPortal(action: PortalAction) {
    setPortalAction(action);
    setPortalError(null);
    try {
      const result = await portalFn({ data: { environment: getPaymentsEnvironment() } });
      if ("error" in result) throw new Error(result.error);
      const url = result.url;
      if (!url) throw new Error("Our payment provider didn't return a link for that action.");

      const opened = window.open(url, "_blank", "noopener");
      if (!opened) {
        setPortalError({
          action,
          message: "Your browser blocked the pop up. Allow pop ups for this site, or use the direct link below.",
          url,
          attempts: portalError?.action === action ? portalError.attempts + 1 : 1,
        });
      }
    } catch (error) {
      console.error(error);
      const attempts = portalError?.action === action ? portalError.attempts + 1 : 1;
      setPortalError({ action, message: friendlyError(error), attempts });
      toast.error(`Couldn't ${actionLabels[action]}`, {
        description: friendlyError(error),
        action: { label: "Retry", onClick: () => void openPortal(action) },
      });
    } finally {
      setPortalAction(null);
    }
  }

  const status = describe(subscription);
  const active = !!subscription?.isActive;
  const showResubscribe = !active || subscription?.cancelAtPeriodEnd;


  return (
    <AppShell
      title="Billing & plan"
      description="One simple plan. Unlimited chairs, unlimited renters."
    >
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        {/* Current plan */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-leaf">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Current plan
                </p>
                <CardTitle className="font-display mt-1 text-2xl">
                  {subscription?.hasEverSubscribed ? PLAN_NAME : "No active plan"}
                </CardTitle>
              </div>
              <Badge variant="outline" className={toneClass[status.tone]}>
                {status.label}
              </Badge>
            </div>

            <p className="font-display mt-4 text-4xl font-semibold">
              {PLAN_PRICE_LABEL}
              <span className="ml-1 text-base font-normal text-muted-foreground">/month</span>
            </p>
            <CardDescription className="mt-1">
              Billed monthly · unlimited chairs · cancel any time
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 pt-6">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Checking your plan…
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {status.tone === "bad" ? (
                    <AlertTriangle className="size-4 text-destructive" />
                  ) : status.tone === "warn" ? (
                    <CalendarClock className="size-4 text-amber-700" />
                  ) : (
                    <Sparkles className="size-4 text-primary" />
                  )}
                  {status.headline}
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">{status.detail}</p>
              </div>
            )}

            <Separator />

            <dl className="space-y-3 text-sm">
              <Row label="Status" value={statusText(subscription)} />
              {subscription?.hasEverSubscribed && (
                <>
                  <Row
                    label={
                      subscription.isTrialing
                        ? "Trial ends"
                        : subscription.cancelAtPeriodEnd || !active
                          ? "Access until"
                          : "Next billing date"
                    }
                    value={
                      subscription.currentPeriodEnd
                        ? formatDate(subscription.currentPeriodEnd)
                        : "Not scheduled"
                    }
                  />
                  <Row
                    label="Next charge"
                    value={
                      !active || subscription.cancelAtPeriodEnd
                        ? "None scheduled"
                        : `${PLAN_PRICE_LABEL} on ${formatDate(subscription.currentPeriodEnd)}`
                    }
                  />
                </>
              )}
              {subscription?.startedAt && (
                <Row label="Subscriber since" value={formatDate(subscription.startedAt)} />
              )}
              <Row label="Chair renters" value="Free, they never pay" />
            </dl>

            <Separator />

            {/* Cost breakdown */}
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Receipt className="size-4 text-primary" />
                What you pay
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label={`${PLAN_NAME} plan`} value={`${PLAN_PRICE_LABEL} / month`} />
                <Row label="Card processing fee" value="Included, we cover it" />
                <Row label="VAT or sales tax" value="Not charged — we are not VAT registered" />
              </dl>
              <Separator className="my-3" />
              <div className="flex items-center justify-between gap-4 text-sm font-semibold">
                <span>{subscription?.hasEverSubscribed ? "Total per month" : "Due today"}</span>
                <span>
                  {subscription?.hasEverSubscribed
                    ? `${PLAN_PRICE_LABEL}`
                    : `£0.00, then ${PLAN_PRICE_LABEL} / month`}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                No setup fee and no per renter charge. Card processing on your subscription is
                included in the {PLAN_PRICE_LABEL} price. Card fees on rent your renters pay are
                separate and set per chair.
              </p>
            </div>



            {/* Actions */}
            <div className="space-y-2.5">
              {portalError && (
                <div
                  role="alert"
                  className="space-y-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-4"
                >
                  <p className="flex items-start gap-2 text-sm font-semibold text-destructive">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    {portalError.action === "payment"
                      ? "We couldn't open the payment method page"
                      : portalError.action === "cancel"
                        ? "We couldn't open the cancellation page"
                        : "We couldn't open the billing portal"}
                  </p>
                  <p className="text-sm text-muted-foreground">{portalError.message}</p>
                  {portalError.attempts >= 3 && (
                    <p className="text-sm text-muted-foreground">
                      Still not working? Email us at support@mysalonrenters.app and we'll update your
                      card for you. Your plan stays active in the meantime.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => openPortal(portalError.action)}
                      disabled={!!portalAction}
                    >
                      {portalAction === portalError.action ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <RotateCcw className="size-4" />
                      )}
                      Try again
                    </Button>
                    {portalError.url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={portalError.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="size-4" />
                          Open in a new tab
                        </a>
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setPortalError(null)}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              )}

              {subscription?.hasEverSubscribed ? (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => openPortal("overview")}
                    disabled={!!portalAction}
                  >
                    {portalAction === "overview" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ExternalLink className="size-4" />
                    )}
                    Manage subscription & invoices
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => openPortal("payment")}
                    disabled={!!portalAction}
                  >
                    {portalAction === "payment" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CreditCard className="size-4" />
                    )}
                    Update payment method
                  </Button>

                  {active && !subscription.cancelAtPeriodEnd && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => openPortal("cancel")}
                      disabled={!!portalAction}
                    >
                      {portalAction === "cancel" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <XCircle className="size-4" />
                      )}
                      Cancel subscription
                    </Button>
                  )}

                  {showResubscribe && (
                    <Button
                      className="w-full"
                      disabled={checkoutOpen || !membership}
                      onClick={() =>
                        membership &&
                        openCheckout({
                          priceId: "unlimited_monthly",
                          returnUrl: `${window.location.origin}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
                        })
                      }
                    >
                      {checkoutOpen ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <RotateCcw className="size-4" />
                      )}
                      {subscription.cancelAtPeriodEnd ? "Start a new plan" : "Resubscribe"}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    className="w-full"
                    disabled={checkoutOpen || !membership || isLoading}
                    onClick={() =>
                      membership &&
                      openCheckout({
                        priceId: "unlimited_monthly",
                        returnUrl: `${window.location.origin}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
                      })
                    }
                  >
                    {checkoutOpen ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CreditCard className="size-4" />
                    )}
                    Start {TRIAL_DAYS} day free trial
                  </Button>
                  <p className="flex items-start gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
                    Card details are taken now, but you're not charged until the {TRIAL_DAYS}
                    day trial ends. Cancel before then and you pay nothing.
                  </p>
                </>
              )}
              {checkoutElement}
            </div>
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What's included</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">If you cancel</CardTitle>
              <CardDescription>
                You keep full access until the end of the period you've paid for. After that your
                salon goes read only. You and your renters can still sign in and view chairs,
                rent history, payments and signed agreements. Adding chairs, inviting renters,
                recording payments and sending agreements resume the moment you subscribe again.
                Nothing is deleted.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function statusText(sub: SubscriptionState | undefined) {
  if (!sub?.hasEverSubscribed) return "Not subscribed";
  if (sub.isTrialing) return "Free trial";
  if (sub.isPastDue) return "Payment failed";
  if (sub.isPaused) return "Paused";
  if (sub.cancelAtPeriodEnd && sub.isActive) return "Cancels at period end";
  if (sub.isActive) return "Active";
  return "Cancelled";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
