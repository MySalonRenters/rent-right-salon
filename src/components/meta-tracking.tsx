import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";

import { supabase } from "@/integrations/supabase/client";
import { getMetaPixelConfig, sendMetaRegistration } from "@/lib/meta-tracking.functions";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[][]; loaded?: boolean; version?: string };
    _fbq?: Window["fbq"];
  }
}

const CONSENT_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR",
  "HU", "IE", "IS", "IT", "LI", "LT", "LU", "LV", "MT", "NL", "NO", "PL", "PT",
  "RO", "SE", "SI", "SK", "GB",
]);
const ATTRIBUTION_KEY = "mysalonrenters:meta-attribution";

type TrackingDecision = { allowed: boolean; country: string };
type Attribution = { fbc: string | null };

function readCookie(name: string) {
  const prefix = `${name}=`;
  const entry = document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
}

function readAttribution(): Attribution {
  try {
    const stored = window.sessionStorage.getItem(ATTRIBUTION_KEY);
    if (stored) return JSON.parse(stored) as Attribution;
  } catch {
    // Storage may be unavailable in strict privacy modes.
  }
  return { fbc: null };
}

function preserveAttribution() {
  const current = readAttribution();
  const fbclid = new URL(window.location.href).searchParams.get("fbclid");
  const fbc = readCookie("_fbc") ??
    (fbclid ? `fb.1.${Math.floor(Date.now())}.${fbclid}` : current.fbc);
  try {
    window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify({ fbc }));
  } catch {
    // Tracking still works without session storage when cookies are available.
  }
}

async function trackingDecision(): Promise<TrackingDecision> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 2000);
  try {
    const response = await fetch("/cdn-cgi/trace", { signal: controller.signal, cache: "no-store" });
    if (!response.ok) return { allowed: false, country: "XX" };
    const location = (await response.text())
      .split("\n")
      .find((line) => line.startsWith("loc="))
      ?.slice(4)
      .trim()
      .toUpperCase() ?? "XX";
    return {
      allowed: location !== "XX" && location !== "T1" && !CONSENT_COUNTRIES.has(location),
      country: location,
    };
  } catch {
    return { allowed: false, country: "XX" };
  } finally {
    window.clearTimeout(timer);
  }
}

function loadPixel(pixelId: string) {
  if (window.fbq) return;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue?.push(args);
  } as NonNullable<Window["fbq"]>;
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  window.fbq = fbq;
  window._fbq = fbq;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  fbq("init", pixelId);
}

let decisionPromise: Promise<TrackingDecision> | null = null;
function getDecision() {
  decisionPromise ??= trackingDecision();
  return decisionPromise;
}

export function MetaTracking() {
  const href = useRouterState({ select: (state) => state.location.href });
  const getConfig = useServerFn(getMetaPixelConfig);
  const sendRegistration = useServerFn(sendMetaRegistration);
  const initialized = useRef(false);

  useEffect(() => {
    let active = true;
    void Promise.all([getDecision(), getConfig()]).then(([decision, config]) => {
      if (!active || !decision.allowed || !config.pixelId) return;
      preserveAttribution();
      loadPixel(config.pixelId);
      window.fbq?.("track", "PageView");
      initialized.current = true;
    });
    return () => { active = false; };
  }, [getConfig]);

  useEffect(() => {
    if (!initialized.current) return;
    window.fbq?.("track", "PageView");
  }, [href]);

  useEffect(() => {
    let active = true;
    async function reportRegistration() {
      const [{ data }, decision] = await Promise.all([supabase.auth.getSession(), getDecision()]);
      if (!active || !data.session) return;
      if (decision.allowed) preserveAttribution();
      const attribution = readAttribution();
      const result = await sendRegistration({
        data: {
          trackingAllowed: decision.allowed,
          country: decision.country,
          eventSourceUrl: window.location.href,
          fbp: readCookie("_fbp"),
          fbc: readCookie("_fbc") ?? attribution.fbc,
        },
      });
      if (!active || !decision.allowed || !result.tracked) return;
      loadPixel(result.pixelId);
      window.fbq?.("track", "CompleteRegistration", {}, { eventID: result.eventId });
    }

    void reportRegistration().catch((error) => console.error("Registration tracking failed", error));
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        void reportRegistration().catch((error) => console.error("Registration tracking failed", error));
      }
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [sendRegistration]);

  return null;
}