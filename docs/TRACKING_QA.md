# Tracking setup and acceptance tests

Marketing owns identifiers, destinations, conversion definitions and publishing. The application emits events only after analytics/advertising acceptance; GTM and Meta must use the same consent policy. There is no direct GA4/Pixel installation outside GTM. Purchase is intentionally never emitted.

## GTM variables

Create Version 2 Data Layer Variables named `DLV - lead_id`, `DLV - kind`, `DLV - event_id`, and one per `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`. Set each Data Layer Variable Name to the exact suffix. Define separate approved constants for GA4 measurement ID, Google Ads conversion ID/label and Meta Pixel ID. None are fabricated in source. Do not add email/phone variables.

## Triggers and tags

| Event                  | GTM trigger                                                   | Tags and settings                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| page_view              | Google tag initialization after GTM loads on accepted consent | Google tag with approved GA4 ID; send initial page_view once; do not add another page-view tag or history trigger on this single page                                                    |
| get_started_click      | Custom Event equals get_started_click                         | GA4 Event with same event name; micro-conversion only                                                                                                                                    |
| generate_lead          | Custom Event equals generate_lead                             | GA4 Event with lead_id/kind/event_id; approved lead conversion tags if desired; accepted API response only                                                                               |
| demo_booking_confirmed | Custom Event equals demo_booking_confirmed                    | GA4 Event with event_id/lead_id; Google Ads conversion tag with approved ID/label and transaction ID = DLV event_id; Meta custom event with exactly this name and eventID = DLV event_id |
| purchase               | No trigger / disabled tag                                     | No implementation until backend-verified payment exists                                                                                                                                  |
| consent_granted        | Optional Custom Event                                         | Diagnostics or initialize consent-aware tags; do not trigger a second page_view                                                                                                          |

Configure each tag’s built-in/additional consent checks. Ads tags require ad_storage, ad_user_data and ad_personalization; analytics requires analytics_storage. Configure Conversion Linker with consent. Reject defaults to denied and GTM is not loaded until acceptance. Revoking consent updates all four settings to denied; tags already loaded must obey the update. Disable any duplicate Cal.com GTM app for this conversion.

In GA4 Admin → Events/Key events, mark agreed accepted-lead and confirmed-demo events. In Google Ads choose the approved counting/attribution settings. For Meta use an approved Pixel template that supports a custom event name and browser event ID. Server CAPI sends the same custom name and Cal UID. A reschedule/cancel is not a new initial conversion for that UID. Provider reschedules that create a new UID require marketing review of desired campaign counting; validate the real lifecycle.

## Consent and attribution checks

1. Use a clean browser profile and a staging URL with `?utm_source=qa&utm_medium=test&utm_campaign=launch`. Before choosing, inspect dataLayer consent defaults: all four storage/user/personalization fields denied. Verify no GTM, GA4, Ads or Meta requests.
2. Click Reject. Verify no persistent attribution cookie and no analytics events. Essential lead submission still works. Current-page campaign fields can be attached to the voluntary enquiry without creating a long-lived analytics cookie.
3. Open cookie preferences, Accept, and verify one consent update to granted. GTM should initialize once and produce one page_view.
4. Inspect the first-party `bizgenix-attribution` cookie: 30-day lifetime, SameSite=Lax, Secure on HTTPS, allowlisted campaign/click fields, safe page origin/path, referrer origin only. Test internal navigation and Get Started UTM passthrough.
5. Reject again. Verify consent denied and removal of the attribution cookie. Confirm all tags respect rejection. Blocked localStorage must retain denied defaults.

Do not place PII in UTM values. Avoid using site-wide cookie rejection as a substitute for the organization’s cross-device/server consent withdrawal process; already captured records require the approved privacy process.

## Four diagnostics tools

### GTM Preview / Tag Assistant

- Click Preview, enter staging URL, connect and accept cookies.
- Open a modal: no generate_lead or booking conversion.
- Submit invalid details: no conversion.
- Accept a valid enquiry: exactly one generate_lead with stable event_id and lead_id, no raw name/email/phone.
- Repeat the same accepted lead in the same session: generate_lead remains once-only.
- Complete a real calendar booking. Before signed confirmation, no booking conversion. After confirmation, exactly one demo_booking_confirmed with the Cal UID.
- Replay webhook / recheck confirmation: no duplicate browser event.

### GA4 DebugView

Enable debug_mode in staging Google tag, inspect session events and campaign values. Verify lead/demo events only at the agreed transitions; page_view once. Remove permanent debug flags for production. Do not claim GA4 visibility if no approved measurement ID is configured.

### Meta Test Events

Use the selected dataset’s Test Events code as server META_TEST_EVENT_CODE. Complete an accepted-consent booking, inspect matching browser/server custom names and IDs, verify deduplication, then reject consent and confirm CAPI suppression for new rejected-consent records. Reschedule/cancel/replay: no extra initial conversion. Remove the test code in production.

### Google Ads diagnostics

Use Tag Assistant’s conversion details to confirm ID, label, transaction ID, consent and linker behavior. In Ads Goals → Conversions inspect diagnostics after provider processing delay. Never use button clicks as booked demos. Capture owner-reviewed evidence without secrets/PII.

## Automated and manual coverage

Playwright covers modal opening, validation, accepted API capture, duplicate identity, pricing flow, Get Started fallback, network retry, cookie changes, dataLayer PII exclusion, desktop/mobile layout, keyboard focus and axe WCAG checks. Unit tests cover signatures, phone normalization, identity, retries and CRM adapter contracts. PostgreSQL integration tests cover atomic dedupe, webhook replay/order and exclusive job claims.

Real Cal slots, presenter assignment, provider email delivery, webhook replay, Meta/GA4/Ads dashboards, CSP diagnostics and ad blockers require configured external accounts and remain staging acceptance tests. Lighthouse and real-device results must be measured, not inferred from test success.
