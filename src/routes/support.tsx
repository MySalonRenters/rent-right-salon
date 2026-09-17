import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MarketingHeader } from "@/components/marketing-header";
import { SiteFooter } from "@/components/site-footer";

import { PLAN_PRICE_LABEL, TRIAL_DAYS } from "@/lib/payments";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support | My Salon Renters" },
      {
        name: "description",
        content:
          "Get help with My Salon Renters. FAQs on setting up your salon, inviting renters, signing agreements, taking payments, card fees and subscriptions.",
      },
      { property: "og:title", content: "Support | My Salon Renters" },
      {
        property: "og:description",
        content:
          "Answers to common questions about setting up your salon, managing renters, agreements and payments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Support,
});

const sections = [
  {
    title: "Getting started",
    items: [
      {
        q: "What is My Salon Renters?",
        a: "My Salon Renters is a simple app for salon owners who rent out chairs or stations. It helps you manage your renters, collect rent, track what is owed, and send and store signed rental agreements.",
      },
      {
        q: "How do I create an account?",
        a: "Click Get started on the homepage, enter your salon email and create a password. You will be taken straight to your dashboard where you can add your first chair.",
      },
      {
        q: "Is there a free trial?",
        a: `Yes. Every new salon gets a ${TRIAL_DAYS} day free trial. You can add chairs, invite renters and try the full app before paying. Cancel before day ${TRIAL_DAYS} and you will not be charged.`,
      },
      {
        q: "What happens after the trial?",
        a: `Your subscription starts automatically at ${PLAN_PRICE_LABEL} per month once the trial ends. You can cancel any time from the Billing page.`,
      },
    ],
  },
  {
    title: "Chairs and renters",
    items: [
      {
        q: "How do I add a chair?",
        a: "Go to the Chairs page, click Add chair, give it a name and set the rent amount and billing cycle. You can add as many chairs as you need.",
      },
      {
        q: "How do I invite a renter?",
        a: "From the Renters page, click Invite renter and enter their email address. They will receive an email with a link to create their account and join your salon.",
      },
      {
        q: "Can I invite a renter directly from a chair?",
        a: "Yes. Each chair card has a Rent out button that starts the invite flow and links the new renter to that chair automatically.",
      },
      {
        q: "What if a renter does not accept the invite?",
        a: "You can resend or delete a pending invite from the Renters page. If you delete an invite, the renter will no longer be able to use that link to join.",
      },
      {
        q: "How do I remove a renter?",
        a: "On the Renters page, open the menu next to the renter and choose Remove renter. Their payment history and agreement records stay in your salon records.",
      },
    ],
  },
  {
    title: "Agreements and signatures",
    items: [
      {
        q: "Can I create a salon rental agreement in the app?",
        a: "Yes. Go to the Agreements page and choose Create agreement. You can enter details like currency, location, legal names and country, and the app will build a professional agreement for you.",
      },
      {
        q: "How do signatures work?",
        a: "Both the salon owner and the chair renter sign using the built-in signature pad. Each party signs once, and the agreement is marked as fully signed once both signatures are captured.",
      },
      {
        q: "Can I upload an existing signed agreement?",
        a: "Yes. You can upload a PDF or image of an agreement you have already signed outside the app and store it alongside your salon records.",
      },
      {
        q: "Can I edit an agreement after it has been signed?",
        a: "No. Once both parties have signed, the agreement text is locked to protect both sides. You can still view previous versions and download a copy.",
      },
    ],
  },
  {
    title: "Payments and subscriptions",
    items: [
      {
        q: "How much does My Salon Renters cost?",
        a: `We offer one simple plan at ${PLAN_PRICE_LABEL} per month for your whole salon. There is no limit on chairs or renters, and chair renters never pay a fee to use the app.`,
      },
      {
        q: "How do I pay for my subscription?",
        a: "Go to the Billing page and choose Start your subscription. You can manage or cancel your subscription from the same page at any time.",
      },
      {
        q: "What happens if my subscription expires?",
        a: "If your subscription ends, your salon dashboard becomes read-only. You can still view your records, but you will need an active subscription to add chairs, invite renters or record new payments.",
      },
      {
        q: "Can I cancel any time?",
        a: "Yes. Cancel from the Billing page in two clicks. You keep full access until the end of the period you have already paid for.",
      },
    ],
  },
  {
    title: "Processing and receiving rent payments",
    items: [
      {
        q: "How do renters pay their chair rent?",
        a: "Renters can pay by card or by bank from their renter portal. Pay by bank sends them to their own banking app to approve the payment, with no card details needed. Cash and manual bank transfers can also be recorded by hand in the app so every payment lives in one place.",
      },
      {
        q: "What is pay by bank?",
        a: "Pay by bank is an open banking payment. The renter picks their bank, approves the payment in their banking app, and the money moves straight to your connected bank account. It is cheaper than a card payment, cannot be charged back, and is usually the best option on higher rents.",
      },
      {
        q: "When does the money reach me?",
        a: "Card payments are processed through our payments partner and paid out to your connected bank account according to their payout schedule. This is usually a few business days.",
      },
      {
        q: "How do I know a payment has succeeded?",
        a: "You will see the payment in your rent ledger immediately, and the renter will receive a confirmation. Automatic reminders also stop once the rent is marked as paid.",
      },
      {
        q: "What if a card payment fails?",
        a: "The renter will see a clear error and can retry with the same or a different card. You will see the payment as outstanding until a successful payment is made.",
      },
    ],
  },
  {
    title: "Payment fees and pricing",
    items: [
      {
        q: "What does it cost to take a card payment?",
        a: "UK cards cost 1.5% plus 20p, European (EEA) cards cost 2.5% plus 20p and international cards cost 3.25% plus 20p. A separate 3.5% managed payments fee also applies, which covers fraud protection, dispute handling and support. So a typical UK card payment works out at 5% plus 20p in total. The exact fee is shown before the renter completes payment and is taken automatically before the money reaches you.",
      },
      {
        q: "What does pay by bank cost?",
        a: "Pay by bank costs 0.8% per payment, capped at £5, plus the 3.5% managed payments fee. There is no fixed pence charge, so on most rents it works out cheaper than a card, and on larger payments the £5 cap keeps the cost down.",
      },
      {
        q: "Are cash and manual bank transfers free?",
        a: "Yes. If a renter hands you cash or sends a bank transfer straight to your own account, you record it in the app and there is no processing fee at all.",
      },
      {
        q: "How much will I actually receive from a £100 rent payment?",
        a: "Paid by UK card, the fee is about £5.20, so you receive around £94.80. Paid by bank, the fee is about £4.30, so you receive around £95.70. European, international or business cards cost a little more. The exact amount is shown at checkout before the renter pays.",
      },
      {
        q: "Can I pass the payment fee on to my renter?",
        a: "Yes. For each chair you can choose who pays the fee. If you select 'Renter covers payment fee', the app adds the fee on top of the rent so the renter pays it and you receive the full rent amount. If you select 'Salon covers payment fee', the fee comes out of your payout and the renter only pays the rent. You can change this at any time from the Chairs page.",
      },
      {
        q: "How is the renter's total calculated when they cover the fee?",
        a: "The app works out the total needed so that, after fees, you still receive the exact rent you set. On £100 rent the renter is charged about £105.47 by card, or about £104.49 by bank. The exact total is shown to the renter before they pay.",
      },
      {
        q: "Do renters pay any fees?",
        a: "Renters never pay a fee to use the app itself. If you choose to have the renter cover the payment fee for their chair, that fee is added to their rent at checkout. Otherwise the salon subscription covers the whole salon and the renter only pays the rent amount.",
      },
      {
        q: "Is the subscription price per chair?",
        a: `No. ${PLAN_PRICE_LABEL} per month covers unlimited chairs and renters, no matter how big your salon grows.`,
      },
    ],
  },
  {
    title: "Account and security",
    items: [
      {
        q: "Is my data secure?",
        a: "Yes. Renters only ever see their own chair, rent and agreements. Owners only see their own salon data. We use industry-standard encryption and access controls.",
      },
      {
        q: "Can I change my email or password?",
        a: "Yes. Go to the Settings page to update your profile, email preferences and password.",
      },
      {
        q: "Who can see my salon's information?",
        a: "Only you and the renters you invite can see your salon data. Nobody else has access.",
      },
    ],
  },
];

function Support() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />

      <section className="bg-leaf">
        <div className="mx-auto max-w-3xl px-6 pt-16 pb-12 text-center md:pt-24 md:pb-20">
          <p className="text-sm font-medium tracking-widest text-primary uppercase">Support</p>
          <h1 className="mt-5 text-4xl leading-[1.05] font-semibold text-balance md:text-5xl">
            How can we help?
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Answers to common questions about setting up your salon, managing renters, taking
            payments and keeping your agreements in order.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="outline">
              <a href="mailto:hello@salonrenters.co.uk">
                <Mail className="mr-2 size-4" />
                hello@salonrenters.co.uk
              </a>
            </Button>
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup", redirect: undefined }}>
                Get started
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-14 md:py-16">
        <div className="space-y-12">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-2xl font-semibold md:text-3xl">{section.title}</h2>
              <dl className="mt-6 space-y-6">
                {section.items.map(({ q, a }) => (
                  <div key={q} className="rounded-2xl border border-border bg-card p-6">
                    <dt className="font-medium">{q}</dt>
                    <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/50">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold md:text-3xl">Still need help?</h2>
          <p className="mt-4 text-muted-foreground">
            Send us an email and we will get back to you as soon as we can.
          </p>
          <Button asChild size="lg" className="mt-6">
            <a href="mailto:hello@salonrenters.co.uk">
              <Mail className="mr-2 size-4" />
              Contact support
            </a>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
