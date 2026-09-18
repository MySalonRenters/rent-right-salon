import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/hooks/use-session";
import { daysUntil, formatDate, formatMoney } from "@/lib/format";
import { flagOverdueCharges, generateChargesForSalon } from "@/lib/rent";
import { createRentBankPayment } from "@/utils/rent-payments.functions";

export const Route = createFileRoute("/_authenticated/rent")({
  component: RentPage,
});

type Charge = {
  id: string;
  renter_id: string;
  amount: number;
  status: string;
  due_date: string;
  period_start: string;
  period_end: string;
  renterName?: string;
};

type PaymentRow = {
  id: string;
  charge_id: string | null;
  amount: number;
  method: string;
  reference: string | null;
  paid_at: string;
  receipt_number: string | null;
  receipt_issued_at: string | null;
};

function statusVariant(status: string) {
  if (status === "paid") return "secondary" as const;
  if (status === "overdue") return "destructive" as const;
  return "outline" as const;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

function RentPage() {
  const { data: membership, isLoading: loadingMembership } = useMembership();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"open" | "paid" | "all">("open");
  const [paying, setPaying] = useState<Charge | null>(null);
  const [howToPay, setHowToPay] = useState<Charge | null>(null);
  const [method, setMethod] = useState<"bank_transfer" | "card" | "cash" | "other">(
    "bank_transfer",
  );
  const [reference, setReference] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [issueReceipt, setIssueReceipt] = useState(true);

  const salonId = membership?.salonId ?? null;
  const isOwner = membership?.isOwner ?? false;
  const currency = membership?.currency ?? "GBP";

  const { data: salon } = useQuery({
    queryKey: ["salon-bank-details", salonId],
    enabled: !!salonId,
    queryFn: async () => {
      const { data } = await supabase
        .from("salons")
        .select(
          "name, bank_transfer_enabled, bank_account_name, bank_sort_code, bank_account_number, bank_payment_reference, stripe_charges_enabled",
        )
        .eq("id", salonId!)
        .maybeSingle();
      return data;
    },
  });

  const bankPayEnabled = true; // TEMP: forced on to preview UI — revert this before committing

  const payFromBank = useMutation({
    mutationFn: async (charge: Charge) => {
      const result = await createRentBankPayment({
        data: {
          chargeId: charge.id,
          returnUrl: `${window.location.origin}/rent`,
        },
      });
      if ("error" in result) throw new Error(result.error);
      return result.url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Couldn't start that payment"),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get("rent");
    if (!outcome) return;
    if (outcome === "paid") {
      toast.success("Payment sent. Your salon will see it shortly.");
      void queryClient.invalidateQueries();
    } else if (outcome === "cancelled") {
      toast.info("Payment cancelled. Nothing has left your account.");
    }
    window.history.replaceState({}, "", "/rent");
  }, [queryClient]);

  const bankEnabled = salon?.bank_transfer_enabled ?? false;

  const { data: charges, isLoading } = useQuery({
    queryKey: ["rent", salonId, membership?.userId, isOwner],
    enabled: !!membership,
    queryFn: async (): Promise<Charge[]> => {
      if (isOwner && salonId) {
        await generateChargesForSalon(salonId, currency);
        await flagOverdueCharges(salonId);
      }
      let query = supabase
        .from("rent_charges")
        .select("id, renter_id, amount, status, due_date, period_start, period_end")
        .order("due_date", { ascending: false });
      query = isOwner
        ? query.eq("salon_id", salonId ?? "")
        : query.eq("renter_id", membership!.userId);
      const { data: rows } = await query;

      if (!isOwner) return (rows ?? []) as Charge[];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email");
      const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? p.email ?? "Renter"]));
      return (rows ?? []).map((row) => ({
        ...row,
        renterName: nameOf.get(row.renter_id) ?? "Renter",
      })) as Charge[];
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["rent-payments", salonId, membership?.userId, isOwner],
    enabled: !!membership,
    queryFn: async (): Promise<PaymentRow[]> => {
      let query = supabase
        .from("payments")
        .select("id, charge_id, amount, method, reference, paid_at, receipt_number, receipt_issued_at")
        .order("paid_at", { ascending: false });
      query = isOwner
        ? query.eq("salon_id", salonId ?? "")
        : query.eq("renter_id", membership!.userId);
      const { data } = await query;
      return (data ?? []) as PaymentRow[];
    },
  });

  const paidByCharge = new Map<string, number>();
  for (const payment of payments ?? []) {
    if (!payment.charge_id) continue;
    paidByCharge.set(
      payment.charge_id,
      round2((paidByCharge.get(payment.charge_id) ?? 0) + Number(payment.amount)),
    );
  }

  const remainingOn = (charge: Charge) =>
    Math.max(0, round2(Number(charge.amount) - (paidByCharge.get(charge.id) ?? 0)));

  useEffect(() => {
    if (!paying) return;
    setAmountInput(String(remainingOn(paying).toFixed(2)));
    setMethod(bankEnabled ? "bank_transfer" : "cash");
    setReference("");
    setIssueReceipt(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paying]);

  const recordPayment = useMutation({
    mutationFn: async (charge: Charge) => {
      const amount = round2(Number(amountInput));
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Enter an amount greater than zero");
      }

      const { data: inserted, error: paymentError } = await supabase
        .from("payments")
        .insert({
          charge_id: charge.id,
          salon_id: salonId ?? "",
          renter_id: charge.renter_id,
          amount,
          currency,
          method,
          reference: reference.trim() || null,
          receipt_issued_at: issueReceipt ? new Date().toISOString() : null,
        })
        .select("receipt_number")
        .single();
      if (paymentError) throw paymentError;

      const alreadyPaid = paidByCharge.get(charge.id) ?? 0;
      const totalPaid = round2(alreadyPaid + amount);
      const settled = totalPaid >= round2(Number(charge.amount)) - 0.005;

      if (settled) {
        const { error } = await supabase
          .from("rent_charges")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", charge.id);
        if (error) throw error;
      }

      if (issueReceipt) {
        const outstanding = Math.max(0, round2(Number(charge.amount) - totalPaid));
        await supabase.from("notifications").insert({
          user_id: charge.renter_id,
          salon_id: salonId ?? "",
          charge_id: charge.id,
          type: "payment_receipt",
          title: `Receipt ${inserted?.receipt_number ?? ""}`.trim(),
          body: `${formatMoney(amount, currency)} received${
            method === "bank_transfer" ? " by bank transfer" : ""
          } for rent covering ${formatDate(charge.period_start)} to ${formatDate(
            charge.period_end,
          )}.${
            outstanding > 0
              ? ` Still outstanding: ${formatMoney(outstanding, currency)}.`
              : " This period is now fully paid. Thank you!"
          }`,
        });
      }

      return { settled };
    },
    onSuccess: async (result) => {
      setPaying(null);
      setReference("");
      await queryClient.invalidateQueries();
      toast.success(
        result.settled ? "Payment recorded and rent settled" : "Part payment recorded",
      );
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Couldn't record that payment"),
  });

  const visible = (charges ?? []).filter((charge) => {
    if (filter === "all") return true;
    if (filter === "paid") return charge.status === "paid";
    return charge.status === "pending" || charge.status === "overdue";
  });

  const outstanding = (charges ?? [])
    .filter((c) => c.status === "pending" || c.status === "overdue")
    .reduce((sum, c) => sum + remainingOn(c), 0);

  const bankDetails = (
    <div className="space-y-1 text-sm">
      <p>
        <span className="text-muted-foreground">Account name: </span>
        {salon?.bank_account_name ?? "Not set"}
      </p>
      <p>
        <span className="text-muted-foreground">Sort code: </span>
        {salon?.bank_sort_code ?? "Not set"}
      </p>
      <p>
        <span className="text-muted-foreground">Account number: </span>
        {salon?.bank_account_number ?? "Not set"}
      </p>
      {salon?.bank_payment_reference && (
        <p>
          <span className="text-muted-foreground">Reference: </span>
          {salon.bank_payment_reference}
        </p>
      )}
    </div>
  );

  return (
    <AppShell
      title={isOwner ? "Rent and payments" : "My rent"}
      description={
        isOwner ? "Every rent charge across your salon" : "Your rent history and what's due"
      }
    >
      {loadingMembership || isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-3xl font-semibold">{formatMoney(outstanding, currency)}</p>
              </div>
              <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <TabsList>
                  <TabsTrigger value="open">Open</TabsTrigger>
                  <TabsTrigger value="paid">Paid</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {!isOwner && bankEnabled && (
            <Card>
              <CardHeader>
                <CardTitle>Pay by bank transfer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {bankDetails}
                <p className="text-sm text-muted-foreground">
                  Once your transfer lands, your salon marks it off and sends you a receipt.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Rent charges</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {visible.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nothing to show here yet.
                </p>
              ) : (
                visible.map((charge) => {
                  const days = daysUntil(charge.due_date);
                  const paid = paidByCharge.get(charge.id) ?? 0;
                  const remaining = remainingOn(charge);
                  return (
                    <div
                      key={charge.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {isOwner ? charge.renterName : "Rent"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(charge.period_start)} to {formatDate(charge.period_end)} · due{" "}
                          {formatDate(charge.due_date)}
                          {charge.status !== "paid" && days < 0 ? ` (${Math.abs(days)}d late)` : ""}
                        </p>
                        {paid > 0 && charge.status !== "paid" && (
                          <p className="text-sm text-muted-foreground">
                            {formatMoney(paid, currency)} received ·{" "}
                            {formatMoney(remaining, currency)} still to pay
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={statusVariant(charge.status)}>{charge.status}</Badge>
                        <span className="font-semibold">
                          {formatMoney(Number(charge.amount), currency)}
                        </span>
                        {charge.status !== "paid" && charge.status !== "void" && isOwner && (
                          <Button size="sm" variant="outline" onClick={() => setPaying(charge)}>
                            Record payment
                          </Button>
                        )}
                        {charge.status !== "paid" &&
                          charge.status !== "void" &&
                          !isOwner &&
                          bankPayEnabled && (
                            <Button
                              size="sm"
                              onClick={() => payFromBank.mutate(charge)}
                              disabled={payFromBank.isPending}
                            >
                              Pay from bank
                            </Button>
                          )}
                        {charge.status !== "paid" &&
                          charge.status !== "void" &&
                          !isOwner &&
                          bankEnabled && (
                            <Button
                              size="sm"
                              variant={bankPayEnabled ? "outline" : "default"}
                              onClick={() => setHowToPay(charge)}
                            >
                              How to pay
                            </Button>
                          )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Receipts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(payments ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No payments recorded yet.
                </p>
              ) : (
                (payments ?? []).slice(0, 20).map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{payment.receipt_number ?? "Payment"}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(payment.paid_at)} · {payment.method.replace("_", " ")}
                        {payment.reference ? ` · ${payment.reference}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {payment.receipt_issued_at ? (
                        <Badge variant="secondary">Receipt issued</Badge>
                      ) : (
                        <Badge variant="outline">No receipt</Badge>
                      )}
                      <span className="font-semibold">
                        {formatMoney(Number(payment.amount), currency)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={!!paying} onOpenChange={(next) => !next && setPaying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {paying && formatMoney(remainingOn(paying), currency)} outstanding for the period
              starting {paying && formatDate(paying.period_start)}.
            </p>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount received</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter a smaller amount to log a part payment. The balance stays outstanding.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Payment method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference (optional)</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                maxLength={120}
                placeholder="e.g. Ref 4821"
              />
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border p-3">
              <Checkbox
                id="issue-receipt"
                checked={issueReceipt}
                onCheckedChange={(next) => setIssueReceipt(next === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="issue-receipt" className="cursor-pointer">
                  Issue a receipt to the renter
                </Label>
                <p className="text-xs text-muted-foreground">
                  Sends them a numbered receipt with the amount and what is left to pay.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => paying && recordPayment.mutate(paying)}
              disabled={recordPayment.isPending}
            >
              Save payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!howToPay} onOpenChange={(next) => !next && setHowToPay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay by bank transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Transfer {howToPay && formatMoney(remainingOn(howToPay), currency)} to{" "}
              {salon?.name ?? "your salon"}.
            </p>
            {bankDetails}
            <p className="text-sm text-muted-foreground">
              Your salon marks the payment off and sends a receipt once it arrives.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
