import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Armchair, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";


import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/hooks/use-session";
import { formatMoney } from "@/lib/format";
import { bankChargeTotal, chargeTotal, feeAddedOn, type FeePaidBy } from "@/lib/fees";

export const Route = createFileRoute("/_authenticated/chairs")({
  component: ChairsPage,
});

function ChairsPage() {
  const { data: membership } = useMembership();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [rent, setRent] = useState("");
  const [cycle, setCycle] = useState<"weekly" | "monthly">("weekly");
  const [feePaidBy, setFeePaidBy] = useState<FeePaidBy>("salon");
  const [rentChair, setRentChair] = useState<{ id: string; name: string } | null>(null);
  const [rentEmail, setRentEmail] = useState("");


  const salonId = membership?.salonId ?? null;
  const currency = membership?.currency ?? "GBP";

  const { data: chairs, isLoading } = useQuery({
    queryKey: ["chairs", salonId],
    enabled: !!salonId,
    queryFn: async () => {
      const [{ data: rows }, { data: members }, { data: profiles }] = await Promise.all([
        supabase
          .from("chairs")
          .select("id, name, description, rent_amount, cycle, fee_paid_by")
          .eq("salon_id", salonId!)
          .order("name"),
        supabase
          .from("salon_members")
          .select("user_id, chair_id")
          .eq("salon_id", salonId!)
          .eq("active", true),
        supabase.from("profiles").select("id, full_name, email"),
      ]);
      const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? p.email ?? "Renter"]));
      const occupant = new Map(
        (members ?? [])
          .filter((m) => m.chair_id)
          .map((m) => [m.chair_id!, nameOf.get(m.user_id) ?? "Renter"]),
      );
      return (rows ?? []).map((chair) => ({ ...chair, occupant: occupant.get(chair.id) ?? null }));
    },
  });

  const addChair = useMutation({
    mutationFn: async () => {
      const parsed = z
        .object({
          name: z.string().trim().min(1).max(80),
          rent: z.coerce.number().min(0).max(100000),
        })
        .parse({ name, rent });
      const { error } = await supabase.from("chairs").insert({
        salon_id: salonId!,
        name: parsed.name,
        rent_amount: parsed.rent,
        cycle,
        fee_paid_by: feePaidBy,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setOpen(false);
      setName("");
      setRent("");
      setFeePaidBy("salon");
      await queryClient.invalidateQueries({ queryKey: ["chairs"] });
      toast.success("Chair added");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Couldn't add chair"),
  });

  const removeChair = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chairs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["chairs"] });
      toast.success("Chair removed");
    },
    onError: () => toast.error("Couldn't remove that chair. It may still be assigned."),
  });

  const setChairFee = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: FeePaidBy }) => {
      const { error } = await supabase.from("chairs").update({ fee_paid_by: value }).eq("id", id);
      if (error) throw error;
      return value;
    },
    onSuccess: async (value) => {
      await queryClient.invalidateQueries({ queryKey: ["chairs"] });
      toast.success(
        value === "renter" ? "Payment fee added on top of rent" : "Salon covers the payment fee",
      );
    },
    onError: () => toast.error("Couldn't update that chair"),
  });

  const rentOut = useMutation({
    mutationFn: async () => {
      const parsedEmail = z.string().trim().email().max(255).parse(rentEmail);
      const { data: row, error } = await supabase
        .from("invites")
        .insert({ salon_id: salonId!, email: parsedEmail, chair_id: rentChair!.id })
        .select("token")
        .single();
      if (error) throw error;
      return row.token as string;
    },
    onSuccess: async (token) => {
      setRentChair(null);
      setRentEmail("");
      await queryClient.invalidateQueries();
      await navigator.clipboard
        .writeText(`${window.location.origin}/invite/${token}`)
        .catch(() => undefined);
      toast.success("Invite created. Link copied to your clipboard");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Couldn't create that invite"),
  });


  if (membership && !membership.isOwner) {
    return (
      <AppShell title="Chairs">
        <p className="text-sm text-muted-foreground">Only salon owners can manage chairs.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Chairs"
      description="Your stations, their rent and who's in them"
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> Add chair
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a chair</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chair-name">Chair name</Label>
                <Input
                  id="chair-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Station 1"
                  maxLength={80}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="chair-rent">Rent amount</Label>
                  <Input
                    id="chair-rent"
                    type="number"
                    min="0"
                    step="0.01"
                    value={rent}
                    onChange={(e) => setRent(e.target.value)}
                    placeholder="150"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chair-cycle">Billed</Label>
                  <Select value={cycle} onValueChange={(v) => setCycle(v as "weekly" | "monthly")}>
                    <SelectTrigger id="chair-cycle">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="chair-fee">Payment processing fee</Label>
                <Select value={feePaidBy} onValueChange={(v) => setFeePaidBy(v as FeePaidBy)}>
                  <SelectTrigger id="chair-fee">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salon">Salon pays it</SelectItem>
                    <SelectItem value="renter">Renter pays it</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {feePaidBy === "renter"
                    ? `Renter is billed ${formatMoney(chargeTotal(Number(rent) || 0, "renter"), currency)} by card, or ${formatMoney(bankChargeTotal(Number(rent) || 0, "renter"), currency)} by bank, so you receive ${formatMoney(Number(rent) || 0, currency)}.`
                    : "The fee comes out of your rent, so you receive slightly less than the rent amount."}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => addChair.mutate()} disabled={addChair.isPending}>
                Add chair
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : !chairs?.length ? (
        <EmptyChairs />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {chairs.map((chair) => (
            <Card key={chair.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{chair.name}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {formatMoney(Number(chair.rent_amount), currency)} · {chair.cycle}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${chair.name}`}
                    onClick={() => removeChair.mutate(chair.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="mt-4 space-y-2">
                  <Label htmlFor={`fee-${chair.id}`} className="text-xs text-muted-foreground">
                    Payment fee paid by
                  </Label>
                  <Select
                    value={(chair.fee_paid_by as FeePaidBy | null) ?? "salon"}
                    onValueChange={(v) =>
                      setChairFee.mutate({ id: chair.id, value: v as FeePaidBy })
                    }
                  >
                    <SelectTrigger id={`fee-${chair.id}`} className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salon">Salon</SelectItem>
                      <SelectItem value="renter">Renter</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {((chair.fee_paid_by as FeePaidBy | null) ?? "salon") === "renter"
                      ? `Billed ${formatMoney(chargeTotal(Number(chair.rent_amount), "renter"), currency)} by card or ${formatMoney(bankChargeTotal(Number(chair.rent_amount), "renter"), currency)} by bank (rent plus ${formatMoney(feeAddedOn(Number(chair.rent_amount), "renter"), currency)} card fee)`
                      : "Fee deducted from your payout"}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  {chair.occupant ? (
                    <Badge variant="secondary">{chair.occupant}</Badge>
                  ) : (
                    <Badge variant="outline">Available</Badge>
                  )}
                  {!chair.occupant && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRentEmail("");
                        setRentChair({ id: chair.id, name: chair.name });
                      }}
                    >
                      <UserPlus className="size-4" /> Rent out
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!rentChair} onOpenChange={(v) => !v && setRentChair(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rent out {rentChair?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rent-email">Renter's email</Label>
              <Input
                id="rent-email"
                type="email"
                value={rentEmail}
                onChange={(e) => setRentEmail(e.target.value)}
                maxLength={255}
                placeholder="renter@example.com"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              We'll create a private invite for this chair and copy the link to your clipboard.
              Once they accept, {rentChair?.name} is theirs and rent starts tracking.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => rentOut.mutate()} disabled={rentOut.isPending}>
              Create invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>

  );
}

function EmptyChairs() {
  return (
    <div className="rounded-2xl border border-dashed border-border p-12 text-center">
      <Armchair className="mx-auto size-8 text-muted-foreground" />
      <p className="mt-3 font-medium">No chairs yet</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Add each station you rent out, with its rent and billing cycle.
      </p>
    </div>
  );
}
