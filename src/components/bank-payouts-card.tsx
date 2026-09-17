import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getStripeEnvironment } from "@/lib/stripe";
import {
  getPayoutAccountStatus,
  openPayoutDashboard,
  startPayoutOnboarding,
} from "@/utils/rent-payments.functions";

export function BankPayoutsCard({ salonId }: { salonId: string }) {
  const queryClient = useQueryClient();
  const environment = getStripeEnvironment();

  const { data: status, isLoading } = useQuery({
    queryKey: ["payout-account", salonId, environment],
    queryFn: async () => {
      const result = await getPayoutAccountStatus({ data: { environment } });
      if ("error" in result) throw new Error(result.error);
      return result;
    },
  });

  const onboard = useMutation({
    mutationFn: async () => {
      const result = await startPayoutOnboarding({
        data: { environment, returnUrl: `${window.location.origin}/settings` },
      });
      if ("error" in result) throw new Error(result.error);
      return result.url;
    },
    onSuccess: (url) => {
      const opened = window.open(url, "_blank", "noopener");
      if (!opened) {
        try {
          window.top!.location.href = url;
        } catch {
          window.location.href = url;
        }
      }
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Couldn't start bank setup"),
  });

  const dashboard = useMutation({
    mutationFn: async () => {
      const result = await openPayoutDashboard({ data: { environment } });
      if ("error" in result) throw new Error(result.error);
      return result.url;
    },
    onSuccess: (url) => window.open(url, "_blank", "noopener"),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Couldn't open your payout account"),
  });

  const ready = status?.connected && status.chargesEnabled;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle>Let renters pay straight from their bank</CardTitle>
        {status && (
          <Badge variant={ready ? "secondary" : "outline"}>
            {ready ? "Live" : status.connected ? "Setup unfinished" : "Not set up"}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Renters tap one button, approve the payment in their own banking app, and the rent
              lands in your account. No card details, and far cheaper than card payments. You
              verify your identity and bank details once with our payment partner.
            </p>

            {ready ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-border p-4 text-sm">
                  <p>
                    Taking payments:{" "}
                    <span className="font-medium">{status.chargesEnabled ? "yes" : "no"}</span>
                  </p>
                  <p>
                    Payouts to your bank:{" "}
                    <span className="font-medium">{status.payoutsEnabled ? "yes" : "pending"}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => dashboard.mutate()}
                    disabled={dashboard.isPending}
                  >
                    View payouts
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      queryClient.invalidateQueries({ queryKey: ["payout-account"] })
                    }
                  >
                    Refresh status
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {status?.connected && status.requirementsDue.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    A few details are still needed before you can take bank payments.
                  </p>
                )}
                <Button onClick={() => onboard.mutate()} disabled={onboard.isPending}>
                  {status?.connected ? "Finish bank setup" : "Set up bank payments"}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
