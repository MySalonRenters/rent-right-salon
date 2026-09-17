import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const idSchema = z.object({ agreementId: z.string().uuid() });

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatStamp(value: string | null) {
  if (!value) return "";
  return new Date(value).toUTCString();
}

/**
 * Builds and stores an immutable signed copy of the agreement once both the
 * salon owner and the renter have signed. Safe to call after every signature.
 */
export const finalizeAgreement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    // The caller must be a party to this agreement (RLS scoped client).
    const { data: visible } = await context.supabase
      .from("agreements")
      .select("id")
      .eq("id", data.agreementId)
      .maybeSingle();
    if (!visible) throw new Error("Agreement not found");

    const { data: agreement } = await supabaseAdmin
      .from("agreements")
      .select(
        "id, salon_id, renter_id, title, body, owner_signed_at, renter_signed_at, signed_file_path",
      )
      .eq("id", data.agreementId)
      .maybeSingle();
    if (!agreement) throw new Error("Agreement not found");

    const { data: salon } = await supabaseAdmin
      .from("salons")
      .select("name, owner_id")
      .eq("id", agreement.salon_id)
      .maybeSingle();
    if (!salon) throw new Error("Salon not found");
    if (userId !== agreement.renter_id && userId !== salon.owner_id) {
      throw new Error("Not allowed");
    }

    if (!agreement.owner_signed_at || !agreement.renter_signed_at) {
      // First signature captured: tell the other party it is their turn.
      const signerIsOwner = !!agreement.owner_signed_at;
      const recipientId = signerIsOwner ? agreement.renter_id : salon.owner_id;
      const notificationType = `agreement_awaiting_signature:${agreement.id}`;

      const { data: alreadySent } = await supabaseAdmin
        .from("notifications")
        .select("id")
        .eq("user_id", recipientId)
        .eq("type", notificationType)
        .maybeSingle();

      if (!alreadySent) {
        const signerLabel = signerIsOwner ? salon.name : "Your chair renter";
        await supabaseAdmin.from("notifications").insert({
          user_id: recipientId,
          salon_id: agreement.salon_id,
          type: notificationType,
          title: "An agreement is waiting for your signature",
          body: `${signerLabel} has signed "${agreement.title}". Open your agreements to read and sign it.`,
        });
      }

      return { ready: false as const, path: null };
    }

    if (agreement.signed_file_path) {
      return { ready: true as const, path: agreement.signed_file_path };
    }

    const { data: signatures } = await supabaseAdmin
      .from("agreement_signatures")
      .select("signer_id, signer_role, typed_name, signed_at, signature_path, agreement_snapshot")
      .eq("agreement_id", agreement.id)
      .order("signed_at", { ascending: true });

    const rows = signatures ?? [];
    const snapshot = rows[0]?.agreement_snapshot ?? agreement.body ?? agreement.title;

    const blocks = await Promise.all(
      rows.map(async (row) => {
        let image = "";
        if (row.signature_path) {
          const { data: file } = await supabaseAdmin.storage
            .from("agreements")
            .download(row.signature_path);
          if (file) {
            const buffer = Buffer.from(await file.arrayBuffer());
            image = `<img alt="Signature of ${escapeHtml(row.typed_name)}" src="data:image/png;base64,${buffer.toString("base64")}" />`;
          }
        }
        const role = row.signer_role === "owner" ? "Salon owner" : "Chair renter";
        return `<div class="sig"><p class="role">${role}</p>${image}<p class="name">${escapeHtml(row.typed_name)}</p><p class="stamp">Electronically signed ${escapeHtml(formatStamp(row.signed_at))}</p></div>`;
      }),
    );

    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>${escapeHtml(agreement.title)}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:760px;margin:40px auto;padding:0 24px;line-height:1.5}
h1{font-size:20px;letter-spacing:.04em;text-transform:uppercase}
pre{white-space:pre-wrap;font-family:inherit;font-size:14px;background:#fafafa;border:1px solid #e5e5e5;padding:20px;border-radius:8px}
.sigs{display:flex;gap:32px;flex-wrap:wrap;margin-top:32px}
.sig{flex:1 1 260px;border-top:1px solid #111;padding-top:12px}
.sig img{max-height:90px}
.role{font-weight:bold;margin:0 0 8px}
.name{margin:8px 0 2px;font-size:15px}
.stamp{margin:0;font-size:12px;color:#555}
footer{margin-top:40px;font-size:12px;color:#666}
</style></head>
<body>
<h1>${escapeHtml(agreement.title)}</h1>
<p><strong>${escapeHtml(salon.name)}</strong></p>
<pre>${escapeHtml(snapshot)}</pre>
<div class="sigs">${blocks.join("")}</div>
<footer>Signed copy generated by My Salon Renters on ${escapeHtml(new Date().toUTCString())}. Agreement reference ${escapeHtml(agreement.id)}.</footer>
</body></html>`;

    const path = `${agreement.salon_id}/signed/${agreement.id}.html`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("agreements")
      .upload(path, new Blob([html], { type: "text/html" }), {
        contentType: "text/html",
        upsert: true,
      });
    if (uploadError) throw new Error(uploadError.message);

    const { error: updateError } = await supabaseAdmin
      .from("agreements")
      .update({ signed_file_path: path })
      .eq("id", agreement.id);
    if (updateError) throw new Error(updateError.message);

    return { ready: true as const, path };
  });

/** Returns a short lived link to the stored signed copy for either party. */
export const getSignedAgreementUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: agreement } = await context.supabase
      .from("agreements")
      .select("id, signed_file_path")
      .eq("id", data.agreementId)
      .maybeSingle();
    if (!agreement?.signed_file_path) throw new Error("No signed copy stored yet");

    const { data: signed, error } = await supabaseAdmin.storage
      .from("agreements")
      .createSignedUrl(agreement.signed_file_path, 120);
    if (error || !signed) throw new Error("Couldn't open that document");

    return { url: signed.signedUrl };
  });
