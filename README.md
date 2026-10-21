# BizGenix AI Solutions

One Next.js App Router + TypeScript application for the marketing website and booking/contact APIs. PostgreSQL owns booking concurrency; no separate server, cache, queue, cron, or paid service is required to run the application.

## Local setup

1. Install Node.js 24 LTS and run `npm ci`.
2. Copy `.env.example` to `.env`. Keep real credentials out of version control.
3. Set `DATABASE_URL` to your pooled Neon/Supabase PostgreSQL URL and `DIRECT_URL` to the direct database URL. Use the connection strings supplied by your provider, with SSL enabled.
4. Run `npm run db:generate`, then `npm run db:deploy` to apply the checked-in migration.
5. Run `npm run dev` and open http://localhost:3000.

The marketing pages render without database or email credentials. Booking and contact APIs return a controlled 503 until valid database configuration is available. No fake booking success is generated. A booking can be saved without email configuration; the success screen states that email delivery was unavailable.

PowerShell users whose policy blocks npm.ps1 can use `npm.cmd` and `npx.cmd` for these commands.

## Environment

| Variable | Purpose |
| --- | --- |
| DATABASE_URL | Pooled PostgreSQL connection URL for application traffic |
| DIRECT_URL | Direct PostgreSQL URL used for migrations |
| RESEND_API_KEY | Optional locally; required for confirmation delivery |
| EMAIL_FROM | Sender on a domain verified in your Resend account |
| NEXT_PUBLIC_SITE_URL | Canonical origin, such as https://your-project.vercel.app |
| BOOKING_DAILY_LIMIT | Successful bookings per normalized email per IST day; default 3 |
| BOOKING_HOLIDAYS | Comma-separated ISO dates, such as 2026-12-25,2027-01-26 |

Never put database or Resend credentials in a NEXT_PUBLIC variable. Use a Resend key and sender for your own verified domain in production.

## Routes and architecture

Pages: `/`, `/about`, `/custom-solution`, `/product`, `/learning`, `/case-study`, `/insights`, `/contact`.

| API | Input | Result |
| --- | --- | --- |
| GET /api/availability | date=YYYY-MM-DD | Half-hour slots and availability |
| GET /api/availability/month | month=YYYY-MM | Dates with at least one free slot |
| POST /api/bookings | Shared booking schema | 201 with booking summary; 409 SLOT_TAKEN on conflict |
| POST /api/contact | fullName, email, message, empty website | 201 after database persistence |

Every response uses `{ success, data, error }`. Validation errors use 400, daily limits 429, and service/configuration failures 503. JSON request bodies are limited to 16 KiB. Honeypots and normalized email/day database quotas reduce simple form spam; they are not identity verification or a general DDoS control.

Business hours: Monday–Saturday, 10:00–18:00 Asia/Kolkata. Last start is 17:30. Bookings must be in the future, on the half-hour grid, within 90 days, and outside configured holidays. The server applies every rule independently of the browser. Calendar dates and slot labels use IST.

`Booking.slotStart` has a PostgreSQL unique constraint. Booking insertion catches Prisma P2002 and returns 409. Atomic daily quota increments and insertion share one database transaction, so a conflict rolls the increment back. Contact messages use the same quota mechanism with a limit of five per email/day. Quota rows can be removed manually after their day has passed; they do not require a scheduled worker.

For cancellation, delete the Booking row through an authorized database/admin workflow to free its slot. There is intentionally no unauthenticated public cancellation route. Email delivery occurs after the booking transaction; its failure cannot erase a booking. There is no retry queue: use the booking summary and calendar link if delivery fails.

See `docs/architecture.md`. Framework-independent services use constructor injection; route handlers stay thin. Zod schemas in `src/shared` are used by both client and server. The dynamically loaded modal uses a native modal dialog for focus containment, Escape handling, and focus restoration.

## Checks

- `npm test`: unit suite plus the optional PostgreSQL integration test.
- `npm run typecheck`: strict TypeScript validation.
- `npm run build`: generate Prisma client and build production assets.
- `npm run lint`: ESLint.

The PostgreSQL integration test is skipped unless TEST_DATABASE_URL is set. Use a **dedicated disposable test database**, apply the migration to it first, and set TEST_DATABASE_URL to its direct connection URL. Run `npm run test:integration`. It sends 20 parallel requests through the booking handler using distinct emails for one future slot, then asserts exactly one 201 and nineteen 409 SLOT_TAKEN responses. It cleans up its own test rows. Never point this test at a production database. Unit concurrency tests with a fake repository are separate and do not prove the PostgreSQL guarantee.

To migrate the test database in PowerShell, set DATABASE_URL and DIRECT_URL temporarily to its URL, run `npm run db:deploy`, then restore your development URLs before continuing. TEST_DATABASE_URL is never used by the application itself.

## Free-tier deployment: Vercel + Neon/Supabase

1. Create a free PostgreSQL project with Neon or Supabase. Copy pooled and direct URLs into your local .env and Vercel project settings.
2. Run `npm run db:deploy` against the intended database. Apply future migrations before deploying code that needs them. The build generates the client but does not modify the database.
3. Import this repository into Vercel with this directory as the project root. Use the Next.js preset, install with `npm ci`, and build with `npm run build`.
4. Add DATABASE_URL, DIRECT_URL, RESEND_API_KEY, EMAIL_FROM, NEXT_PUBLIC_SITE_URL and optional holiday/limit settings. Use separate database credentials for preview and production environments.
5. Deploy, then check all pages, submit a contact enquiry, book a slot, and verify the confirmation email and Google Calendar time. Use a fresh slot to verify the 409 path.

Free plans have usage caps and eligibility terms. Confirm your account's current limits and whether your use is permitted before launch. Resend's free allowance has commonly been approximately 100 emails/day; consult your account dashboard for the actual allowance. Database suspension, sleep, connection caps, and cold starts can increase initial API latency. There is no always-running worker or uptime guarantee in this design. Vercel plan eligibility and quotas must fit your intended business use.

## Brand, content, and launch review

Colors are Tailwind tokens in globals.css. Fonts use next/font: Plus Jakarta Sans headings and Inter body. Put approved logo files under `public/brand/`, then replace the typographic logo in Navbar and Hero. Original starter SVGs are unused.

Homepage promotions live in `src/components/sections/promotions.ts`; page copy lives in `src/lib/content.ts`. No customer logos, testimonials, or completed-project results were provided, so the marquee uses ecosystem categories, case studies are clearly labeled illustrative workflows, and 3x/70%/30s/24/7 numbers are planning examples rather than proven claims. Replace these only with approved material.

The site includes metadata, OpenGraph text, organization JSON-LD, sitemap, robots, security headers, visible focus states, reduced-motion behavior, mobile navigation, and form validation. Verify keyboard and screen-reader behavior, 360px–1920px layouts, email delivery, database concurrency, and Lighthouse on the deployed environment. A Lighthouse 90+ score is a target, not a measured result until a deployed audit is run. Google Fonts require network access during the first production build.

No external service has been provisioned by this repository. The supplied code and migrations are ready for your account configuration.


## Dependency audit status

The implementation was checked with npm audit. Updating Vitest and the existing Node type package removed the critical test-tool findings. Remaining high-severity reports involve Prisma 6's configuration dependency (deepmerge-ts) and the existing Next.js ESLint dependency chain (braces/micromatch/fast-glob). The audit's suggested direct fixes include major version changes; they were not force-applied. Prisma CLI runs during generation/migration, and ESLint is development tooling. Re-evaluate these advisories before production rollout; do not treat this repository as having a clean security audit. Avoid loading untrusted Prisma configuration or running development tooling as a public service.
