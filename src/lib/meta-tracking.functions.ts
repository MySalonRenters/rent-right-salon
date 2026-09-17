import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const registrationInput = z.object({
  trackingAllowed: z.boolean(),
  country: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2}$/),
  eventSourceUrl: z.string().url().max(2048),
  fbp: z.string().trim().max(255).nullable(),
  fbc: z.string().trim().max(255).nullable(),
});

const CONSENT_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR",
  "HU", "IE", "IS", "IT", "LI", "LT", "LU", "LV", "MT", "NL", "NO", "PL", "PT",
  "RO", "SE", "SI", "SK", "GB",
]);

function normalize(value: string) {
  return value.trim().toLowerCase();
}

async function hash(value: string | null | undefined) {
  if (!value) return null;
  const bytes = new TextEncoder().encode(normalize(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function splitName(fullName: string | null) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: null, lastName: null };
  return {
    firstName: parts[0] ?? null,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

function clientIp(request: Request) {
  const connectingIp = request.headers.get("cf-connecting-ip");
  if (connectingIp) return connectingIp;
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export const getMetaPixelConfig = createServerFn({ method: "GET" }).handler(async () => ({
  pixelId: process.env['META_PIXEL_ID'] ?? null,
}));

export const sendMetaRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => registrationInput.parse(input))
  .handler(async ({ data, context }) => {
    const pixelId = process.env['META_PIXEL_ID'];
    const accessToken = process.env['META_CONVERSIONS_API_ACCESS_TOKEN'];
    if (!pixelId || !accessToken) return { tracked: false as const, reason: "not_configured" as const };

    const request = getRequest();
    const serverCountry = request.headers.get("cf-ipcountry")?.toUpperCase() ?? null;
    const blocked =
      !data.trackingAllowed ||
      CONSENT_COUNTRIES.has(data.country) ||
      data.country === "XX" ||
      data.country === "T1" ||
      (serverCountry !== null &&
        (CONSENT_COUNTRIES.has(serverCountry) || serverCountry === "XX" || serverCountry === "T1"));

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (blocked) {
      await supabaseAdmin
        .from("meta_registration_events")
        .update({ status: "blocked", blocked_reason: "consent_region" })
        .eq("user_id", context.userId)
        .eq("status", "eligible");
      return { tracked: false as const, reason: "consent_region" as const };
    }

    const { data: claimedRows, error: claimError } = await supabaseAdmin.rpc(
      "claim_meta_registration_event",
      { _user_id: context.userId },
    );
    if (claimError) throw new Error("Registration tracking could not be prepared");
    const claimed = claimedRows?.[0];
    if (!claimed) return { tracked: false as const, reason: "already_handled" as const };

    try {
      const [{ data: profile }, { data: authData, error: authError }] = await Promise.all([
        supabaseAdmin.from("profiles").select("full_name, email").eq("id", context.userId).maybeSingle(),
        supabaseAdmin.auth.admin.getUserById(context.userId),
      ]);
      if (authError || !authData.user) throw new Error("Registration account was not found");

      const email = authData.user.email ?? profile?.email ?? null;
      const fullName = profile?.full_name ??
        (typeof authData.user.user_metadata['full_name'] === "string"
          ? authData.user.user_metadata['full_name']
          : null);
      const { firstName, lastName } = splitName(fullName);
      const userData: Record<string, string | string[]> = {};
      const [emailHash, firstNameHash, lastNameHash] = await Promise.all([
        hash(email),
        hash(firstName),
        hash(lastName),
      ]);
      if (emailHash) userData['em'] = [emailHash];
      if (firstNameHash) userData['fn'] = [firstNameHash];
      if (lastNameHash) userData['ln'] = [lastNameHash];
      if (data.fbp) userData['fbp'] = data.fbp;
      if (data.fbc) userData['fbc'] = data.fbc;
      const ip = clientIp(request);
      const userAgent = request.headers.get("user-agent");
      if (ip) userData['client_ip_address'] = ip;
      if (userAgent) userData['client_user_agent'] = userAgent;

      const payload: Record<string, unknown> = {
        data: [{
          event_name: "CompleteRegistration",
          event_time: Math.floor(new Date(claimed.occurred_at).getTime() / 1000),
          event_id: claimed.event_id,
          action_source: "website",
          event_source_url: data.eventSourceUrl,
          user_data: userData,
        }],
      };
      const testEventCode = process.env['META_TEST_EVENT_CODE'];
      if (testEventCode) payload['test_event_code'] = testEventCode;

      const response = await fetch(`https://graph.facebook.com/v24.0/${encodeURIComponent(pixelId)}/events`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        console.error("Meta CAPI registration request failed", response.status, await response.text());
        throw new Error("Meta did not accept the registration event");
      }

      await supabaseAdmin
        .from("meta_registration_events")
        .update({ status: "sent", sent_at: new Date().toISOString(), blocked_reason: null })
        .eq("user_id", context.userId)
        .eq("event_id", claimed.event_id);

      return { tracked: true as const, eventId: claimed.event_id, pixelId };
    } catch (error) {
      await supabaseAdmin
        .from("meta_registration_events")
        .update({ status: "eligible", blocked_reason: "capi_delivery_failed" })
        .eq("user_id", context.userId)
        .eq("event_id", claimed.event_id)
        .eq("status", "processing");
      throw error;
    }
  });