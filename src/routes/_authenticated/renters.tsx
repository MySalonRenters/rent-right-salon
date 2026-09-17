import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Mail, RefreshCw, Trash2, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/app-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/hooks/use-session";
import { formatDate, formatMoney, initialsOf } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/renters")({
  component: RentersPage,
});

function RentersPage() {
  const { data: membership } = useMembership();
  const queryClient = useQueryClient();
  const salonId = membership?.salonId ?? null;
  const currency = membership?.currency ?? "GBP";

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [chairId, setChairId] = useState<string>("none");

  const { data, isLoading } = useQuery({
    queryKey: ["renters", salonId],
    enabled: !!salonId,
    queryFn: async () => {
      const [{ data: members }, { data: chairs }, { data: profiles }, { data: invites }] =
        await Promise.all([
          supabase
            .from("salon_members")
            .select("id, user_id, chair_id, start_date, active")
            .eq("salon_id", salonId!),
          supabase.from("chairs").select("id, name, rent_amount, cycle").eq("salon_id", salonId!),
          supabase.from("profiles").select("id, full_name, email, phone"),
          supabase
            .from("invites")
            .select("id, email, token, status, chair_id, created_at")
            .eq("salon_id", salonId!)
            .order("created_at", { ascending: false }),
        ]);

      const profileOf = new Map((profiles ?? []).map((p) => [p.id, p]));
      const chairOf = new Map((chairs ?? []).map((c) => [c.id, c]));

      return {
        chairs: chairs ?? [],
        members: (members ?? []).map((m) => ({
          ...m,
          profile: profileOf.get(m.user_id) ?? null,
          chair: m.chair_id ? (chairOf.get(m.chair_id) ?? null) : null,
        })),
        invites: (invites ?? []).filter((i) => i.status === "pending"),
      };
    },
  });

  const createInvite = useMutation({
    mutationFn: async () => {
      const parsedEmail = z.string().trim().email().max(255).parse(email);
      const { data: row, error } = await supabase
        .from("invites")
        .insert({
          salon_id: salonId!,
          email: parsedEmail,
          chair_id: chairId !== "none" ? chairId : null,
        })
        .select("token")
        .single();
      if (error) throw error;
      return row.token as string;
    },
    onSuccess: async (token) => {
      setOpen(false);
      setEmail("");
      await queryClient.invalidateQueries({ queryKey: ["renters"] });
      await navigator.clipboard
        .writeText(`${window.location.origin}/invite/${token}`)
        .catch(() => undefined);
      toast.success("Invite created. Link copied to your clipboard");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Couldn't create that invite"),
  });

  const resendInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const bytes = new Uint8Array(24);
      crypto.getRandomValues(bytes);
      const token = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const { error } = await supabase
        .from("invites")
        .update({
          token,
          status: "pending",
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", inviteId);
      if (error) throw error;
      return token;
    },
    onSuccess: async (token) => {
      await queryClient.invalidateQueries({ queryKey: ["renters"] });
      await navigator.clipboard
        .writeText(`${window.location.origin}/invite/${token}`)
        .catch(() => undefined);
      toast.success("Fresh invite link created and copied. Send it over");
    },
    onError: () => toast.error("Couldn't refresh that invite"),
  });

  const removeInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase.from("invites").delete().eq("id", inviteId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["renters"] });
      toast.success("Invite removed");
    },
    onError: () => toast.error("Couldn't remove that invite"),
  });

  const assignChair = useMutation({
    mutationFn: async ({ memberId, chair }: { memberId: string; chair: string }) => {
      const { error } = await supabase
        .from("salon_members")
        .update({ chair_id: chair === "none" ? null : chair })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success("Chair updated");
    },
    onError: () => toast.error("Couldn't update that chair"),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("salon_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success("Renter removed", {
        description: "Their rent history and signed agreements are kept.",
      });
    },
    onError: (error) =>
      toast.error("Couldn't remove that renter", {
        description: error instanceof Error ? error.message : "Please try again.",
      }),
  });


  if (membership && !membership.isOwner) {
    return (
      <AppShell title="Renters">
        <p className="text-sm text-muted-foreground">Only salon owners can manage renters.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Renters"
      description="Invite chair renters and keep their details in one place"
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="size-4" /> Invite renter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a chair renter</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Their email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  placeholder="renter@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-chair">Chair (optional)</Label>
                <Select value={chairId} onValueChange={setChairId}>
                  <SelectTrigger id="invite-chair">
                    <SelectValue placeholder="Choose a chair" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Decide later</SelectItem>
                    {data?.chairs.map((chair) => (
                      <SelectItem key={chair.id} value={chair.id}>
                        {chair.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                We'll generate a private link you can send them. It's copied to your clipboard when
                you create it.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => createInvite.mutate()} disabled={createInvite.isPending}>
                Create invite link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading || !data ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : (
        <div className="space-y-7">
          <Card>
            <CardHeader>
              <CardTitle>Chair renters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.members.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No renters yet. Send your first invite to get started.
                </p>
              ) : (
                data.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-wrap items-center gap-4 rounded-xl border border-border px-4 py-3"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                      {initialsOf(member.profile?.full_name ?? member.profile?.email)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {member.profile?.full_name ?? member.profile?.email ?? "Renter"}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        Since {formatDate(member.start_date)}
                        {member.chair
                          ? ` · ${formatMoney(Number(member.chair.rent_amount), currency)} ${member.chair.cycle}`
                          : ""}
                      </p>
                    </div>
                    <Select
                      value={member.chair_id ?? "none"}
                      onValueChange={(chair) =>
                        assignChair.mutate({ memberId: member.id, chair })
                      }
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="No chair" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No chair</SelectItem>
                        {data.chairs.map((chair) => (
                          <SelectItem key={chair.id} value={chair.id}>
                            {chair.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove renter"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={removeMember.isPending}
                        >
                          <UserMinus className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Remove{" "}
                            {member.profile?.full_name ?? member.profile?.email ?? "this renter"}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            They'll lose access to your salon and their chair is freed up. Past
                            rent charges, payments and signed agreements are kept. You can invite
                            them again at any time.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep renter</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeMember.mutate(member.id)}>
                            Remove renter
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))

              )}
            </CardContent>
          </Card>

          {data.invites.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pending invites</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="size-4 text-muted-foreground" />
                      <span className="text-sm">{invite.email}</span>
                      <Badge variant="outline">pending</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void navigator.clipboard.writeText(
                            `${window.location.origin}/invite/${invite.token}`,
                          );
                          toast.success("Invite link copied");
                        }}
                      >
                        <Copy className="size-4" /> Copy link
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={resendInvite.isPending}
                        onClick={() => resendInvite.mutate(invite.id)}
                      >
                        <RefreshCw className="size-4" /> Re-send
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="size-4" /> Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove this invite?</AlertDialogTitle>
                            <AlertDialogDescription>
                              The link sent to {invite.email} will stop working straight away.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep it</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeInvite.mutate(invite.id)}>
                              Remove invite
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AppShell>
  );
}
