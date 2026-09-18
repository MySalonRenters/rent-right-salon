import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/hooks/use-session";

export type SubscriptionState = {
  status: string | null;
  isActive: boolean;
  isTrialing: boolean;
  isPastDue: boolean;
  isPaused: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  productId: string | null;
  priceId: string | null;
  startedAt: string | null;
  hasEverSubscribed: boolean;
};

const ACTIVE_STATUSES = ["active", "trialing", "past_due"];

export const EMPTY_SUBSCRIPTION: SubscriptionState = {
  status: null,
  isActive: false,
  isTrialing: false,
  isPastDue: false,
  isPaused: false,
  cancelAtPeriodEnd: false,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  productId: null,
  priceId: null,
  startedAt: null,
  hasEverSubscribed: false,
};

export function useSubscription() {
  const { data: membership } = useMembership();
  const userId = membership?.userId;

  return useQuery({
    queryKey: ["subscription", userId],
    enabled: !!userId,
    queryFn: async (): Promise<SubscriptionState> => {
      const { data } = await supabase
        .from("subscriptions")
        .select(
          "status, current_period_start, current_period_end, cancel_at_period_end, product_id, price_id, created_at",
        )
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return EMPTY_SUBSCRIPTION;

      const notExpired =
        !data.current_period_end || new Date(data.current_period_end) > new Date();
      const isActive =
        (ACTIVE_STATUSES.includes(data.status) && notExpired) ||
        (data.status === "canceled" && notExpired);

      return {
        status: data.status,
        isActive,
        isTrialing: data.status === "trialing",
        isPastDue: data.status === "past_due",
        isPaused: data.status === "paused",
        cancelAtPeriodEnd: !!data.cancel_at_period_end,
        currentPeriodStart: data.current_period_start,
        currentPeriodEnd: data.current_period_end,
        productId: data.product_id,
        priceId: data.price_id,
        startedAt: data.created_at,
        hasEverSubscribed: true,
      };
    },
  });
}

export function useCanManage() {
  const { data: membership } = useMembership();
  const { data: subscription, isLoading } = useSubscription();

  if (!membership) return { canManage: false, loading: true, subscription: null };
  if (!membership.isOwner) return { canManage: true, loading: false, subscription: null };

  return {
    canManage: !!subscription?.isActive,
    loading: isLoading,
    subscription: subscription ?? null,
  };
}
