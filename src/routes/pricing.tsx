import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, CreditCard, Landmark } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MarketingHeader } from "@/components/marketing-header";
import { SiteFooter } from "@/components/site-footer";


import { PLAN_NAME, PLAN_PRICE_LABEL, TRIAL_DAYS } from "@/lib/payments";
import { formatMoney } from "@/lib/format";
import {
  BANK_FEE_CAP,
  BANK_FEE_PERCENT,
  CARD_FEE_FIXED,
  CARD_FEE_PERCENT,
  CARD_RATES,
  bankChargeTotal,
  bankFeeAddedOn,
  chargeTotal,
  feeAddedOn,
} from "@/lib/fees";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing | My Salon Renters" },
      {
        name: "description",
        content:
          "One simple plan for salon owners: £24.99 a month for unlimited chairs and renters, with a 14 day free trial. Chair renters never pay a penny.",
      },
      { property: "og:title", content: "Pricing | My Salon Renters" },
      {
        property: "og:description",
        content:
          "£24.99 a month for unlimited chairs, renters, rent tracking and signed agreements. Free for 14 days.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pricing,
});

const included = [
  "Unlimited chairs and renters",
  "Rent charges raised automatically each cycle",
  "Card and pay by bank payments, plus cash and bank transfers recorded by hand",
  "Electronically signed and uploaded rental agreements",
  "Automatic due and overdue reminders",
  "Separate private portal for every chair renter",
  "Full payment history and outstanding balances",
];

const faqs = [
  {
    q: "Do my chair renters have to pay?",
    a: "No. The subscription covers your whole salon. Renters use their portal, pay their rent and sign agreements at no cost to them.",
  },
  {
    q: "What happens after the free trial?",
    a: `Your plan starts automatically at ${PLAN_PRICE_LABEL} a month once the ${TRIAL_DAYS} day trial ends. Cancel before then and you are never charged.`,
  },
  {
    q: "Can I cancel any time?",
    a: "Yes. Cancel from the billing page in two clicks. You keep full access until the end of the period you have paid for, and your data stays safe.",
  },
  {
    q: "Is there a limit on chairs?",
    a: "None at all. Whether you have two chairs or twenty, the price is the same.",
  },
];

function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />


      <section className="bg-leaf">
        <div className="mx-auto max-w-3xl px-6 pt-16 pb-12 text-center md:pt-24 md:pb-20">
          <p className="text-sm font-medium tracking-widest text-primary uppercase">
            Pricing
          </p>
          <h1 className="mt-5 text-4xl leading-[1.05] font-semibold text-balance md:text-5xl">
            One plan. Unlimited chairs.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Everything your salon needs to manage chair renters, for one flat monthly price.
            Try it free for {TRIAL_DAYS} days.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-8 md:grid-cols-[1.1fr_1fr]">
          <article className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-calm)]">
            <h2 className="text-lg font-semibold">{PLAN_NAME}</h2>
            <p className="mt-4 flex items-baseline gap-2">
              <span className="text-5xl font-semibold">{PLAN_PRICE_LABEL}</span>
              <span className="text-muted-foreground">per month</span>
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Billed monthly. Cancel any time. Chair renters never pay a penny.
            </p>
            <Button asChild size="lg" className="mt-7 w-full">
              <Link to="/auth" search={{ mode: "signup", redirect: undefined }}>
                Start your free trial
              </Link>
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              No card needed to look around. Cancel before day {TRIAL_DAYS} and you are not
              charged.
            </p>
          </article>

          <article className="rounded-3xl border border-border bg-muted/40 p-8">
            <h2 className="text-lg font-semibold">What is included</h2>
            <ul className="mt-6 space-y-3 text-sm">
              {included.map((item) => (
                <li key={item} className="flex gap-3">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="border-t border-border bg-muted/50">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm font-medium">
            <CreditCard className="size-4 text-primary" />
            Payment fees
          </div>
          <h2 className="mt-5 text-2xl font-semibold md:text-3xl">
            Transparent payment fees
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Rent is collected through Stripe. There are no setup fees, monthly minimums or
            hidden charges on top of your subscription. Cash and manual bank transfers you
            record yourself are always free.
          </p>
          <p className="mt-4 max-w-2xl font-semibold text-foreground">
            You can pass the entire payment fee onto your renters, so you still receive the
            full rent amount.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-calm)]">
              <div className="flex items-center gap-2">
                <Landmark className="size-5 text-primary" />
                <h3 className="text-lg font-semibold">Pay by bank</h3>
              </div>
              <p className="mt-3 text-3xl font-semibold">
                {(BANK_FEE_PERCENT * 100).toFixed(1)}%
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  capped at {formatMoney(BANK_FEE_CAP)}
                </span>
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                The renter approves the payment in their own banking app. No card details,
                no chargebacks, and the cheapest option on higher rents. A{" "}
                no chargebacks, and the cheapest option on higher rents.
            </article>

            <article className="rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-calm)]">
              <div className="flex items-center gap-2">
                <CreditCard className="size-5 text-primary" />
                <h3 className="text-lg font-semibold">Card payments</h3>
              </div>
              <p className="mt-3 text-3xl font-semibold">
                {(CARD_RATES.ukDomestic.percent * 100).toFixed(1)}%
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  + {formatMoney(CARD_RATES.ukDomestic.fixed)} on UK cards
                </span>
              </p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>
                  {CARD_RATES.eea.label}: {(CARD_RATES.eea.percent * 100).toFixed(1)}% +{" "}
                  {formatMoney(CARD_RATES.eea.fixed)}
                </li>
                <li>
                  {CARD_RATES.international.label}:{" "}
                  {(CARD_RATES.international.percent * 100).toFixed(2)}% +{" "}
                  {formatMoney(CARD_RATES.international.fixed)}
                </li>
                <li>
                  Plus a {(MANAGED_PAYMENTS_PERCENT * 100).toFixed(1)}% managed payments fee,
                  so a UK card costs {Math.round(CARD_FEE_PERCENT * 100)}% +{" "}
                  {formatMoney(CARD_FEE_FIXED)} in total.
                </li>
              </ul>
            </article>
          </div>

          <article className="mt-4 rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-calm)]">
            <h3 className="text-lg font-semibold">Example: £100 a week rent</h3>
            <div className="mt-6 grid gap-8 sm:grid-cols-2">
              <div className="space-y-4">
                <p className="text-sm font-medium">Paid by bank</p>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Rent amount</span>
                  <span className="font-medium">{formatMoney(100)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Payment fee</span>
                  <span className="font-medium">
                    {formatMoney(bankFeeAddedOn(100, "renter"))}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
                  <span className="font-semibold">Renter pays</span>
                  <span className="text-xl font-semibold">
                    {formatMoney(bankChargeTotal(100, "renter"))}
                  </span>
                </div>
                <p className="text-right text-sm text-muted-foreground">
                  Salon receives {formatMoney(100)}
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium">Paid by UK card</p>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Rent amount</span>
                  <span className="font-medium">{formatMoney(100)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Payment fee</span>
                  <span className="font-medium">{formatMoney(feeAddedOn(100, "renter"))}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
                  <span className="font-semibold">Renter pays</span>
                  <span className="text-xl font-semibold">
                    {formatMoney(chargeTotal(100, "renter"))}
                  </span>
                </div>
                <p className="text-right text-sm text-muted-foreground">
                  Salon receives {formatMoney(100)}
                </p>
              </div>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              You choose who pays the fee for each chair. Cash and bank transfers you record
              by hand are free. Fees shown are current Stripe UK rates and can change.
            </p>
          </article>
        </div>
      </section>

      <section className="border-t border-border bg-muted/50">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-2xl font-semibold md:text-3xl">Common questions</h2>
          <dl className="mt-8 space-y-7">
            {faqs.map(({ q, a }) => (
              <div key={q}>
                <dt className="font-medium">{q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <SiteFooter />

    </div>
  );
}
