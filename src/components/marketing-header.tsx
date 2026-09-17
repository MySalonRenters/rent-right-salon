import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const links = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/support", label: "Support" },
] as const;

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-5 sm:px-6 sm:py-6">
      <Link to="/" className="min-w-0">
        <Logo />
      </Link>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <nav className="hidden items-center gap-1 md:flex">
          {links.map(({ to, label }) => (
            <Button key={to} asChild variant="ghost">
              <Link to={to}>{label}</Link>
            </Button>
          ))}
          <Button asChild variant="ghost">
            <Link to="/auth" search={{ mode: "signin", redirect: undefined }}>
              Sign in
            </Link>
          </Button>
          <Button asChild>
            <Link to="/auth" search={{ mode: "signup", redirect: undefined }}>
              Get started
            </Link>
          </Button>
        </nav>

        <Button asChild size="sm" className="hidden sm:inline-flex md:hidden">
          <Link to="/auth" search={{ mode: "signup", redirect: undefined }}>
            Get started
          </Link>
        </Button>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 bg-background p-5">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <nav className="mt-8 flex flex-col gap-2">
              {links.map(({ to, label }) => (
                <Button
                  key={to}
                  asChild
                  variant="ghost"
                  className="justify-start"
                  onClick={() => setOpen(false)}
                >
                  <Link to={to}>{label}</Link>
                </Button>
              ))}
              <Button
                asChild
                variant="ghost"
                className="justify-start"
                onClick={() => setOpen(false)}
              >
                <Link to="/auth" search={{ mode: "signin", redirect: undefined }}>
                  Sign in
                </Link>
              </Button>
              <Button
                asChild
                className="mt-2 w-full"
                onClick={() => setOpen(false)}
              >
                <Link to="/auth" search={{ mode: "signup", redirect: undefined }}>
                  Get started
                </Link>
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
