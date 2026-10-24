# Bizgenix AI CRM — setup and go-live guide

The website code is implemented. External accounts and commercial approvals must be supplied by their owners. Without DATABASE_URL, local forms explicitly use a temporary in-process preview store: data can disappear on restart and no email/CRM delivery occurs. Never use preview mode for campaigns.

## 1. Run locally

1. Install Node.js 24 LTS and Git. Open a terminal in this repository.
2. Install pnpm: `npm install --global pnpm@10.34.7`. If Windows blocks script shims, use `npm.cmd` and `pnpm.cmd`.
3. Run `pnpm install`. This generates Prisma Client.
4. Copy `.env.example` to `.env.local`: `Copy-Item .env.example .env.local`. Do not overwrite an existing credential file without reviewing it.
5. Leave APP_ENV=development. Run `pnpm dev` and visit http://localhost:3000.
6. Once you have a development database, set DATABASE_URL and DIRECT_URL, then run the migration and seed commands below. The seed checks connectivity; it never fabricates customer evidence.

```powershell
pnpm exec prisma migrate dev
pnpm db:seed
pnpm db:studio
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Prisma CLI loads `.env` by default, not Next.js `.env.local`. For CLI commands, either keep only DATABASE_URL / DIRECT_URL in an ignored `.env`, or explicitly load `.env.local`:

```powershell
node --env-file=.env.local node_modules/prisma/build/index.js migrate dev
node --env-file=.env.local node_modules/prisma/build/index.js studio
```

Never commit credentials. Use separate databases, keys and provider events for development, preview and production. Public variables are bundled/rendered into the page and require rebuilding when changed.

## 2. Neon PostgreSQL

1. Sign in to the Neon console, choose **New project**, enter the project name and select an appropriate region near your Vercel functions.
2. In **Branches**, use the branch menu to create `staging` and `production`; isolate production data from testing.
3. Select the staging branch → **Connect** → select the database and role. Enable **Connection pooling** and copy the connection string into local DATABASE_URL.
4. Turn pooling off and copy the direct URL into DIRECT_URL. Preserve SSL options provided by Neon.
5. Repeat for production and save those values only in Vercel Production settings.
6. Apply the included migration to an empty dedicated database with `pnpm exec prisma migrate deploy` (or the explicit env-file command). Do not reset a database containing real data. Existing databases require an owner-reviewed migration baseline.
7. Inspect records using **Tables** / **SQL Editor** or `pnpm db:studio`. Restrict console access and verify branch-specific restore/backup settings; test a restore before launch.

See [Neon connections](https://neon.com/docs/connect/connect-from-any-app). The runtime uses pooled PostgreSQL; Prisma migrations use the direct URL.

For isolated local tests, start Docker Desktop first, then:

```powershell
docker compose up -d
$env:DATABASE_URL='postgresql://crm:local-test-only@localhost:5433/crm_test'
$env:DIRECT_URL=$env:DATABASE_URL
$env:TEST_DATABASE_URL=$env:DATABASE_URL
pnpm db:deploy
pnpm test:integration
```

These public local-test credentials are only for the disposable Docker service. Never put production credentials in test commands, CI fixtures or screenshots. The integration test claims outbox jobs and deletes its fixtures: point it only at a disposable database.

## 3. Upstash rate limiting

1. Sign in to Upstash → **Redis** → **Create Database**. Select a region suitable for the Vercel application.
2. Open the database → **Connect / REST** (or **Details**).
3. Copy the REST endpoint to UPSTASH_REDIS_REST_URL and the standard writable REST token to UPSTASH_REDIS_REST_TOKEN.
4. Set distinct development/preview/production values. Restart/redeploy, then test repeated submissions to verify HTTP 429 without duplicate records.

Do not use the Redis TCP password in place of the REST token. [Official connection guide](https://upstash.com/docs/redis/howto/connect-with-upstash-redis).

## 4. Resend email

1. Sign in to Resend → **Domains** → **Add Domain**. Use an approved sending domain/subdomain.
2. Copy each displayed SPF/DKIM verification record into your DNS provider exactly. Do not replace unrelated existing mail records. Click **Verify DNS Records** after propagation.
3. Open **API Keys** → **Create API Key**. Scope it to the sending domain; copy it once into RESEND_API_KEY.
4. Set EMAIL_FROM to an address on that verified domain, with an approved display name if wanted.
5. Set ROUTE_QUALIFIER_EMAIL to Ashta’s approved address, and comma-separated ROUTE_PRESENTER_EMAILS to Pranesh/Khushi’s approved addresses. Closing addresses can be listed in ROUTE_CLOSING_EMAILS, but this application does not send pre-demo messages to them.
6. Submit a staging lead, run the outbox, and check Resend delivery diagnostics and the recipient inbox. Cal.com sends attendee booking confirmations; this app sends internal notifications.

The app uses per-recipient idempotency keys. Inspect [Resend domain instructions](https://resend.com/docs/dashboard/domains/introduction) and [idempotency retention](https://resend.com/docs/dashboard/emails/idempotency-keys) when operating retries.

## 5. Scheduling

**Current setup: direct Google Calendar, one available host, 30-minute demos.** Follow [Google Calendar setup](docs/GOOGLE_CALENDAR_SETUP.md) to configure OAuth, migrate the database and connect Pranesh and Khushi. Cal.com is not required for this path. The instructions below are only for the optional legacy adapter (`SCHEDULING_PROVIDER=calcom`).

### Legacy Cal.com scheduling and signed webhook

1. Create/sign in to the approved Cal.com workspace. Invite Pranesh and Khushi to the team.
2. Each presenter opens **Settings → Calendars**, connects the actual calendar, selects conflict calendars and the calendar receiving bookings, and sets availability/timezone.
3. In **Event Types**, create a team **Round Robin** event. Set the agreed title and duration (proposed 20 minutes), assign presenters and confirm availability.
4. Set timezone to Asia/Kolkata. Configure approved buffer, minimum notice, booking horizon, cancellation/reschedule policy and conferencing. These belong in Cal.com, not hardcoded slot generation.
5. Decide whether manual confirmation is required. If enabled, pending bookings must remain pending until BOOKING_CONFIRMED.
6. Add required name/email plus phone and any business questions using the booking-question identifiers you actually configure. The embed prepopulates name, email, phone and notes; validate these against the real event.
7. Open **Embed** for the event and copy its Cal path (the part after `https://cal.com/`) into NEXT_PUBLIC_CALCOM_LINK. Do not paste a full URL. The application has an isolated namespace per lead.
8. Generate a long random secret, e.g. `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Store it as CALCOM_WEBHOOK_SECRET and use the same value in Cal.com.
9. Open **Settings → Developer → Webhooks → New Webhook** (or the event’s webhook settings). Subscriber URL: `https://getcrm.bizgenix.ai/api/webhooks/calcom`. Enable BOOKING_CREATED, BOOKING_CONFIRMED, BOOKING_REQUESTED, BOOKING_RESCHEDULED and BOOKING_CANCELLED where available. Save the secret and activate the webhook. Keep the standard provider payload; custom templates can remove required fields.
10. Make a real staging booking. Check Cal delivery logs, Booking/WebhookEvent rows, lead status, internal notification and actual attendee email. Reschedule and cancel it; replay a delivery and confirm no duplicate jobs/conversions.
11. Confirm `metadata[leadId]` survives into the signed payload on your event. If unsupported, the implemented fallback correlates by attendee email; notes also carry an opaque reference. Avoid shared-email ambiguity and verify this before release.

The current embed uses bookingSuccessfulV2, which can indicate an unconfirmed request. The UI polls the protected backend for up to 30 seconds and only shows a booked state after a signed webhook persisted confirmation. If embed events are blocked, users can open the public event page and select **Check confirmation**. [Embed events](https://cal.com/help/embedding/embed-events), [webhook signature reference](https://cal.com/help/webhooks). Do not disable signature validation to fix webhook errors.

## 6. CRM contract and routing

Ask the backend owner for lead upsert and booking update documentation, sandbox base URL/key, stable remote ID format, field validation, dedupe semantics, error codes, retry behavior and assignment rules. Request idempotency-key support in writing.

The generic adapter currently expects `POST /leads/upsert` → JSON `{ "id": "remote-id" }` and `POST /bookings/upsert` → successful status. Change endpoints/response decoding in `src/infrastructure/crm/http/gateway.ts` and field mapping in `src/infrastructure/crm/http/mapper.ts` after reviewing the real docs. Do not assume these endpoints exist on Bizgenix CRM.

1. Keep CRM_ADAPTER=mock until sandbox contract tests pass.
2. Configure CRM_BASE_URL and CRM_API_KEY server-side; select CRM_ADAPTER=http.
3. Run `pnpm test` (MSW contract tests) and a real staging submission/replay against the sandbox. Check source attribution, consent and booking lifecycle mapping.
4. Only after the real contract and idempotency are verified, set CRM_CONTRACT_VERIFIED=true. This is required in production.
5. Review `src/config/routing.ts`: qualifier sees capture details, configured presenters see necessary booking data, closing team receives no automated pre-demo handover. Cal.com controls round-robin host assignment.

Sheets is deliberately rejected until its authenticated adapter and privacy controls are implemented; it is a reporting contingency, not a substitute for durable lead capture. Purchase is a reserved future event and never fires without a real verified payment integration.

## 7. GTM, GA4, Meta and Google Ads (Shivam)

1. Create/open the approved GTM web container. Copy its `GTM-…` ID to NEXT_PUBLIC_GTM_ID.
2. Create a GA4 web data stream for the campaign domain and obtain its measurement ID. Configure the Google tag in GTM; the application does not directly install a second GA tag.
3. Use the exact event/tag/trigger table in [TRACKING_QA.md](docs/TRACKING_QA.md). Configure consent checks on every tag. Default storage is denied; GTM is loaded only after Accept. Do not add another cookie banner or duplicate pageview/conversion tag.
4. In GA4 **Admin → Data display → Events / Key events**, mark accepted generate_lead and provider-confirmed demo_booking_confirmed as agreed key events.
5. In Google Ads **Goals → Conversions → Summary**, create the approved website conversion. Copy the conversion ID/label into GTM’s Google Ads Conversion Tracking tag and use the confirmed-booking trigger. Choose the approved counting setting; do not count opening the modal as a booking. Configure Conversion Linker with consent.
6. In Meta Events Manager select/create the approved web dataset/pixel and verify the domain. Install Meta Pixel through a reviewed GTM template, with consent and the identical custom event name `demo_booking_confirmed` and event ID from dataLayer.
7. Generate a Conversions API token using the dataset’s integration settings. Set META_PIXEL_ID and META_CAPI_TOKEN only on the server. Set META_API_VERSION to a supported Graph API version confirmed in Meta’s current docs. Use META_TEST_EVENT_CODE while testing and remove it from production afterward.
8. In GTM Preview, GA4 DebugView, Meta Test Events and Ads diagnostics, verify one conversion per confirmed booking, browser/server deduplication, rejected consent and attribution. Never paste tokens into client code or GTM variables.

[Google consent setup](https://developers.google.com/tag-platform/security/guides/consent), [Meta CAPI](https://developers.facebook.com/docs/marketing-api/conversions-api/). Do not insert guessed IDs or labels.

## 8. Vercel, domain and scheduler

1. Push the reviewed code to your approved GitHub repository. In Vercel choose **Add New → Project → Import Git Repository**. Set the correct project root and Next.js framework.
2. Open **Settings → Git** and set production branch to `main` if approved. PR branches should deploy previews.
3. Open **Settings → Environment Variables**. For every `.env.example` entry, add the appropriate value and choose **Development**, **Preview** and/or **Production** explicitly. Keep production database/API keys out of previews. Use APP_ENV=preview for previews and APP_ENV=production for production.
4. Add the official SVG and approved footer/legal URLs. Production builds validate required variables and refuse a mock/unverified CRM configuration.
5. Apply production migrations with production environment loaded: `pnpm exec prisma migrate deploy`. Do this as a controlled deployment job; do not run development migrate/reset against production.
6. Open **Settings → Domains → Add**, enter `getcrm.bizgenix.ai`, and copy the exact DNS record Vercel displays to your DNS provider. A subdomain usually needs CNAME host `getcrm` to Vercel’s displayed project target; do not guess the value or overwrite the root domain. Wait for **Valid Configuration** and HTTPS certificate issuance.
7. `vercel.json` schedules GET `/api/cron/outbox` every minute. Set CRON_SECRET to a securely generated random string. Vercel attaches Bearer authorization. Confirm your plan supports this frequency; Hobby supports only daily cron. [Vercel limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).
8. If the plan cannot support minute cron, remove the cron entry before deployment and configure Upstash QStash **Schedules → Create Schedule** for the production URL, POST, `* * * * *`, and `Authorization: Bearer <CRON_SECRET>` as a forwarded header. Test authorization and inspect delivery logs. Keep credentials in the scheduler’s secret settings.
9. GitHub Actions scheduled workflows have a five-minute minimum and are not an exact one-minute alternative. They can call the same protected endpoint every five minutes if that retry delay is approved. Store the URL and secret in repository Actions secrets; never embed them in YAML.
10. Verify `/api/health` says `ok`, preview is noindex, production robots/canonical are correct, and a complete lead-to-demo route succeeds before sending traffic.

## 9. Sentry

1. Create/select a Sentry **Next.js** project. Open **Project Settings → Client Keys (DSN)** and copy DSN to SENTRY_DSN and, if browser monitoring is approved, NEXT_PUBLIC_SENTRY_DSN.
2. Add SENTRY_ORG, SENTRY_PROJECT and a build-only SENTRY_AUTH_TOKEN with the minimum release/source-map upload permissions. Never prefix the auth token with NEXT_PUBLIC.
3. The Next.js config enables Sentry source-map upload when that token exists and removes uploaded maps. Trigger a controlled staging error and confirm readable stack traces without raw form/provider details. Review event scrubbing before launch. [Manual SDK guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/).

## 10. Go-live and rollback

- [ ] Official brand SVG and verified screenshot/feature flags reviewed; no invented evidence or client prices.
- [ ] Approved billing duration, entitlements, usage charges and Get Started/payment owner resolved.
- [ ] Contact, privacy and terms are approved and visible; retention/deletion process has an owner.
- [ ] Production database migration applied and backup/restore tested.
- [ ] CRM sandbox and real idempotency contract verified; credentials separated by environment.
- [ ] Available-slot, taken-slot, pending confirmation, booking, reschedule and cancellation tested with real presenters.
- [ ] Outbox retries, scheduler authorization, email delivery and exhausted-job alert tested.
- [ ] GTM, GA4, Meta and Ads diagnostics all checked; consent rejection and duplicate-event cases passed.
- [ ] Lint, types, unit, PostgreSQL and desktop/mobile E2E checks pass; unresolved dependency audit items reviewed.
- [ ] Lighthouse mobile targets measured on staging (90 performance / 95 accessibility, best practices, SEO); no score is assumed from a successful build.
- [ ] Real mobile device, keyboard, reduced motion and accessibility checks completed.
- [ ] Marketing, scheduling, technical and commercial owners sign off before campaigns.

Rollback: pause campaigns, promote the last healthy Vercel deployment, verify health and scheduling, and inspect queued jobs before resuming. Code rollback does not roll back a database schema: use a tested forward fix or owner-approved restore. Preserve captured leads and audit logs; never reset the production database.

## 11. Troubleshooting

| Symptom                         | Likely cause                                   | Fix                                                                                               |
| ------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Startup reports a variable name | Required setting absent/invalid                | Check the named environment in Vercel/local config; redeploy after public variable changes        |
| Webhook 401                     | Secret mismatch or altered raw body            | Recopy secret at both ends; keep standard payload and X-Cal-Signature-256                         |
| Webhook 422                     | Unsupported/custom payload                     | Compare actual provider body to shared webhook schema; add reviewed mapping and tests             |
| Calendar blocked/slow           | Content blocker, CSP or wrong path             | Use fallback page; verify path, network and CSP on staging                                        |
| Pending after booking           | Webhook delayed/blocked or manual confirmation | Check Cal delivery logs and database; use Check confirmation; confirm manually in Cal if required |
| Duplicate conversions           | Duplicate GTM tags or mismatched event IDs     | One event owner; browser/CAPI same UID and custom name; disable Cal-side duplicate GTM app        |
| CRM 4xx                         | Wrong generic mapping/auth/required field      | Get backend docs, correct mapper/adapter and replay failed job after review                       |
| Lead 403                        | Origin differs from configured site URL        | Use the canonical same origin; configure preview URL correctly                                    |
| Lead 429                        | IP/email request threshold reached             | Wait for window; inspect limiter without exposing PII; do not disable production protection       |
| No email                        | Unverified domain, recipient or pending job    | Verify Resend/DNS/routing and outbox state                                                        |
| Consent banner doesn’t update   | Blocked storage, old build or duplicate banner | Test storage and consent events; remove extra tags; retain denied default                         |
| Migration cannot find URL       | Prisma CLI didn’t load .env.local              | Use explicit Node --env-file command above                                                        |
| Test DB suite skipped           | TEST_DATABASE_URL absent                       | Start disposable PostgreSQL, apply migration, set test URL                                        |
| Vercel rejects cron             | Hosting frequency limit                        | Use a supporting plan or remove entry and configure QStash                                        |

## 12. Open items and ownership

Management/product must confirm billing term for 5/10/unlimited plans, older per-user offer status, tier features/credits, implementation and usage charges, support/minimum term, legal/contact details and retention. Technical owner must supply CRM docs/key/deployment process and verify field/response/idempotency mapping. Scheduling owner must approve presenter calendars and booking policies. Marketing must supply IDs/definitions and complete diagnostics. Official SVG, verified/anonymized dashboard image and optional feature verification remain asset handoffs.

No manual account, DNS, secret, presenter, tracking, commercial or publishing step is silently claimed complete by this repository.
