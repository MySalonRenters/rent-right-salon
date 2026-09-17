import { useQuery } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type AppRole = "owner" | "renter";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async (): Promise<User | null> => {
      const { data } = await supabase.auth.getUser();
      return data.user ?? null;
    },
  });
}

export type Membership = {
  userId: string;
  role: AppRole;
  profile: { full_name: string | null; email: string | null; phone: string | null } | null;
  salonId: string | null;
  salonName: string | null;
  currency: string;
  chairId: string | null;
  isOwner: boolean;
};

export function useMembership() {
  return useQuery({
    queryKey: ["membership"],
    queryFn: async (): Promise<Membership | null> => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;

      const [{ data: roleRows }, { data: profile }, { data: ownedSalons }, { data: memberships }] =
        await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", user.id),
          supabase.from("profiles").select("full_name, email, phone").eq("id", user.id).maybeSingle(),
          supabase.from("salons").select("id, name, currency").eq("owner_id", user.id).limit(1),
          supabase.from("salon_members").select("salon_id, chair_id").eq("user_id", user.id).limit(1),
        ]);

      const roles = (roleRows ?? []).map((r) => r.role as AppRole);
      const isOwner = roles.includes("owner");
      const ownedSalon = ownedSalons?.[0] ?? null;
      const membership = memberships?.[0] ?? null;

      let salonName: string | null = ownedSalon?.name ?? null;
      let currency = ownedSalon?.currency ?? "GBP";
      if (!isOwner && membership) {
        const { data: salon } = await supabase
          .from("salons")
          .select("name, currency")
          .eq("id", membership.salon_id)
          .maybeSingle();
        salonName = salon?.name ?? null;
        currency = salon?.currency ?? "GBP";
      }

      return {
        userId: user.id,
        role: isOwner ? "owner" : "renter",
        profile: profile ?? null,
        salonId: isOwner ? (ownedSalon?.id ?? null) : (membership?.salon_id ?? null),
        salonName,
        currency,
        chairId: membership?.chair_id ?? null,
        isOwner,
      };
    },
  });
}
