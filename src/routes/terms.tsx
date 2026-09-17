import { createFileRoute, Link } from "@tanstack/react-router";

import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service | My Salon Renters" },
      {
        name: "description",
        content:
          "The terms and conditions for using My Salon Renters, the salon chair rental platform operated by Salon Renters Ltd.",
      },
      { property: "og:title", content: "Terms of Service | My Salon Renters" },
      {
        property: "og:description",
        content:
          "Terms and conditions for using the My Salon Renters chair rental platform, operated by Salon Renters Ltd.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link to="/">
          <Logo />
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-16">
        <h1 className="text-3xl font-semibold md:text-4xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated 30 August 2026</p>

        <div className="prose-sm mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:mt-1.5 [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
          <section>
            <h2>1. Who you are contracting with</h2>
            <p>
              My Salon Renters is operated by <strong>Salon Renters Ltd</strong>, a company
              registered in Scotland with company number <strong>SC867921</strong> ("we", "us",
              "our"). When you use the platform you are entering into a contract with Salon Renters
              Ltd. You can reach us at{" "}
              <a className="text-primary" href="mailto:hello@salonrenters.co.uk">
                hello@salonrenters.co.uk
              </a>
              .
            </p>
          </section>

          <section>
            <h2>2. Acceptance of these terms</h2>
            <p>
              By creating an account, accessing or continuing to use My Salon Renters you agree to
              these terms. If you do not agree, please stop using the service. If you are using the
              platform on behalf of a salon or other business, you confirm you have authority to
              bind that business. If you are using it as an individual, you confirm you are at least
              18 years old.
            </p>
          </section>

          <section>
            <h2>3. The service</h2>
            <p>
              My Salon Renters is a software platform that helps salon owners manage chair renters:
              recording chairs and rent, inviting renters, raising and tracking rent charges,
              collecting card payments, sending reminders, and creating, signing and storing chair
              rental agreements.
            </p>
            <p>
              We provide software only. We are not a party to any rental arrangement between a salon
              owner and a chair renter, we do not provide legal advice, and the agreement templates
              are starting points that you should review (and if needed have checked by a solicitor)
              before use.
            </p>
          </section>

          <section>
            <h2>4. Your account</h2>
            <ul>
              <li>Provide accurate information and keep it up to date.</li>
              <li>Keep your login details confidential and do not share your account.</li>
              <li>You are responsible for all activity carried out under your account.</li>
              <li>Tell us promptly if you believe your account has been compromised.</li>
            </ul>
          </section>

          <section>
            <h2>5. Acceptable use</h2>
            <p>You must not:</p>
            <ul>
              <li>use the service for anything unlawful, fraudulent or misleading;</li>
              <li>send spam, or upload content you do not have the rights to use;</li>
              <li>infringe anyone's intellectual property or privacy rights;</li>
              <li>
                interfere with the security or integrity of the service, including introducing
                malware, probing or scanning our systems, bypassing access controls, or scraping
                data;
              </li>
              <li>reverse engineer, resell or redistribute the service, or circumvent plan limits.</li>
            </ul>
          </section>

          <section>
            <h2>6. Your content</h2>
            <p>
              You keep ownership of the content you upload, including renter details, agreements and
              signatures. You grant us a limited licence to host, process and display that content
              solely so we can provide the service to you. You are responsible for having the right
              to upload personal data about your renters and for handling it lawfully.
            </p>
          </section>

          <section>
            <h2>7. Our intellectual property</h2>
            <p>
              We own the platform and everything in it, including the software, design,
              documentation and branding. You get a limited, non exclusive, non transferable right
              to use the service within your chosen plan for the duration of your subscription.
            </p>
          </section>

          <section>
            <h2>8. Payment and subscription terms</h2>
            <p>
              Subscriptions are sold on a monthly basis at the price shown on our pricing page,
              typically after a free trial. Payments are processed by our payment partner Stripe,
              which handles card processing, billing, renewals and cancellations securely.
            </p>
            <p>
              You are responsible for ensuring your payment details are up to date. Your
              subscription renews automatically each billing period until you cancel. You can cancel
              at any time from your billing page, and access continues until the end of the paid
              period. See also our{" "}
              <Link className="text-primary" to="/refunds">
                Refund Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2>9. Service availability</h2>
            <p>
              We work hard to keep the platform available, but we do not guarantee that it will be
              uninterrupted, timely, secure or error free. We may carry out maintenance, and we may
              change or improve features over time.
            </p>
          </section>

          <section>
            <h2>10. Suspension and termination</h2>
            <p>
              We may suspend or terminate your access if you materially breach these terms, fail to
              pay for your subscription, present a security or fraud risk, or repeatedly or
              seriously breach our acceptable use rules. Where reasonable we will contact you first.
              You may stop using the service and cancel at any time.
            </p>
            <p>
              After termination you can request an export of your data for 30 days, after which we
              may delete or anonymise it in line with our{" "}
              <Link className="text-primary" to="/privacy">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2>11. Warranties and liability</h2>
            <p>
              To the fullest extent permitted by law we exclude all implied warranties, including
              merchantability, satisfactory quality and fitness for a particular purpose. We are not
              liable for indirect, consequential or special losses, including lost profits, lost
              revenue, lost data or loss of goodwill.
            </p>
            <p>
              Our total aggregate liability arising out of or in connection with the service is
              limited to the fees you paid us in the 12 months before the event giving rise to the
              claim. Nothing in these terms limits liability for fraud, death or personal injury
              caused by negligence, or any other liability that cannot be limited by law.
            </p>
          </section>

          <section>
            <h2>12. Indemnity</h2>
            <p>
              You agree to indemnify us against claims, losses and reasonable costs arising from
              your content, your unlawful use of the service, or your breach of these terms.
            </p>
          </section>

          <section>
            <h2>13. General</h2>
            <ul>
              <li>
                You may not assign these terms without our consent. We may assign them as part of a
                merger, acquisition or sale of assets.
              </li>
              <li>
                Neither party is liable for delays caused by events beyond their reasonable control.
              </li>
              <li>
                We may update these terms. Material changes will be notified by email or in app
                before they take effect.
              </li>
              <li>
                These terms are governed by the laws of Scotland, and the courts of Scotland have
                exclusive jurisdiction, subject to any mandatory consumer rights you may have.
              </li>
            </ul>
          </section>

          <section>
            <h2>14. Contact</h2>
            <p>
              Salon Renters Ltd, company number SC867921. Email{" "}
              <a className="text-primary" href="mailto:hello@salonrenters.co.uk">
                hello@salonrenters.co.uk
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
