import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const tokenSchema = z.object({ token: z.string().trim().min(10).max(200) });

export type InvitePreview = {
  valid: boolean;
  reason?: string;
  salonName?: string;
  email?: string;
  chairName?: string | null;
  fullName?: string | null;
};

export const getInvitePreview = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }): Promise<InvitePreview> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invite } = await supabaseAdmin
      .from("invites")
      .select("email, full_name, status, expires_at, salon_id, chair_id")
      .eq("token", data.token)
      .maybeSingle();

    if (!invite) return { valid: false, reason: "This invite link is not valid." };
    if (invite.status === "revoked")
      return { valid: false, reason: "This invite has been withdrawn by the salon." };
    if (invite.status === "accepted")
      return { valid: false, reason: "This invite has already been used." };
    if (new Date(invite.expires_at) < new Date())
      return { valid: false, reason: "This invite has expired. Ask the salon to send a new one." };

    const [{ data: salon }, chairResult] = await Promise.all([
      supabaseAdmin.from("salons").select("name").eq("id", invite.salon_id).maybeSingle(),
      invite.chair_id
        ? supabaseAdmin.from("chairs").select("name").eq("id", invite.chair_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return {
      valid: true,
      salonName: salon?.name ?? "a salon",
      email: invite.email,
      fullName: invite.full_name,
      chairName: chairResult.data?.name ?? null,
    };
  });

export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: invite } = await supabaseAdmin
      .from("invites")
      .select("id, salon_id, chair_id, status, expires_at, email")
      .eq("token", data.token)
      .maybeSingle();

    if (!invite) throw new Error("This invite link is not valid.");
    if (invite.status !== "pending") throw new Error("This invite is no longer available.");
    if (new Date(invite.expires_at) < new Date()) throw new Error("This invite has expired.");

    // The invite is only valid for the email address it was sent to.
    const { data: userResult } = await supabaseAdmin.auth.admin.getUserById(userId);
    const callerEmail = userResult?.user?.email?.trim().toLowerCase() ?? "";
    if (!callerEmail || callerEmail !== invite.email.trim().toLowerCase()) {
      throw new Error("This invite was sent to a different email address.");
    }


    const { error: memberError } = await supabaseAdmin.from("salon_members").upsert(
      {
        salon_id: invite.salon_id,
        user_id: userId,
        chair_id: invite.chair_id,
        active: true,
      },
      { onConflict: "salon_id,user_id" },
    );
    if (memberError) throw new Error(memberError.message);

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "renter" }, { onConflict: "user_id,role" });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId).eq("role", "owner");

    await supabaseAdmin
      .from("invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    return { salonId: invite.salon_id };
  });
