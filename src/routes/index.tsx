import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Armchair,
  CalendarClock,
  CreditCard,
  FileSignature,
  Landmark,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { MarketingHeader } from "@/components/marketing-header";
import { SiteFooter } from "@/components/site-footer";
import { PLAN_PRICE_LABEL, TRIAL_DAYS } from "@/lib/payments";

const dashboardOwnerShotUrl =
  "dashboard-owner-shot.png";
const dashboardRenterShotUrl =
  "dashboard-renter-shot.png";
const ownerPaymentsShotUrl =
  "owner-payments-shot.png";



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "My Salon Renters" },
      {
        name: "description",
        content:
          "My Salon Renters helps salon owners manage chair renters: take card rent payments, track what's owed, and sign and store salon rental agreements.",
      },
      { property: "og:title", content: "My Salon Renters" },
      {
        property: "og:description",
        content:
          "Take card rent payments, track what's owed, and sign and store salon chair rental agreements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Armchair,
    title: "Chairs and stations",
    body: "Add every chair with its rent and billing cycle, then assign it to a renter. See at a glance which chairs are earning and which are sitting empty.",
  },
  {
    icon: Users,
    title: "Invite your renters",
    body: "Send an email invite. Your stylist signs up through the link and lands straight in their own portal. No setup, no spreadsheets.",
  },
  {
    icon: CreditCard,
    title: "Rent paid by card & bank transfer",
    body: "Renters pay by card or bank transfer through Stripe, straight into your salon account. Cash payments can be recorded too, so every payment lives in one ledger.",
  },
  {
    icon: FileSignature,
    title: "Agreements, signed and stored",
    body: "Send a chair rental agreement from a template and have it signed in app, or upload an existing signed document. Everything is kept together.",
  },
  {
    icon: CalendarClock,
    title: "Nothing slips",
    body: "Rent is raised automatically each cycle, overdue amounts are flagged, and reminders go out before and after the due date.",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    body: "Renters only ever see their own chair, their own rent and their own agreements. Owners see their salon, and nobody else's.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />



      <section className="bg-leaf">
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-5 pt-8 pb-8 sm:px-6 sm:pt-12 md:grid-cols-2 md:gap-10 md:pt-16 md:pb-14">
          <div>
            <h1 className="max-w-3xl text-4xl leading-[1.05] font-semibold text-balance md:text-5xl lg:text-6xl">
              Stop chasing chair rent.
            </h1>
            <p className="mt-4 max-w-xl text-xl font-medium text-foreground">
              Let My Salon Renters do it for you.
            </p>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Collect rent, manage renters, sign agreements and track every chair — all in one simple app built for salon owners.
            </p>
            <ul className="mt-6 grid max-w-md gap-2 text-left text-sm">
              {[
                "Super easy to set up",
                "Renters can pay by card, bank transfer and cash via Stripe",
                "Automatic payment reminders",
                "Digital chair rental agreements",
                "Unlimited chairs & renters",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link to="/auth" search={{ mode: "signup", redirect: undefined }}>
                  Start My 14-Day Free Trial
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link to="/auth" search={{ mode: "signin", redirect: undefined }}>
                  I'm a chair renter
                </Link>
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {PLAN_PRICE_LABEL}/month after trial · Cancel anytime
            </p>
          </div>
          <div className="relative">
            <img
              src={dashboardOwnerShotUrl}
              alt="My Salon Renters dashboard showing chairs, renters and rent due"
              width={1280}
              height={900}
              className="w-full rounded-2xl border border-border bg-card object-cover shadow-[var(--shadow-lift)]"
            />
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/50">
        <div className="mx-auto max-w-6xl px-5 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-col items-center justify-center gap-4 text-center md:flex-row md:gap-8 md:text-left">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-bold text-foreground shadow-sm">
                Stripe
              </span>
              <span className="text-lg font-semibold">Payments built in</span>
            </div>
            <div className="grid grid-cols-2 gap-4 md:gap-8">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CreditCard className="size-4" />
                </span>
                <div className="text-left">
                  <p className="text-sm font-semibold">Card payments</p>
                  <p className="text-xs text-muted-foreground">Debit & credit cards</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Landmark className="size-4" />
                </span>
                <div className="text-left">
                  <p className="text-sm font-semibold">Pay by bank</p>
                  <p className="text-xs text-muted-foreground">0.8% capped at £5</p>
                </div>
              </div>
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-muted-foreground">
            Accept rent by card (1.5% + 20p on UK cards) or pay by bank (0.8%, capped at £5), plus a
            3.5% managed payments fee, straight into your salon’s account with Stripe. Cash and manual
            bank transfers are recorded free.{" "}
            <Link to="/pricing" className="font-medium text-primary underline-offset-4 hover:underline">
              See all fees
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-14 md:py-18">
        <h2 className="max-w-3xl text-2xl font-semibold md:text-3xl">
          Still managing chair renters through WhatsApp, bank transfers and spreadsheets?
        </h2>
        <div className="mt-6 grid gap-4 md:mt-8 md:gap-5 md:grid-cols-3">
          {[
            {
              emoji: "💸",
              title: "Chasing rent",
              body: "Checking your bank account and messaging renters when payments haven’t arrived.",
            },
            {
              emoji: "📄",
              title: "Agreements everywhere",
              body: "Paper contracts, PDFs, WhatsApp messages and documents scattered across different places.",
            },
            {
              emoji: "🧾",
              title: "No clear overview",
              body: "Trying to remember who’s paid, what’s overdue and when each renter owes you next.",
            },
          ].map(({ emoji, title, body }) => (
            <article
              key={title}
              className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-calm)]"
            >
              <span className="text-3xl">{emoji}</span>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
        <div className="mt-10 max-w-3xl">
          <p className="text-xl font-semibold">There’s an easier way.</p>
          <p className="mt-2 text-lg text-muted-foreground">
            My Salon Renters puts the entire owner–renter relationship in one place.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-14 md:py-18">
        <div className="grid items-center gap-6 md:grid-cols-2 md:gap-12">
          <div>
            <h2 className="max-w-xl text-3xl font-semibold md:text-4xl">
              Get paid without chasing anyone.
            </h2>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground">
              Renters pay their chair rent securely by card or straight from their bank, in their
              own portal.
            </p>
            <ul className="mt-6 grid max-w-md gap-2 text-left text-sm">
              {[
                "Renters see exactly what they owe and when it's due",
                "Card and pay by bank payments land straight into your account",
                "Overdue rent is flagged automatically",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <img
              src={ownerPaymentsShotUrl}
              alt="Salon owner rent and payments screen listing renters, payment methods, paid and overdue rent"
              width={1440}
              height={1108}

              loading="lazy"
              className="w-full rounded-2xl border border-border bg-card shadow-[var(--shadow-lift)]"
            />
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/50">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10 md:py-12">
          <p className="text-center text-sm font-medium tracking-widest text-primary uppercase">
            Your salon rentals, all in one place.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="text-center">
              <span className="text-2xl">👥</span>
              <p className="mt-2 text-2xl font-semibold">12</p>
              <p className="text-sm text-muted-foreground">Renters</p>
            </div>
            <div className="text-center">
              <span className="text-2xl">💷</span>
              <p className="mt-2 text-2xl font-semibold">£4,850</p>
              <p className="text-sm text-muted-foreground">Rent Due</p>
            </div>
            <div className="text-center">
              <span className="text-2xl">📄</span>
              <p className="mt-2 text-2xl font-semibold">11</p>
              <p className="text-sm text-muted-foreground">Contracts Signed</p>
            </div>
            <div className="text-center">
              <span className="text-2xl">🪑</span>
              <p className="mt-2 text-2xl font-semibold">2</p>
              <p className="text-sm text-muted-foreground">Spaces Available</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-14 md:py-18">
        <div className="text-center">
          <p className="text-sm font-medium tracking-widest text-primary uppercase">
            Built for both sides of the chair
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-semibold md:text-4xl">
            A clear dashboard for the salon owner and a simple portal for every renter.
          </h2>
        </div>
        <div className="mt-6 grid gap-5 md:mt-8 md:gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <img
              src={dashboardOwnerShotUrl}
              alt="Salon owner dashboard showing chairs, renters, outstanding rent and rent due"
              width={1280}
              height={900}
              loading="lazy"
              className="w-full rounded-2xl border border-border bg-card shadow-[var(--shadow-lift)]"
            />
            <p className="text-center text-sm font-medium text-primary">Salon owner view</p>
          </div>
          <div className="space-y-3">
            <img
              src={dashboardRenterShotUrl}
              alt="Chair renter dashboard showing assigned chair, outstanding balance and next payment"
              width={1280}
              height={900}
              loading="lazy"
              className="w-full rounded-2xl border border-border bg-card shadow-[var(--shadow-lift)]"
            />
            <p className="text-center text-sm font-medium text-primary">Chair renter view</p>
          </div>
        </div>
      </section>
      <section id="pricing" className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-14 md:py-16">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-primary/20 bg-card shadow-[var(--shadow-lift)]">
          <div className="bg-leaf px-5 py-3 sm:px-8">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {TRIAL_DAYS} day free trial
            </span>
          </div>
          <div className="px-5 py-8 text-center sm:px-8 sm:py-10">
            <h2 className="text-3xl font-semibold sm:text-4xl md:text-5xl">
              One plan, unlimited chairs
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              {PLAN_PRICE_LABEL} per month for your whole salon. Chair renters never pay a penny.
            </p>
            <div className="mt-7 flex items-baseline justify-center gap-2">
              <span className="text-5xl font-semibold text-primary sm:text-6xl">
                {PLAN_PRICE_LABEL}
              </span>
              <span className="text-muted-foreground">per month</span>
            </div>
            <ul className="mx-auto mt-6 grid max-w-md gap-2 text-left text-sm">
              {[
                "Unlimited chairs and renters",
                "Rent charges, payments and receipts",
                "Electronically signed and uploaded agreements",
                "Automatic due and overdue reminders",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg">
                <Link to="/auth" search={{ mode: "signup", redirect: undefined }}>
                  Start your free trial
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/pricing">See full details</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Cancel before day {TRIAL_DAYS} and you are not charged.
            </p>
          </div>
        </div>
      </section>


      <section className="mx-auto max-w-6xl px-5 pt-4 pb-8 sm:px-6 sm:pt-6 sm:pb-14 md:pt-8">
        <h2 className="max-w-2xl text-3xl font-semibold md:text-4xl">
          Everything a chair rental salon actually needs
        </h2>
        <div className="mt-6 grid gap-4 md:mt-8 md:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-calm)]"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/50">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 sm:px-6 sm:py-14 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold md:text-3xl">If you own the salon</h2>
            <ul className="mt-6 space-y-3 text-muted-foreground">
              <li>• Add your chairs and set weekly or monthly rent.</li>
              <li>• Invite renters by email and assign them a chair.</li>
              <li>• Watch rent land, chase what's late, record cash payments.</li>
              <li>• Send agreements for signature and keep signed copies forever.</li>
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-semibold md:text-3xl">If you rent a chair</h2>
            <ul className="mt-6 space-y-3 text-muted-foreground">
              <li>• See your chair, your rent and your next due date.</li>
              <li>• Pay by card or straight from your bank in seconds. No chasing, no envelopes.</li>
              <li>• Keep a clean record of everything you've paid.</li>
              <li>• Read and sign your rental agreement, then download it any time.</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="pricing-bottom" className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-14 md:py-16">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-primary/20 bg-card shadow-[var(--shadow-lift)]">
          <div className="bg-leaf px-5 py-3 sm:px-8">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {TRIAL_DAYS} day free trial
            </span>
          </div>
          <div className="px-5 py-8 text-center sm:px-8 sm:py-10">
            <h2 className="text-3xl font-semibold sm:text-4xl md:text-5xl">
              One plan, unlimited chairs
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              {PLAN_PRICE_LABEL} per month for your whole salon. Chair renters never pay a penny.
            </p>
            <div className="mt-7 flex items-baseline justify-center gap-2">
              <span className="text-5xl font-semibold text-primary sm:text-6xl">
                {PLAN_PRICE_LABEL}
              </span>
              <span className="text-muted-foreground">per month</span>
            </div>
            <ul className="mx-auto mt-6 grid max-w-md gap-2 text-left text-sm">
              {[
                "Unlimited chairs and renters",
                "Rent charges, payments and receipts",
                "Electronically signed and uploaded agreements",
                "Automatic due and overdue reminders",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg">
                <Link to="/auth" search={{ mode: "signup", redirect: undefined }}>
                  Start your free trial
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/pricing">See full details</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Cancel before day {TRIAL_DAYS} and you are not charged.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />

    </div>
  );
}
