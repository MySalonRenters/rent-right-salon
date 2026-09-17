import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/app-shell";
import { BankPayoutsCard } from "@/components/bank-payouts-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { data: membership } = useMembership();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [salonName, setSalonName] = useState("");
  const [bankEnabled, setBankEnabled] = useState(false);
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankSortCode, setBankSortCode] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankReference, setBankReference] = useState("");

  const salonId = membership?.salonId ?? null;

  const { data: salon } = useQuery({
    queryKey: ["salon-bank", salonId],
    enabled: !!salonId && !!membership?.isOwner,
    queryFn: async () => {
      const { data } = await supabase
        .from("salons")
        .select(
          "bank_transfer_enabled, bank_account_name, bank_sort_code, bank_account_number, bank_payment_reference",
        )
        .eq("id", salonId!)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!salon) return;
    setBankEnabled(salon.bank_transfer_enabled ?? false);
    setBankAccountName(salon.bank_account_name ?? "");
    setBankSortCode(salon.bank_sort_code ?? "");
    setBankAccountNumber(salon.bank_account_number ?? "");
    setBankReference(salon.bank_payment_reference ?? "");
  }, [salon]);

  const saveBank = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("salons")
        .update({
          bank_transfer_enabled: bankEnabled,
          bank_account_name: bankAccountName.trim() || null,
          bank_sort_code: bankSortCode.trim() || null,
          bank_account_number: bankAccountNumber.trim() || null,
          bank_payment_reference: bankReference.trim() || null,
        })
        .eq("id", salonId!);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success(
        bankEnabled ? "Bank transfer payments are on" : "Bank transfer payments are off",
      );
    },
    onError: () => toast.error("Couldn't save your bank transfer settings"),
  });

  useEffect(() => {
    if (!membership) return;
    setFullName(membership.profile?.full_name ?? "");
    setPhone(membership.profile?.phone ?? "");
    setSalonName(membership.salonName ?? "");
  }, [membership]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const parsed = z
        .object({
          full_name: z.string().trim().min(1).max(100),
          phone: z.string().trim().max(30),
        })
        .parse({ full_name: fullName, phone });
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: parsed.full_name, phone: parsed.phone || null })
        .eq("id", membership!.userId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["membership"] });
      toast.success("Profile saved");
    },
    onError: () => toast.error("Couldn't save your profile"),
  });

  const saveSalon = useMutation({
    mutationFn: async () => {
      const parsed = z.string().trim().min(2).max(120).parse(salonName);
      const { error } = await supabase
        .from("salons")
        .update({ name: parsed })
        .eq("id", membership!.salonId!);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["membership"] });
      toast.success("Salon updated");
    },
    onError: () => toast.error("Couldn't update your salon"),
  });

  return (
    <AppShell title="Settings" description="Your details and salon preferences">
      <div className="grid max-w-3xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full name</Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={30}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={membership?.profile?.email ?? ""} disabled />
            </div>
            <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
              Save profile
            </Button>
          </CardContent>
        </Card>

        {membership?.isOwner && membership.salonId && (
          <Card>
            <CardHeader>
              <CardTitle>Salon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="salon-name">Salon name</Label>
                <Input
                  id="salon-name"
                  value={salonName}
                  onChange={(e) => setSalonName(e.target.value)}
                  maxLength={120}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Currency: {membership.currency}
              </p>
              <Button onClick={() => saveSalon.mutate()} disabled={saveSalon.isPending}>
                Save salon
              </Button>
            </CardContent>
          </Card>
        )}

        {membership?.isOwner && membership.salonId && (
          <BankPayoutsCard salonId={membership.salonId} />
        )}

        {membership?.isOwner && membership.salonId && (
          <Card>
            <CardHeader>
              <CardTitle>Bank transfer payments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-border p-4">
                <Checkbox
                  id="bank-enabled"
                  checked={bankEnabled}
                  onCheckedChange={(next) => setBankEnabled(next === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor="bank-enabled" className="cursor-pointer">
                    Let renters pay rent by bank transfer
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Renters see your account details on their rent page. You track what lands in
                    your account and issue a receipt for each transfer.
                  </p>
                </div>
              </div>

              {bankEnabled && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="bank-account-name">Account name</Label>
                    <Input
                      id="bank-account-name"
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      maxLength={120}
                      placeholder="e.g. Salon Ltd"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank-sort-code">Sort code</Label>
                    <Input
                      id="bank-sort-code"
                      value={bankSortCode}
                      onChange={(e) => setBankSortCode(e.target.value)}
                      maxLength={20}
                      placeholder="00 00 00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank-account-number">Account number</Label>
                    <Input
                      id="bank-account-number"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      maxLength={20}
                      placeholder="12345678"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="bank-reference">Reference for renters to use</Label>
                    <Input
                      id="bank-reference"
                      value={bankReference}
                      onChange={(e) => setBankReference(e.target.value)}
                      maxLength={80}
                      placeholder="e.g. Chair name or renter surname"
                    />
                  </div>
                </div>
              )}

              <Button onClick={() => saveBank.mutate()} disabled={saveBank.isPending}>
                Save bank transfer settings
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
