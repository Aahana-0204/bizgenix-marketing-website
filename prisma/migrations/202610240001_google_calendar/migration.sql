ALTER TABLE "Booking" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'calcom';

CREATE TABLE "GoogleCalendarConnection" (
  "email" TEXT NOT NULL,
  "encryptedRefreshToken" TEXT NOT NULL,
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoogleCalendarConnection_pkey" PRIMARY KEY ("email")
);

CREATE TABLE "CalendarReservation" (
  "id" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "presenter" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "processingUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarReservation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CalendarReservation_requestKey_key" ON "CalendarReservation"("requestKey");
CREATE UNIQUE INDEX "CalendarReservation_eventId_key" ON "CalendarReservation"("eventId");
CREATE INDEX "CalendarReservation_presenter_startAt_endAt_idx" ON "CalendarReservation"("presenter", "startAt", "endAt");
