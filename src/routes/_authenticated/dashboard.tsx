import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Armchair, CalendarClock, TrendingUp, Users } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SetupChecklist } from "@/components/setup-checklist";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/hooks/use-session";
import { formatDate, formatMoney } from "@/lib/format";
import { flagOverdueCharges, generateChargesForSalon } from "@/lib/rent";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: membership, isLoading } = useMembership();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && membership && !membership.salonId) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [isLoading, membership, navigate]);

  if (isLoading || !membership) {
    return (
      <AppShell title="Dashboard">
        <Skeleton className="h-40 w-full rounded-2xl" />
      </AppShell>
    );
  }

  return membership.isOwner ? (
    <OwnerDashboard salonId={membership.salonId!} currency={membership.currency} />
  ) : (
    <RenterDashboard
      userId={membership.userId}
      currency={membership.currency}
      salonName={membership.salonName}
    />
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Users;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function OwnerDashboard({ salonId, currency }: { salonId: string; currency: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["owner-dashboard", salonId],
    queryFn: async () => {
      await generateChargesForSalon(salonId, currency);
      await flagOverdueCharges(salonId);

      const [{ data: chairs }, { data: members }, { data: charges }, { data: profiles }] =
        await Promise.all([
          supabase.from("chairs").select("id, name, rent_amount, cycle").eq("salon_id", salonId),
          supabase.from("salon_members").select("user_id, chair_id, active").eq("salon_id", salonId),
          supabase
            .from("rent_charges")
            .select("id, renter_id, amount, status, due_date, period_start")
            .eq("salon_id", salonId)
            .order("due_date", { ascending: false }),
          supabase.from("profiles").select("id, full_name, email"),
        ]);

      const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? p.email ?? "Renter"]));
      const activeMembers = (members ?? []).filter((m) => m.active);
      const outstanding = (charges ?? [])
        .filter((c) => c.status === "pending" || c.status === "overdue")
        .reduce((sum, c) => sum + Number(c.amount), 0);
      const monthStart = new Date();
      monthStart.setDate(1);
      const collected = (charges ?? [])
        .filter((c) => c.status === "paid" && new Date(c.period_start) >= monthStart)
        .reduce((sum, c) => sum + Number(c.amount), 0);

      return {
        chairCount: chairs?.length ?? 0,
        activeCount: activeMembers.length,
        outstanding,
        collected,
        upcoming: (charges ?? [])
          .filter((c) => c.status !== "paid" && c.status !== "void")
          .slice(0, 6)
          .map((c) => ({ ...c, renterName: nameOf.get(c.renter_id) ?? "Renter" })),
      };
    },
  });

  return (
    <AppShell
      title="Dashboard"
      description="How your chairs and rent are doing right now"
      actions={
        <Button asChild size="sm">
          <Link to="/renters">Invite a renter</Link>
        </Button>
      }
    >
      {isLoading || !data ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : (
        <div className="space-y-7">
          <SetupChecklist salonId={salonId} />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Chairs" value={String(data.chairCount)} icon={Armchair} />
            <StatCard label="Active renters" value={String(data.activeCount)} icon={Users} />
            <StatCard
              label="Outstanding rent"
              value={formatMoney(data.outstanding, currency)}
              icon={CalendarClock}
            />
            <StatCard
              label="Collected this month"
              value={formatMoney(data.collected, currency)}
              icon={TrendingUp}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Rent due</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.upcoming.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nothing outstanding. Everyone's up to date.
                </p>
              ) : (
                data.upcoming.map((charge) => (
                  <div
                    key={charge.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{charge.renterName}</p>
                      <p className="text-sm text-muted-foreground">
                        Due {formatDate(charge.due_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={charge.status === "overdue" ? "destructive" : "secondary"}>
                        {charge.status}
                      </Badge>
                      <span className="font-semibold">
                        {formatMoney(Number(charge.amount), currency)}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div className="pt-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/rent">View all rent</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function RenterDashboard({
  userId,
  currency,
  salonName,
}: {
  userId: string;
  currency: string;
  salonName: string | null;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["renter-dashboard", userId],
    queryFn: async () => {
      const [{ data: charges }, { data: member }, { data: agreements }] = await Promise.all([
        supabase
          .from("rent_charges")
          .select("id, amount, status, due_date")
          .eq("renter_id", userId)
          .order("due_date", { ascending: false }),
        supabase
          .from("salon_members")
          .select("chair:chairs!salon_members_chair_fk(name, rent_amount, cycle)")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase.from("agreements").select("id, status").eq("renter_id", userId),
      ]);

      const open = (charges ?? []).filter((c) => c.status === "pending" || c.status === "overdue");
      return {
        chair: member?.chair as { name: string; rent_amount: number; cycle: string } | null,
        outstanding: open.reduce((sum, c) => sum + Number(c.amount), 0),
        nextDue: open[open.length - 1] ?? null,
        pendingAgreements: (agreements ?? []).filter((a) => a.status === "sent").length,
      };
    },
  });

  return (
    <AppShell title="Your chair" description={salonName ?? undefined}>
      {isLoading || !data ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : (
        <div className="space-y-7">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Your chair" value={data.chair?.name ?? "Not assigned"} icon={Armchair} />
            <StatCard
              label="Outstanding"
              value={formatMoney(data.outstanding, currency)}
              icon={CalendarClock}
            />
            <StatCard
              label="Agreements to sign"
              value={String(data.pendingAgreements)}
              icon={TrendingUp}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Next payment</CardTitle>
            </CardHeader>
            <CardContent>
              {data.nextDue ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-2xl font-semibold">
                      {formatMoney(Number(data.nextDue.amount), currency)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Due {formatDate(data.nextDue.due_date)}
                    </p>
                  </div>
                  <Button asChild>
                    <Link to="/rent">Pay rent</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You're all paid up. Nothing due right now.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
