# Meta registration conversion tracking

## Goal
Track `CompleteRegistration` once for each genuinely new account, using both Meta Pixel and Meta Conversions API with one shared event ID. Do not track paid subscriptions or purchases.

## Compliance choice
Use the selected no-banner route:
- Check the visitor country through the same-origin Cloudflare location endpoint.
- Do not load Meta Pixel or send CAPI events for UK, EEA, unknown, failed lookup, or Tor traffic.
- Keep Meta tracking enabled elsewhere and preserve applicable browser opt-outs.
- Do not replay events that were blocked when registration occurred.

## Implementation
1. Replace the hard-coded global Meta snippet with a small tracking module that:
   - Loads the Pixel once only after the location check allows advertising tracking.
   - Sends normal `PageView` events on initial load and client-side navigation.
   - Captures `_fbp` and `_fbc`, deriving `_fbc` from `fbclid` when appropriate without changing URLs or existing UTM data.
2. Add a protected registration-conversion server function:
   - Requires a valid signed-in account.
   - Atomically claims one conversion per account in a backend ledger with a unique user constraint.
   - Pre-populates the ledger for all accounts that existed before this feature, preventing old users from being counted on their next login.
   - Uses the server request time as the completed registration time.
   - Hashes normalized email, first name, and last name with SHA-256 before sending them to Meta.
   - Sends permitted `_fbp`, `_fbc`, client IP, user agent, and source URL only when tracking is allowed.
   - Calls Meta with `event_name: CompleteRegistration` and `action_source: website`.
3. Trigger registration tracking only after authentication confirms a signed-in account:
   - Cover immediate email signups, email-verification callbacks, invited renter signups, and first-time Google registrations.
   - The server ledger decides whether the account is new and claimable, so refreshes, multiple tabs, failed signups, verification repeats, and returning logins cannot emit another conversion.
   - Return the server-generated event ID to the browser and use it in `fbq('track', 'CompleteRegistration', {}, { eventID })` for Meta deduplication.
4. Update the privacy policy to accurately state that Meta advertising tracking is blocked in consent-required or unresolved regions under the selected no-banner approach.

## Configuration
Request these secure runtime values after the endpoint is ready:
- `META_PIXEL_ID` — the numeric Pixel/Dataset ID from Meta Events Manager. This is public in browser requests but will be centrally configured rather than repeated in code.
- `META_CONVERSIONS_API_ACCESS_TOKEN` — the Conversions API token from Meta Events Manager; server-only and never exposed to the browser.
- Optional `META_TEST_EVENT_CODE` — used temporarily with Meta Test Events during verification, then removed or replaced for production.

No paid-subscription event will be added.

## Verification
- Verify the location gate blocks all Meta network traffic in UK/EEA/unresolved tests.
- Verify allowed-region PageView behavior across client navigation.
- Verify a successful new registration sends one browser and one server `CompleteRegistration` with the same event ID.
- Verify failed signup, dashboard refresh, repeat login, and old accounts send none.
- Check the current build and browser console/network behavior.
- Use Meta Test Events for final provider-side receipt and deduplication confirmation once the credentials are supplied.
