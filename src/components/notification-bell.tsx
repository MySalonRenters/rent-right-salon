import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/hooks/use-session";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { data: membership } = useMembership();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: items } = useQuery({
    queryKey: ["notifications", membership?.userId],
    enabled: !!membership?.userId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, body, read_at, created_at")
        .eq("user_id", membership!.userId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const unread = (items ?? []).filter((n) => !n.read_at);

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!unread.length) return;
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in(
          "id",
          unread.map((n) => n.id),
        );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications", membership?.userId] }),
  });

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && unread.length) markAllRead.mutate();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-4" />
          {unread.length > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-destructive" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
        </div>
        <ScrollArea className="max-h-80">
          {(items ?? []).length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              You're all caught up. Rent reminders and payment confirmations show up here.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {(items ?? []).map((n) => (
                <li key={n.id} className={cn("px-4 py-3", !n.read_at && "bg-accent/40")}>
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(n.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
