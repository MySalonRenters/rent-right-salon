import { addDays, addMonths, format } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { chargeTotal, type FeePaidBy } from "@/lib/fees";

export type Cycle = "weekly" | "monthly";

export function periodsSince(startDate: string, cycle: Cycle, until = new Date()) {
  const periods: { start: Date; end: Date }[] = [];
  let cursor = new Date(`${startDate}T00:00:00`);
  const limit = new Date(until);
  limit.setHours(23, 59, 59, 999);

  for (let i = 0; i < 260; i += 1) {
    if (cursor > limit) break;
    const next = cycle === "weekly" ? addDays(cursor, 7) : addMonths(cursor, 1);
    periods.push({ start: cursor, end: addDays(next, -1) });
    cursor = next;
  }
  return periods;
}

const iso = (date: Date) => format(date, "yyyy-MM-dd");

/**
 * Creates any rent charges that are due but not yet raised for a salon.
 * Safe to call repeatedly — existing periods are skipped.
 */
export async function generateChargesForSalon(salonId: string, currency: string) {
  const { data: members } = await supabase
    .from("salon_members")
    .select(
      "user_id, chair_id, start_date, chair:chairs!salon_members_chair_fk(rent_amount, cycle, fee_paid_by)",
    )
    .eq("salon_id", salonId)
    .eq("active", true);

  if (!members?.length) return 0;

  const { data: existing } = await supabase
    .from("rent_charges")
    .select("renter_id, period_start")
    .eq("salon_id", salonId);

  const seen = new Set((existing ?? []).map((row) => `${row.renter_id}|${row.period_start}`));
  const rows: TablesInsert<"rent_charges">[] = [];

  for (const member of members) {
    const chair = member.chair as
      | { rent_amount: number; cycle: Cycle; fee_paid_by: FeePaidBy | null }
      | null;
    if (!member.chair_id || !chair || Number(chair.rent_amount) <= 0) continue;
    const amount = chargeTotal(Number(chair.rent_amount), chair.fee_paid_by ?? "salon");


    for (const period of periodsSince(member.start_date, chair.cycle)) {
      const key = `${member.user_id}|${iso(period.start)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        salon_id: salonId,
        chair_id: member.chair_id,
        renter_id: member.user_id,
        amount,
        currency,
        period_start: iso(period.start),
        period_end: iso(period.end),
        due_date: iso(period.start),
        status: "pending",
      });
    }
  }

  if (!rows.length) return 0;
  const { error } = await supabase.from("rent_charges").insert(rows);
  if (error) throw error;
  return rows.length;
}

export async function flagOverdueCharges(salonId: string) {
  await supabase
    .from("rent_charges")
    .update({ status: "overdue" })
    .eq("salon_id", salonId)
    .eq("status", "pending")
    .lt("due_date", iso(new Date()));
}
