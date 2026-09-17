import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

type Step = {
  key: string;
  title: string;
  description: string;
  done: boolean;
  to: "/chairs" | "/renters" | "/agreements" | "/settings" | "/rent";
  action: string;
};

export function SetupChecklist({ salonId }: { salonId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["setup-checklist", salonId],
    queryFn: async () => {
      const [chairs, members, agreements, salon, payments] = await Promise.all([
        supabase.from("chairs").select("id").eq("salon_id", salonId).limit(1),
        supabase.from("salon_members").select("id").eq("salon_id", salonId).limit(1),
        supabase.from("agreements").select("id, status").eq("salon_id", salonId).limit(1),
        supabase
          .from("salons")
          .select(
            "bank_transfer_enabled, bank_account_number, stripe_charges_enabled, stripe_details_submitted",
          )
          .eq("id", salonId)
          .maybeSingle(),
        supabase.from("rent_charges").select("id").eq("salon_id", salonId).limit(1),
      ]);

      const invites = await supabase
        .from("invites")
        .select("id")
        .eq("salon_id", salonId)
        .limit(1);

      const s = salon.data;
      const payoutsReady =
        !!s &&
        ((s.bank_transfer_enabled && !!s.bank_account_number) ||
          s.stripe_charges_enabled ||
          s.stripe_details_submitted);

      return {
        hasChair: (chairs.data?.length ?? 0) > 0,
        hasRenter:
          (members.data?.length ?? 0) > 0 || (invites.data?.length ?? 0) > 0,
        hasAgreement: (agreements.data?.length ?? 0) > 0,
        payoutsReady,
        hasRent: (payments.data?.length ?? 0) > 0,
      };
    },
  });

  if (isLoading || !data) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }

  const steps: Step[] = [
    {
      key: "chair",
      title: "Add your first chair",
      description: "Set the rent amount and how often it is charged.",
      done: data.hasChair,
      to: "/chairs",
      action: "Add a chair",
    },
    {
      key: "renter",
      title: "Invite your first renter",
      description: "Send an email invite and link them to a chair.",
      done: data.hasRenter,
      to: "/renters",
      action: "Invite a renter",
    },
    {
      key: "agreement",
      title: "Send a rental agreement",
      description: "Both of you sign it online and it is stored for you.",
      done: data.hasAgreement,
      to: "/agreements",
      action: "Create an agreement",
    },
    {
      key: "payouts",
      title: "Set up how you get paid",
      description: "Turn on bank transfer details or card payouts.",
      done: data.payoutsReady,
      to: "/settings",
      action: "Set up payouts",
    },
    {
      key: "rent",
      title: "Track your first rent payment",
      description: "Rent is raised automatically once a chair has a renter.",
      done: data.hasRent,
      to: "/rent",
      action: "View rent",
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  if (completed === steps.length) return null;

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle>Get set up</CardTitle>
        <div className="flex items-center gap-3">
          <Progress value={(completed / steps.length) * 100} className="h-2" />
          <span className="shrink-0 text-sm text-muted-foreground">
            {completed} of {steps.length} done
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step) => (
          <div
            key={step.key}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border ${
                  step.done
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {step.done ? <Check className="size-3.5" /> : null}
              </span>
              <div>
                <p className={`font-medium ${step.done ? "text-muted-foreground line-through" : ""}`}>
                  {step.title}
                </p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
            {!step.done && (
              <Button asChild size="sm" variant="outline">
                <Link to={step.to}>
                  {step.action}
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
