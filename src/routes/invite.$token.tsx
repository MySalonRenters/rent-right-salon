import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-session";
import { acceptInvite, getInvitePreview } from "@/lib/invites.functions";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({
    meta: [
      { title: "Your chair invite My Salon Renters" },
      {
        name: "description",
        content: "Accept your salon chair invite to see your rent, payments and rental agreement.",
      },
      { property: "og:title", content: "Your chair invite My Salon Renters" },
      {
        property: "og:description",
        content: "Accept your salon chair invite to see your rent, payments and agreements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const { data: invite, isLoading } = useQuery({
    queryKey: ["invite", token],
    queryFn: () => getInvitePreview({ data: { token } }),
  });

  async function handleAccept() {
    setBusy(true);
    try {
      await acceptInvite({ data: { token } });
      toast.success("You're in. Welcome to the salon");
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't accept this invite");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-leaf flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="font-display text-xl font-semibold">
          My Salon Renters
        </Link>
        <div className="mt-6 rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-calm)]">
          {isLoading || loading ? (
            <Skeleton className="h-32 w-full rounded-xl" />
          ) : !invite || !invite.valid ? (
            <>
              <h1 className="text-2xl font-semibold">This invite isn't available</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                It may have expired or already been used. Ask your salon owner to send a new link.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold">
                {invite.salonName} invited you
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Accept to see your chair, rent schedule, payment history and rental agreement in one
                place.
              </p>
              {invite.chairName && (
                <p className="mt-4 rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground">
                  Chair reserved for you: <strong>{invite.chairName}</strong>
                </p>
              )}

              <div className="mt-6">
                {session ? (
                  <Button className="w-full" onClick={handleAccept} disabled={busy}>
                    Accept invite
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Button asChild className="w-full">
                      <Link
                        to="/auth"
                        search={{ mode: "signup", redirect: `/invite/${token}` }}
                      >
                        Create your account
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/auth" search={{ mode: "signin", redirect: `/invite/${token}` }}>
                        I already have an account
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
