import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

const JOB_NAME = "rent-reminders";
const LEASE_MINUTES = 10;
const BATCH_SIZE = 200;
const DUE_SOON_DAYS = 3;

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export const Route = createFileRoute("/api/public/hooks/rent-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accepted = [
          process.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
          process.env["SUPABASE_ANON_KEY"],
        ].filter((k): k is string => !!k);
        const provided =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace("Bearer ", "") ??
          "";
        if (!accepted.length || !accepted.includes(provided)) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const supabase = createClient<Database>(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        const now = new Date();

        // Paused-state guard + single-flight lock (one active run at a time).
        const { data: lock } = await supabase
          .from("job_locks")
          .select("job_name, locked_until, paused_reason")
          .eq("job_name", JOB_NAME)
          .maybeSingle();

        if (lock?.paused_reason) {
          return Response.json({ skipped: "paused", reason: lock.paused_reason });
        }
        if (lock && new Date(lock.locked_until) > now) {
          return Response.json({ skipped: "locked" });
        }

        const lockedUntil = new Date(now.getTime() + LEASE_MINUTES * 60_000).toISOString();
        const { error: lockError } = await supabase
          .from("job_locks")
          .upsert(
            { job_name: JOB_NAME, locked_until: lockedUntil, last_run_at: now.toISOString() },
            { onConflict: "job_name" },
          );
        if (lockError) {
          return Response.json({ error: lockError.message }, { status: 500 });
        }

        try {
          const today = isoDate(now);
          const soon = isoDate(new Date(now.getTime() + DUE_SOON_DAYS * 86_400_000));

          // Flag anything past its due date as overdue first.
          await supabase
            .from("rent_charges")
            .update({ status: "overdue" })
            .eq("status", "pending")
            .lt("due_date", today);

          const { data: charges, error } = await supabase
            .from("rent_charges")
            .select("id, salon_id, renter_id, amount, currency, due_date, status")
            .in("status", ["pending", "overdue"])
            .lte("due_date", soon)
            .order("due_date", { ascending: true })
            .limit(BATCH_SIZE);
          if (error) throw error;

          const rows = (charges ?? []).map((charge) => {
            const overdue = charge.due_date < today;
            const amount = new Intl.NumberFormat("en-GB", {
              style: "currency",
              currency: charge.currency || "GBP",
            }).format(Number(charge.amount));
            return {
              user_id: charge.renter_id,
              salon_id: charge.salon_id,
              charge_id: charge.id,
              type: overdue ? "rent_overdue" : "rent_due",
              title: overdue ? "Rent overdue" : "Rent due soon",
              body: overdue
                ? `${amount} was due on ${charge.due_date} and is still outstanding.`
                : `${amount} is due on ${charge.due_date}.`,
            };
          });

          let created = 0;
          if (rows.length) {
            const { data: inserted, error: insertError } = await supabase
              .from("notifications")
              .upsert(rows, { onConflict: "user_id,type,charge_id", ignoreDuplicates: true })
              .select("id");
            if (insertError) throw insertError;
            created = inserted?.length ?? 0;
          }

          return Response.json({ ok: true, scanned: rows.length, created });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Reminder run failed";
          console.error("rent-reminders failed:", message);
          return Response.json({ ok: false, error: message }, { status: 500 });
        } finally {
          await supabase
            .from("job_locks")
            .update({ locked_until: new Date().toISOString() })
            .eq("job_name", JOB_NAME);
        }
      },
    },
  },
});
