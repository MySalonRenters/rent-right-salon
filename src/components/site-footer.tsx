import { Link } from "@tanstack/react-router";

const links = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/support", label: "Support" },
  { to: "/terms", label: "Terms of Service" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/refunds", label: "Refund Policy" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6">
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          ))}
          <a
            href="mailto:hello@salonrenters.co.uk"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Contact
          </a>
        </nav>
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Salon Renters Ltd (trading as My Salon Renters). Registered
          in Scotland, company number SC867921.
        </p>
      </div>
    </footer>
  );
}
