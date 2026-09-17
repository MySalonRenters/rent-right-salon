import { createFileRoute, Link } from "@tanstack/react-router";

import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/refunds")({
  head: () => ({
    meta: [
      { title: "Refund Policy | My Salon Renters" },
      {
        name: "description",
        content:
          "Our 30 day money back guarantee for My Salon Renters subscriptions, and how to request a refund.",
      },
      { property: "og:title", content: "Refund Policy | My Salon Renters" },
      {
        property: "og:description",
        content:
          "30 day money back guarantee on My Salon Renters subscriptions, with refunds processed through Stripe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RefundsPage,
});

function RefundsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link to="/">
          <Logo />
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-16">
        <h1 className="text-3xl font-semibold md:text-4xl">Refund Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated 30 August 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:mt-1.5 [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
          <section>
            <h2>30 day money back guarantee</h2>
            <p>
              My Salon Renters is operated by Salon Renters Ltd, registered in Scotland, company
              number SC867921. If you are not satisfied with your subscription you can request a
              full refund within <strong>30 days</strong> of your order date. No explanation is
              needed, though we always appreciate knowing what did not work for you.
            </p>
          </section>

          <section>
            <h2>Free trial</h2>
            <p>
              New salons start with a free trial. You are not charged during the trial, and if you
              cancel before it ends no payment is taken at all.
            </p>
          </section>

          <section>
            <h2>How to request a refund</h2>
            <ul>
              <li>
                Open the billing page inside My Salon Renters and click Manage subscription & invoices,
                or
              </li>
              <li>
                email us at{" "}
                <a className="text-primary" href="mailto:hello@salonrenters.co.uk">
                  hello@salonrenters.co.uk
                </a>{" "}
                with your account email and we will arrange it for you.
              </li>
            </ul>
            <p>
              Refunds are processed by our payment provider Stripe back to your original payment
              method. Bank processing usually takes 5 to 10 business days after approval.
            </p>
          </section>

          <section>
            <h2>Cancelling your subscription</h2>
            <p>
              You can cancel at any time from your billing page. Your salon keeps full access until
              the end of the period you have already paid for, and after that your account moves to
              read only so your records stay available to view.
            </p>
          </section>

          <section>
            <h2>Questions</h2>
            <p>
              Email{" "}
              <a className="text-primary" href="mailto:hello@salonrenters.co.uk">
                hello@salonrenters.co.uk
              </a>{" "}
              and a real person will reply. See also our{" "}
              <Link className="text-primary" to="/terms">
                Terms of Service
              </Link>
              .
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
