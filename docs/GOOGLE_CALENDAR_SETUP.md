# Direct Google Calendar booking

The landing page now defaults to **direct Google Calendar**, without Cal.com. Guests choose a live slot labelled with its host, `pranesh@bizgenix.ai` or `khushi@bizgenix.ai`, before entering their contact details. The four booking details are name, company, email, and mobile; the contact/privacy consent remains required.

Configured rules: **30 minutes**, Monday–Friday, 10:30–18:00 **Asia/Kolkata**, 10-minute buffers, 2 hours' notice, 30-day booking horizon. Fifteen candidate appointments are generated automatically, starting at 10:30, 11:00, 11:30 and ending with 17:30–18:00; busy periods and notice requirements reduce the displayed list. No slot-management button or manual slot creation is required. The booking form initially selects the next day with candidate appointments. The hosts' **primary calendars** are checked for conflicts; other calendars are not checked by this implementation.

## 1. Supply Google and database credentials

1. In [Google Cloud Console](https://console.cloud.google.com/), select/create the company project and enable **Google Calendar API**.
2. Configure the OAuth consent screen. Use an Internal application if the Workspace organization supports it; otherwise configure the external application and its test users/publication requirements. Add the two hosts as test users while testing. Calendar permissions may require Google verification for an external production application.
3. Create an OAuth client of type **Web application**. Register these exact redirect URIs for the environments you use:
   - Local: `http://localhost:3000/api/calendar/google/callback`
   - Production: `https://getcrm.bizgenix.ai/api/calendar/google/callback` (replace the hostname if deployment differs).
4. In the ignored `.env.local`, enter `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DATABASE_URL` and `DIRECT_URL`. Keep `NEXT_PUBLIC_SITE_URL` equal to the actual app URL. Supply the same settings through the hosting provider's environment manager for deployment. Do not put tokens, client secrets or setup keys in public environment variables or Git.
5. `GOOGLE_CALENDAR_HOST_EMAILS` must contain the two distinct approved email addresses. The local configuration already contains the requested addresses and 30-minute duration.
6. The local token encryption key, calendar setup key and cron secret were generated into `.env.local`. For another environment, generate **three separate** random values:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Store them as `GOOGLE_CALENDAR_TOKEN_KEY`, `GOOGLE_CALENDAR_SETUP_SECRET` and `CRON_SECRET`. Keep the encryption key stable and backed up with the encrypted database; changing it requires reconnecting both hosts.

7. Apply the checked-in migrations and generate Prisma Client after configuring the database:

   ```powershell
   node --env-file=.env.local node_modules/prisma/build/index.js migrate deploy
   node --env-file=.env.local node_modules/prisma/build/index.js generate
   ```

## 2. Connect each host once

1. Start the application and visit `/calendar/setup`.
2. Enter the value of `GOOGLE_CALENDAR_SETUP_SECRET` in **Calendar setup key**. This key is used only to unlock setup; it is never placed in a URL or persisted by the setup page.
3. Choose **Connect Google** for Pranesh. Sign into `pranesh@bizgenix.ai`, and grant both requested calendar permissions. The callback checks that the Google-verified email is the selected approved host. A different account is rejected.
4. Unlock setup again and repeat with Khushi's own Google account. Each host can perform their own connection on their device using the private setup key. Share that key through your organization's secure channel.
5. A host showing **Connected** can accept appointments immediately. Connecting the second host adds their available times. Guests can only select a host whose calendar is connected and free at the selected time. The booking API refuses to invent availability when no host is connected or a connected calendar check fails. Reconnect a host only if access is revoked or a refresh token expires; reconnecting is not needed to generate slots.

OAuth uses signed state tied to an HttpOnly browser cookie, a 10-minute expiry, and PKCE. Refresh tokens are encrypted using AES-256-GCM before database storage and used only on the server. Google access is limited to the configured hosts' primary calendars in application code. Requested scopes are `openid`, `email`, `calendar.events` and `calendar.freebusy`.

## 3. Booking behavior

- A visitor sees the calendar and host-labelled available times first. After selecting a time, they enter their name, company, email, and mobile number and confirm the appointment.
- The server validates working hours and notice, checks the selected host's Google free/busy schedule, and rechecks that host before inserting the event.
- **Each host has independent slot capacity.** Booking a time with Pranesh blocks overlapping times on Pranesh's calendar, but does not block Khushi if her calendar is free. The visitor's event and calendar invitation are created only on the selected host's calendar. A PostgreSQL advisory lock serializes reservation checks across app instances, and a processing lease prevents simultaneous insert attempts for the same reservation.
- One event is created on the selected host's calendar, with the visitor as the attendee. The other host is not invited. `sendUpdates=all` asks Google to send the invitation. Invite delivery and automatic appearance on an attendee's calendar remain subject to Google's settings and attendee acceptance.
- Google Meet creation is disabled (`GOOGLE_CALENDAR_CREATE_MEET=false`). New website bookings create calendar events and attendee invitations without requesting a video meeting link. Existing events are not modified.
- Confirmation is shown only after Google returns a confirmed event and it is persisted. No credentials means no test/demo slots and no false confirmation.
- Retries use the same stored Google event ID. After an ambiguous timeout, the selected time stays locked in the UI and retry first looks up that event. The scheduled `/api/cron/outbox` job also attempts recovery of abandoned pending requests before delivering CRM/notification jobs.
- Host calendar edits can race with API checks: Google event insertion does not provide an atomic "create only if free" operation. Website reservations prevent competing website requests from booking overlapping time on the same host, while the final free/busy check reduces conflicts with outside calendar changes.
- Initial booking status, assigned owner, CRM jobs, internal notifications and consented conversion jobs are persisted. Calendar invitations are sent by Google rather than Cal.com. The existing `calBookingUid` database column is retained for CRM compatibility; Google IDs use the `google:` prefix and `provider=google`.

## 4. Changes and operational limits

Ask guests to contact the organizer through their invitation to change/cancel an appointment. New availability reads Google free/busy and the application's pending/confirmed reservations for the selected host. Confirmed reservations remain blocked on that host rather than expiring after a propagation interval. Automatic synchronization of later Google cancellations/reschedules into CRM and existing booking records is **not implemented**; cancelling only in Google therefore does not automatically reopen the website slot. The stored reservation must be reconciled before reopening. Legacy Cal.com webhook handling is retained only for previously configured Cal.com flows.

Pending requests are intentionally not blindly expired after a timeout: Google may already have accepted them. Keep the cron configured to recover those requests. Investigate persistent pending reservations with the host before marking them failed, so a real calendar event is not duplicated. Do not log Google authorization codes, access tokens or refresh tokens.

## 5. Verify with the actual hosts

1. Put a busy event on one host's primary calendar: the time should remain available if the other host is free. Make both busy: it must disappear.
2. Create a staging booking with a real attendee address. Check the assigned host's calendar, visitor invitation, 30-minute duration, and absence from the other host's calendar. This sends a real invitation; do it intentionally.
3. Test buffers, weekends, Indian local-date boundaries, concurrent requests for the same host and time (only one may succeed), the same time on each host independently, revocation/reconnection, and a timeout followed by retry.
4. Confirm database, notifications, outbox/CRM mapping and cron recovery. Configure the existing production prerequisites in `.env.example` before deploying.

Automated unit tests mock Google API responses. The PostgreSQL concurrency/recovery integration test uses **only** `TEST_DATABASE_URL` and does not call Google or send invitations. A configured, migrated disposable PostgreSQL database is required to run it:

```powershell
node node_modules/vitest/vitest.mjs run --config vitest.integration.config.mts
```

References: [OAuth web-server authorization](https://developers.google.com/identity/protocols/oauth2/web-server), [Free/busy API](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query), [Create events and attendee invitations](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert).
