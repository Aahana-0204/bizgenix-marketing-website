CREATE TABLE "Booking" (
  "id" TEXT NOT NULL, "companyName" TEXT NOT NULL, "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL, "mobile" TEXT NOT NULL, "interest" TEXT NOT NULL,
  "message" TEXT, "slotStart" TIMESTAMP(3) NOT NULL, "slotEnd" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Booking_slotStart_key" ON "Booking"("slotStart");
CREATE INDEX "Booking_email_createdAt_idx" ON "Booking"("email", "createdAt");
CREATE TABLE "ContactMessage" (
  "id" TEXT NOT NULL, "fullName" TEXT NOT NULL, "email" TEXT NOT NULL,
  "message" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContactMessage_email_createdAt_idx" ON "ContactMessage"("email", "createdAt");
CREATE TABLE "DailyQuota" (
  "key" TEXT NOT NULL, "count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "DailyQuota_pkey" PRIMARY KEY ("key")
);
