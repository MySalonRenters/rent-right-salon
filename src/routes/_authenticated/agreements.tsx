import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Download, FileSignature, FileUp, History, Lock, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/app-shell";
import { SignaturePad } from "@/components/signature-pad";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/hooks/use-session";
import { formatDate } from "@/lib/format";
import { finalizeAgreement, getSignedAgreementUrl } from "@/lib/agreements.functions";

export const Route = createFileRoute("/_authenticated/agreements")({
  component: AgreementsPage,
});

const CURRENCIES = [
  { code: "GBP", symbol: "£", label: "GBP (£) British pound" },
  { code: "EUR", symbol: "€", label: "EUR (€) Euro" },
  { code: "USD", symbol: "$", label: "USD ($) US dollar" },
  { code: "CAD", symbol: "$", label: "CAD ($) Canadian dollar" },
  { code: "AUD", symbol: "$", label: "AUD ($) Australian dollar" },
  { code: "NZD", symbol: "$", label: "NZD ($) New Zealand dollar" },
  { code: "ZAR", symbol: "R", label: "ZAR (R) South African rand" },
  { code: "AED", symbol: "AED", label: "AED United Arab Emirates dirham" },
];

const COUNTRIES = [
  "United Kingdom",
  "Ireland",
  "United States",
  "Canada",
  "Australia",
  "New Zealand",
  "South Africa",
  "United Arab Emirates",
];

type AgreementDetails = {
  salonLegalName: string;
  renterLegalName: string;
  location: string;
  country: string;
  currency: string;
  rentAmount: string;
  rentPeriod: string;
  startDate: string;
  noticeWeeks: string;
};

function buildBody(d: AgreementDetails) {
  const currency = CURRENCIES.find((c) => c.code === d.currency);
  const symbol = currency?.symbol ?? "";
  const rent = d.rentAmount.trim()
    ? `${symbol}${d.rentAmount.trim()} ${d.currency} per ${d.rentPeriod}`
    : `the amount set out in the My Salon Renters account, in ${d.currency}`;
  const salon = d.salonLegalName.trim() || "the Salon";
  const renter = d.renterLegalName.trim() || "the Renter";
  const location = d.location.trim() || "the salon premises";
  const start = d.startDate || "the date of signature";

  return `CHAIR RENTAL AGREEMENT

This agreement is made between ${salon} ("the Salon") and ${renter} ("the Renter").

Premises: ${location}
Governing country: ${d.country}
Currency: ${d.currency}${symbol && symbol !== d.currency ? ` (${symbol})` : ""}

1. Chair. The Salon licenses a styling chair at ${location} to the Renter for the Renter's own business.
2. Rent. The Renter pays ${rent}, in advance of each period, through the My Salon Renters account.
3. Term. This agreement runs from ${start} and continues until ended by either party with ${d.noticeWeeks} weeks' written notice.
4. Independence. The Renter is self employed, sets their own prices and hours, and is responsible for their own tax, insurance and products.
5. Standards. The Renter keeps their station clean, holds valid public liability insurance and follows the Salon's health and safety rules.
6. Access. Keys and access codes remain the property of the Salon and are returned when this agreement ends.
7. Governing law. This agreement is governed by the laws of ${d.country} and the courts of ${d.country} have exclusive jurisdiction.

Signed by ${salon} and ${renter}. By signing below, both parties agree to these terms.`;
}

function statusVariant(status: string) {
  if (status === "signed") return "secondary" as const;
  if (status === "sent") return "outline" as const;
  return "outline" as const;
}

function AgreementsPage() {
  const { data: membership, isLoading: loadingMembership } = useMembership();
  const queryClient = useQueryClient();
  const salonId = membership?.salonId ?? null;
  const isOwner = membership?.isOwner ?? false;

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("Chair rental agreement");
  const [details, setDetails] = useState<AgreementDetails>({
    salonLegalName: "",
    renterLegalName: "",
    location: "",
    country: "United Kingdom",
    currency: "GBP",
    rentAmount: "",
    rentPeriod: "week",
    startDate: "",
    noticeWeeks: "4",
  });
  const [bodyEdited, setBodyEdited] = useState(false);
  const [manualBody, setManualBody] = useState("");
  const body = bodyEdited ? manualBody : buildBody(details);
  const setDetail = (key: keyof AgreementDetails, value: string) =>
    setDetails((prev) => ({ ...prev, [key]: value }));
  const [renterId, setRenterId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [signing, setSigning] = useState<{
    id: string;
    title: string;
    body: string | null;
    ownerSignedAt: string | null;
    renterSignedAt: string | null;
  } | null>(null);
  const [editing, setEditing] = useState<{ id: string; title: string; body: string } | null>(null);
  const [historyFor, setHistoryFor] = useState<{ id: string; title: string } | null>(null);

  const [typedName, setTypedName] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const finalizeAgreementFn = useServerFn(finalizeAgreement);
  const signedUrlFn = useServerFn(getSignedAgreementUrl);


  const { data, isLoading } = useQuery({
    queryKey: ["agreements", salonId, membership?.userId, isOwner],
    enabled: !!membership,
    queryFn: async () => {
      let query = supabase
        .from("agreements")
        .select(
          "id, title, body, kind, status, renter_id, file_path, signed_at, created_at, owner_signed_at, renter_signed_at, signed_file_path",
        )
        .order("created_at", { ascending: false });

      query = isOwner
        ? query.eq("salon_id", salonId ?? "")
        : query.eq("renter_id", membership!.userId);
      const [{ data: rows }, { data: profiles }, { data: members }] = await Promise.all([
        query,
        supabase.from("profiles").select("id, full_name, email"),
        isOwner && salonId
          ? supabase.from("salon_members").select("user_id").eq("salon_id", salonId)
          : Promise.resolve({ data: [] as { user_id: string }[] }),
      ]);
      const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? p.email ?? "Renter"]));
      return {
        agreements: (rows ?? []).map((row) => ({
          ...row,
          renterName: nameOf.get(row.renter_id) ?? "Renter",
        })),
        renters: (members ?? []).map((m) => ({
          id: m.user_id,
          name: nameOf.get(m.user_id) ?? "Renter",
        })),
      };
    },
  });

  const createAgreement = useMutation({
    mutationFn: async (kind: "template" | "upload") => {
      const parsed = z
        .object({ title: z.string().trim().min(1).max(140), renterId: z.string().uuid() })
        .parse({ title, renterId });

      let filePath: string | null = null;
      if (kind === "upload") {
        if (!file) throw new Error("Choose a file to upload");
        filePath = `${salonId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage
          .from("agreements")
          .upload(filePath, file);
        if (uploadError) throw uploadError;
      }

      const { error } = await supabase.from("agreements").insert({
        salon_id: salonId!,
        renter_id: parsed.renterId,
        title: parsed.title,
        kind,
        body: kind === "template" ? body : null,
        file_path: filePath,
        status: "sent",
        sent_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setCreateOpen(false);
      setFile(null);
      await queryClient.invalidateQueries({ queryKey: ["agreements"] });
      toast.success("Agreement sent to your renter");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Couldn't create that agreement"),
  });

  const signAgreement = useMutation({
    mutationFn: async () => {
      if (!signing) return;
      const name = z.string().trim().min(2).max(100).parse(typedName);
      if (!signatureData) throw new Error("Draw your signature before you sign");

      const blob = await (await fetch(signatureData)).blob();
      const signaturePath = `${membership!.userId}/${membership!.salonId}/signatures/${crypto.randomUUID()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("agreements")
        .upload(signaturePath, blob, { contentType: "image/png" });
      if (uploadError) throw uploadError;

      const { error: sigError } = await supabase.from("agreement_signatures").insert({
        agreement_id: signing.id,
        signer_id: membership!.userId,
        signer_role: isOwner ? "owner" : "renter",
        typed_name: name,
        agreement_snapshot: signing.body ?? signing.title,
        signature_path: signaturePath,
      });
      if (sigError) throw sigError;

      const result = await finalizeAgreementFn({ data: { agreementId: signing.id } });
      return result;
    },
    onSuccess: async (result) => {
      setSigning(null);
      setTypedName("");
      setSignatureData(null);
      await queryClient.invalidateQueries({ queryKey: ["agreements"] });
      toast.success(
        result?.ready
          ? "Both parties have signed. The signed copy is stored in your account"
          : "Signed. Waiting for the other party to sign",
      );
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Couldn't save that signature"),
  });

  async function openFile(path: string) {
    const { data: signed, error } = await supabase.storage
      .from("agreements")
      .createSignedUrl(path, 60);
    if (error || !signed) {
      toast.error("Couldn't open that document");
      return;
    }
    window.open(signed.signedUrl, "_blank", "noopener");
  }

  async function openSignedCopy(agreementId: string) {
    try {
      const { url } = await signedUrlFn({ data: { agreementId } });
      window.open(url, "_blank", "noopener");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't open the signed copy");
    }
  }

  const versions = useQuery({
    queryKey: ["agreement-versions", historyFor?.id],
    enabled: !!historyFor,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("agreement_versions")
        .select("id, version, title, body, created_at")
        .eq("agreement_id", historyFor!.id)
        .order("version", { ascending: false });
      if (error) throw error;
      return rows ?? [];
    },
  });

  const updateAgreement = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const parsed = z
        .object({ title: z.string().trim().min(1).max(140), body: z.string().trim().min(1) })
        .parse({ title: editing.title, body: editing.body });
      const { error } = await supabase
        .from("agreements")
        .update({ title: parsed.title, body: parsed.body })
        .eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["agreements"] });
      await queryClient.invalidateQueries({ queryKey: ["agreement-versions"] });
      toast.success("Agreement updated. The new version is saved to the history");
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Couldn't update that agreement",
      ),
  });

  return (

    <AppShell
      title={isOwner ? "Agreements" : "My agreements"}
      description={
        isOwner ? "Send, sign and store your chair rental agreements" : "Read and sign your contracts"
      }
      actions={
        isOwner ? (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" /> New agreement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>New agreement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="agreement-title">Title</Label>
                    <Input
                      id="agreement-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={140}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agreement-renter">Renter</Label>
                    <Select value={renterId} onValueChange={setRenterId}>
                      <SelectTrigger id="agreement-renter">
                        <SelectValue placeholder="Choose a renter" />
                      </SelectTrigger>
                      <SelectContent>
                        {data?.renters.map((renter) => (
                          <SelectItem key={renter.id} value={renter.id}>
                            {renter.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="salon-legal-name">Salon legal name</Label>
                    <Input
                      id="salon-legal-name"
                      value={details.salonLegalName}
                      onChange={(e) => setDetail("salonLegalName", e.target.value)}
                      placeholder="e.g. Willow Salons Ltd"
                      maxLength={140}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="renter-legal-name">Renter legal name</Label>
                    <Input
                      id="renter-legal-name"
                      value={details.renterLegalName}
                      onChange={(e) => setDetail("renterLegalName", e.target.value)}
                      placeholder="e.g. Jane A. Smith"
                      maxLength={140}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="agreement-location">Salon location</Label>
                    <Input
                      id="agreement-location"
                      value={details.location}
                      onChange={(e) => setDetail("location", e.target.value)}
                      placeholder="Full address of the premises"
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agreement-country">Country</Label>
                    <Select
                      value={details.country}
                      onValueChange={(v) => setDetail("country", v)}
                    >
                      <SelectTrigger id="agreement-country">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agreement-currency">Currency</Label>
                    <Select
                      value={details.currency}
                      onValueChange={(v) => setDetail("currency", v)}
                    >
                      <SelectTrigger id="agreement-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agreement-rent">Rent amount</Label>
                    <Input
                      id="agreement-rent"
                      inputMode="decimal"
                      value={details.rentAmount}
                      onChange={(e) => setDetail("rentAmount", e.target.value)}
                      placeholder="150"
                      maxLength={12}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agreement-period">Rent period</Label>
                    <Select
                      value={details.rentPeriod}
                      onValueChange={(v) => setDetail("rentPeriod", v)}
                    >
                      <SelectTrigger id="agreement-period">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="fortnight">Fortnight</SelectItem>
                        <SelectItem value="month">Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agreement-start">Start date</Label>
                    <Input
                      id="agreement-start"
                      type="date"
                      value={details.startDate}
                      onChange={(e) => setDetail("startDate", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agreement-notice">Notice period (weeks)</Label>
                    <Input
                      id="agreement-notice"
                      inputMode="numeric"
                      value={details.noticeWeeks}
                      onChange={(e) => setDetail("noticeWeeks", e.target.value)}
                      maxLength={2}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="agreement-body">Agreement text</Label>
                    {bodyEdited && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setBodyEdited(false)}
                      >
                        Reset to template
                      </Button>
                    )}
                  </div>
                  <Textarea
                    id="agreement-body"
                    value={body}
                    onChange={(e) => {
                      setBodyEdited(true);
                      setManualBody(e.target.value);
                    }}
                    rows={14}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    The text updates automatically from the details above until you edit it.
                  </p>
                </div>


                <div className="space-y-2 rounded-xl border border-dashed border-border p-4">
                  <Label htmlFor="agreement-file" className="flex items-center gap-2">
                    <FileUp className="size-4" /> Or upload a signed PDF instead
                  </Label>
                  <Input
                    id="agreement-file"
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  disabled={!file || createAgreement.isPending}
                  onClick={() => createAgreement.mutate("upload")}
                >
                  Upload document
                </Button>
                <Button
                  disabled={createAgreement.isPending}
                  onClick={() => createAgreement.mutate("template")}
                >
                  Send for signature
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : undefined
      }
    >
      {loadingMembership || isLoading || !data ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : data.agreements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <FileSignature className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No agreements yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isOwner
              ? "Send a rental agreement from the template, or upload one you already have."
              : "Your salon owner hasn't sent you an agreement yet."}
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Agreements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.agreements.map((agreement) => {
              const mySignature = isOwner ? agreement.owner_signed_at : agreement.renter_signed_at;
              const fullySigned = !!agreement.owner_signed_at && !!agreement.renter_signed_at;
              const statusLabel = fullySigned
                ? "signed by both"
                : agreement.owner_signed_at
                  ? "awaiting renter"
                  : agreement.renter_signed_at
                    ? "awaiting salon owner"
                    : agreement.status;
              return (
                <div
                  key={agreement.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{agreement.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {isOwner ? `${agreement.renterName} · ` : ""}
                      {fullySigned
                        ? `Signed ${formatDate(agreement.signed_at)}`
                        : `Sent ${formatDate(agreement.created_at)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={fullySigned ? "secondary" : statusVariant(agreement.status)}>
                      {statusLabel}
                    </Badge>
                    {agreement.file_path && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openFile(agreement.file_path!)}
                      >
                        <Download className="size-4" /> Open
                      </Button>
                    )}
                    {agreement.signed_file_path && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openSignedCopy(agreement.id)}
                      >
                        <Download className="size-4" /> Signed copy
                      </Button>
                    )}
                    {agreement.body && (
                      <Button
                        size="sm"
                        variant={mySignature ? "outline" : "default"}
                        onClick={() =>
                          setSigning({
                            id: agreement.id,
                            title: agreement.title,
                            body: agreement.body,
                            ownerSignedAt: agreement.owner_signed_at,
                            renterSignedAt: agreement.renter_signed_at,
                          })
                        }
                      >
                        {mySignature ? "View" : "Read & sign"}
                      </Button>
                    )}
                    {isOwner && agreement.body && !fullySigned && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setEditing({
                            id: agreement.id,
                            title: agreement.title,
                            body: agreement.body ?? "",
                          })
                        }
                      >
                        <Pencil className="size-4" /> Edit
                      </Button>
                    )}
                    {isOwner && agreement.body && fullySigned && (
                      <Badge variant="outline" className="gap-1">
                        <Lock className="size-3" /> Locked
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setHistoryFor({ id: agreement.id, title: agreement.title })}
                    >
                      <History className="size-4" /> History
                    </Button>

                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!signing} onOpenChange={(next) => !next && setSigning(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{signing?.title}</DialogTitle>
          </DialogHeader>
          <pre className="max-h-72 overflow-y-auto rounded-xl bg-muted p-4 text-xs whitespace-pre-wrap">
            {signing?.body}
          </pre>
          <div className="grid gap-2 rounded-xl border border-border p-3 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Salon owner: </span>
              {signing?.ownerSignedAt
                ? `Signed ${formatDate(signing.ownerSignedAt)}`
                : "Not signed yet"}
            </p>
            <p>
              <span className="text-muted-foreground">Chair renter: </span>
              {signing?.renterSignedAt
                ? `Signed ${formatDate(signing.renterSignedAt)}`
                : "Not signed yet"}
            </p>
          </div>
          {!(isOwner ? signing?.ownerSignedAt : signing?.renterSignedAt) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="typed-name">Type your full legal name</Label>
                <Input
                  id="typed-name"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Signature</Label>
                <SignaturePad onChange={setSignatureData} />
              </div>
              <p className="text-xs text-muted-foreground">
                Signing electronically as the {isOwner ? "salon owner" : "chair renter"}. Your name,
                signature image and the exact agreement text are stored as your signed record.
              </p>
            </div>
          )}
          <DialogFooter>
            {(isOwner ? signing?.ownerSignedAt : signing?.renterSignedAt) ? (
              <Button variant="outline" onClick={() => setSigning(null)}>
                Close
              </Button>
            ) : (
              <Button onClick={() => signAgreement.mutate()} disabled={signAgreement.isPending}>
                Sign agreement
              </Button>
            )}
          </DialogFooter>

        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit agreement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editing?.title ?? ""}
                maxLength={140}
                onChange={(e) =>
                  setEditing((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-body">Agreement text</Label>
              <Textarea
                id="edit-body"
                rows={16}
                className="font-mono text-xs"
                value={editing?.body ?? ""}
                onChange={(e) =>
                  setEditing((prev) => (prev ? { ...prev, body: e.target.value } : prev))
                }
              />
              <p className="text-xs text-muted-foreground">
                Every saved change keeps the previous text in the version history. Once both parties
                have signed, the text is locked for good.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => updateAgreement.mutate()} disabled={updateAgreement.isPending}>
              Save version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyFor} onOpenChange={(next) => !next && setHistoryFor(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Version history</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {historyFor?.title}. Previous versions are read only and cannot be changed.
          </p>
          {versions.isLoading ? (
            <Skeleton className="h-32 w-full rounded-xl" />
          ) : (versions.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No versions stored yet.</p>
          ) : (
            <div className="space-y-3">
              {versions.data!.map((version, index) => (
                <div key={version.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      Version {version.version}
                      {index === 0 ? " (current)" : ""}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(version.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{version.title}</p>
                  <pre className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">
                    {version.body ?? "Uploaded document, no text version stored."}
                  </pre>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryFor(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AppShell>
  );
}
