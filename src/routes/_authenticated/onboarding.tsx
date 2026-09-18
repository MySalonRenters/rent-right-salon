import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/hooks/use-session";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [busy, setBusy] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function createSalon(event: React.FormEvent) {
    event.preventDefault();
    const parsed = z.string().trim().min(2).max(120).safeParse(name);
    if (!parsed.success) {
      toast.error("Give your salon a name (2 to 120 characters)");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("salons")
      .insert({ name: parsed.data, currency, owner_id: membership?.userId ?? "" });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Salon created");
    navigate({ to: "/dashboard" });
  }

  if (membership && !membership.isOwner) {
    return (
      <div className="bg-leaf flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-calm)]">
          <h1 className="text-2xl font-semibold">You're not linked to a salon yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask your salon owner to send you an invite link. Once you accept it, your chair, rent
            schedule and agreements will appear here.
          </p>
          <Button variant="outline" className="mt-6 gap-2" onClick={signOut}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-leaf flex min-h-screen items-center justify-center px-6 py-12">
      <form
        onSubmit={createSalon}
        className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-calm)]"
      >
        <div>
          <h1 className="font-display text-2xl font-semibold">Set up your salon</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            This is the home for your chairs, renters, rent and agreements.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="salon">Salon name</Label>
          <Input
            id="salon"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Willow & Vine"
            maxLength={120}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GBP">GBP £</SelectItem>
              <SelectItem value="USD">USD $</SelectItem>
              <SelectItem value="EUR">EUR €</SelectItem>
              <SelectItem value="CAD">CAD $</SelectItem>
              <SelectItem value="AUD">AUD $</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="w-full" disabled={busy}>
          Create salon
        </Button>
      </form>
    </div>
  );
}
