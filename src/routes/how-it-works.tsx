import { createFileRoute, Link } from "@tanstack/react-router";
import { Armchair, CreditCard, FileSignature, Mail, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MarketingHeader } from "@/components/marketing-header";
import { SiteFooter } from "@/components/site-footer";

import { TRIAL_DAYS } from "@/lib/payments";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works | My Salon Renters" },
      {
        name: "description",
        content:
          "See how My Salon Renters works: add your chairs, invite renters, take rent by card and get rental agreements signed and stored in one place.",
      },
      { property: "og:title", content: "How it works | My Salon Renters" },
      {
        property: "og:description",
        content:
          "Add chairs, invite renters, take rent by card and sign agreements. Here is how My Salon Renters works, step by step.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowItWorks,
});

const steps = [
  {
    icon: Armchair,
    title: "1. Add your chairs",
    body: "Create a chair for every station in your salon, set the rent and choose weekly or monthly billing. Your dashboard then shows which chairs are earning and which are free.",
  },
  {
    icon: UserPlus,
    title: "2. Invite your renters",
    body: "Send an email invite to each stylist. They sign up through the link, land in their own private portal and are attached to the chair you assigned them.",
  },
  {
    icon: FileSignature,
    title: "3. Send the agreement",
    body: "Build a chair rental agreement from the template with your legal names, location, currency and terms. Both sides sign in app, and the signed copy is stored for good.",
  },
  {
    icon: CreditCard,
    title: "4. Collect the rent",
    body: "Rent is raised automatically each cycle. Renters pay by card in a few taps, and cash or bank transfers can be recorded by hand so everything sits in one ledger.",
  },
  {
    icon: Mail,
    title: "5. Let the reminders do the chasing",
    body: "Renters are nudged before rent is due, on the day, and again if it slips. Overdue amounts are flagged on both dashboards so nothing gets forgotten.",
  },
];

const faqs = [
  {
    q: "How long does setup take?",
    a: "Most salons are up and running in under ten minutes. Add your chairs, invite your renters and you are done.",
  },
  {
    q: "What do my renters see?",
    a: "Only their own chair, their own rent and their own agreements. They never see another renter's details or your salon totals.",
  },
  {
    q: "Do I have to use card payments?",
    a: "No. Card payments are there if you want them, but you can record cash and bank transfers by hand and still keep a complete history.",
  },
];

function HowItWorks() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />


      <section className="bg-leaf">
        <div className="mx-auto max-w-3xl px-5 py-12 text-center sm:px-6 md:py-20">
          <p className="text-sm font-medium tracking-widest text-primary uppercase">
            How it works
          </p>
          <h1 className="mt-4 text-3xl leading-[1.1] font-semibold text-balance sm:text-4xl md:text-5xl">
            From empty chair to rent in the bank
          </h1>
          <p className="mt-5 text-base text-muted-foreground sm:text-lg">
            Five simple steps to run every chair rental in your salon, without spreadsheets
            or awkward conversations.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-12 sm:px-6 md:py-16">
        <ol className="space-y-5 md:space-y-6">
          {steps.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-calm)] sm:p-7"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-border bg-muted/50">
        <div className="mx-auto max-w-4xl px-5 py-12 sm:px-6 md:py-16">
          <h2 className="text-2xl font-semibold sm:text-3xl">Common questions</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2 md:gap-6">
            {faqs.map(({ q, a }) => (
              <article key={q}>
                <h3 className="font-medium">{q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-14 text-center sm:px-6 md:py-16">
        <h2 className="text-2xl font-semibold sm:text-3xl">Ready to try it?</h2>
        <p className="mt-4 text-muted-foreground">
          Free for {TRIAL_DAYS} days. Cancel before it ends and you are not charged.
        </p>
        <Button asChild size="lg" className="mt-7">
          <Link to="/auth" search={{ mode: "signup", redirect: undefined }}>
            Set up my salon
          </Link>
        </Button>
      </section>

      <SiteFooter />
    </div>
  );
}
