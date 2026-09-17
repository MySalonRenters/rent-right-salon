import { createFileRoute, Link } from "@tanstack/react-router";

import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | My Salon Renters" },
      {
        name: "description",
        content:
          "How Salon Renters Ltd collects, uses, shares and protects personal data on the My Salon Renters chair rental platform.",
      },
      { property: "og:title", content: "Privacy Policy | My Salon Renters" },
      {
        property: "og:description",
        content:
          "How Salon Renters Ltd handles personal data, your UK GDPR rights, retention periods and cookies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link to="/">
          <Logo />
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-16">
        <h1 className="text-3xl font-semibold md:text-4xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated 11 September 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:mt-1.5 [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
          <section>
            <h2>1. Who we are</h2>
            <p>
              <strong>Salon Renters Ltd</strong>, registered in Scotland with company number{" "}
              <strong>SC867921</strong>, trading as My Salon Renters, is the data controller for the
              personal data described in this notice. Contact us at{" "}
              <a className="text-primary" href="mailto:hello@salonrenters.co.uk">
                hello@salonrenters.co.uk
              </a>
              .
            </p>
            <p>
              Where a salon owner uses the platform to manage their own renters, the salon owner is
              the controller of that renter data and we act as their processor. For account holders
              and visitors to our website, we are the controller.
            </p>
          </section>

          <section>
            <h2>2. Personal data we collect and why</h2>
            <ul>
              <li>
                <strong>Account data</strong> (name, email, password credentials, role, salon name):
                to create and secure your account and provide the service. Legal basis: performance
                of a contract.
              </li>
              <li>
                <strong>Salon and rental data</strong> (chairs, rent amounts, charges, payment
                records, renter details, agreements and e signatures): to deliver the core features
                you ask us to run. Legal basis: performance of a contract.
              </li>
              <li>
                <strong>Support messages</strong> you send us: to answer your questions. Legal
                basis: legitimate interests in supporting our customers.
              </li>
              <li>
                <strong>Usage and telemetry, device identifiers, IP address, log data</strong>: to
                keep the service secure, prevent fraud and abuse, diagnose faults and improve the
                product. Legal basis: legitimate interests.
              </li>
              <li>
                <strong>Marketing contact details</strong>, where you have opted in: to send product
                updates. Legal basis: consent, which you can withdraw at any time.
              </li>
              <li>
                <strong>Advertising measurement data</strong> (email and name in hashed form, device
                identifiers, IP address, browser details, page URL and account registration time):
                to measure registrations resulting from Meta advertising where permitted. Recipient:
                Meta Platforms Ireland Limited. Legal basis: consent where required and otherwise our
                legitimate interests, subject to applicable opt outs.
              </li>
              <li>
                <strong>Records required by law</strong>, such as tax and accounting records. Legal
                basis: legal obligation.
              </li>
            </ul>
          </section>

          <section>
            <h2>3. Who we share data with</h2>
            <ul>
              <li>
                <strong>Service providers and subprocessors</strong> who host our infrastructure and
                database, send our emails, and provide analytics and error monitoring.
              </li>
              <li>
                <strong>Stripe</strong>, our payment processor, for subscription billing, card
                processing, tax calculation and invoicing.
              </li>
              <li>
                <strong>Professional advisers</strong> such as our accountants and lawyers, where
                needed.
              </li>
              <li>
                <strong>Authorities</strong> where we are required to disclose by law, and acquirers
                in the event of a merger or sale of the business.
              </li>
            </ul>
            <p>We do not sell your personal data.</p>
          </section>

          <section>
            <h2>4. International transfers</h2>
            <p>
              Some of our providers process data outside the UK and EEA. Where that happens we rely
              on UK adequacy regulations or on the UK International Data Transfer Addendum and EU
              Standard Contractual Clauses, together with appropriate technical safeguards.
            </p>
          </section>

          <section>
            <h2>5. How long we keep data</h2>
            <p>
              We keep account and salon data for as long as your account is active. After you close
              your account we delete or anonymise personal data within 90 days, except where we must
              keep it longer: financial and tax records are retained for 6 years, and signed
              agreements are retained for as long as the salon owner requires them or 6 years from
              the end of the agreement, whichever is shorter.
            </p>
          </section>

          <section>
            <h2>6. Your rights</h2>
            <p>
              Under UK GDPR you have the right to access your data, to have it corrected or erased,
              to restrict or object to processing, to data portability, and to withdraw consent
              where processing is based on consent. Email{" "}
              <a className="text-primary" href="mailto:hello@salonrenters.co.uk">
                hello@salonrenters.co.uk
              </a>{" "}
              and we will respond within one month. You can also complain to the Information
              Commissioner's Office at ico.org.uk.
            </p>
          </section>

          <section>
            <h2>7. Security</h2>
            <p>
              We use appropriate technical and organisational measures, including encryption in
              transit and at rest, row level access controls so renters only ever see their own
              data, least privilege access for our team, and regular backups. No system is perfectly
              secure, so please use a strong, unique password.
            </p>
          </section>

          <section>
            <h2>8. Cookies</h2>
            <p>
              We use essential cookies and local storage to keep you signed in and to keep the
              service secure. We use the Meta Pixel and Meta Conversions API to measure advertising
              in locations where this is permitted without a consent banner. Meta advertising tags
              and server events are blocked in the UK, EEA and any location we cannot reliably
              identify. A registration blocked at the time it occurs is not sent later. You can also
              block non-essential cookies in your browser and use your Facebook ad settings to opt
              out of interest based advertising. Blocking essential cookies will stop parts of the
              service from working.
            </p>
          </section>

          <section>
            <h2>9. Changes and contact</h2>
            <p>
              We may update this notice from time to time and will tell you about material changes.
              Questions? Email{" "}
              <a className="text-primary" href="mailto:hello@salonrenters.co.uk">
                hello@salonrenters.co.uk
              </a>
              , or read our{" "}
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
