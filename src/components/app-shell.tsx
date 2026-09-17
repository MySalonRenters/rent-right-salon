import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Armchair,
  CreditCard,
  FileSignature,
  LayoutDashboard,
  LogOut,
  Lock,
  Menu,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/hooks/use-session";
import { useCanManage } from "@/hooks/use-subscription";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { initialsOf } from "@/lib/format";
import { Logo } from "@/components/logo";

const ownerNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/chairs", label: "Chairs", icon: Armchair },
  { to: "/renters", label: "Renters", icon: Users },
  { to: "/rent", label: "Rent & payments", icon: Wallet },
  { to: "/agreements", label: "Agreements", icon: FileSignature },
  { to: "/billing", label: "Billing & plan", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const renterNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/rent", label: "My rent", icon: Wallet },
  { to: "/agreements", label: "My agreements", icon: FileSignature },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { data: membership } = useMembership();
  const [open, setOpen] = useState(false);
  const nav = membership?.isOwner ? ownerNav : renterNav;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { canManage, loading: planLoading } = useCanManage();
  const readOnly = !planLoading && !canManage && pathname !== "/billing";

  return (
    <>
    <PaymentTestModeBanner />
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar p-5 lg:flex">
        <SidebarContent nav={nav} onNavigate={() => undefined} />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-card/70 px-5 py-4 backdrop-blur lg:px-9">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-5">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SidebarContent nav={nav} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold">{title}</h1>
            {description && (
              <p className="truncate text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <NotificationBell />
          {actions}
        </header>

        {readOnly && (
          <div className="flex flex-col gap-3 border-b border-border bg-accent/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-9">
            <p className="flex items-start gap-2.5 text-sm">
              <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                Your salon is <strong>read only</strong>. Everything is still here to view, but
                you need an active plan to make changes.
              </span>
            </p>
            <Button asChild size="sm" className="shrink-0">
              <Link to="/billing" search={{ checkout: undefined }}>View plans</Link>
            </Button>
          </div>
        )}

        <main
          className="flex-1 px-5 py-7 lg:px-9 lg:py-9"
          {...(readOnly ? { inert: "" as unknown as boolean } : {})}
        >
          {children}
        </main>
      </div>
    </div>
    </>
  );
}

function SidebarContent({
  nav,
  onNavigate,
}: {
  nav: readonly { to: string; label: string; icon: typeof Armchair }[];
  onNavigate: () => void;
}) {
  const { data: membership } = useMembership();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <>
      <Link to="/dashboard" onClick={onNavigate}>
        <Logo />
      </Link>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {membership?.salonName ?? "No salon yet"}
      </p>

      <nav className="mt-7 flex flex-1 flex-col gap-1">
        {nav.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            {...(to === "/billing" ? { search: { checkout: undefined } as never } : {})}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === to
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 border-t border-sidebar-border pt-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {initialsOf(membership?.profile?.full_name ?? membership?.profile?.email)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {membership?.profile?.full_name ?? "Your account"}
            </p>
            <p className="truncate text-xs text-muted-foreground capitalize">
              {membership?.isOwner ? "Salon owner" : "Chair renter"}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
