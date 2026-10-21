# Application structure

The existing Next.js App Router application serves the marketing pages and Node route handlers together. Shared Zod schemas validate browser and server input. Route handlers call constructor-injected services under `src/server`.

PostgreSQL owns booking concurrency through the unique `Booking.slotStart` constraint. A transaction increments a database daily quota and inserts the booking; a failed insert rolls back its quota increment. No temporary slot holds or background workers are required.

`prisma/schema.prisma` defines Booking, ContactMessage, and DailyQuota. Booking stores companyName, fullName, email, mobile, interest, message, unique slotStart, slotEnd, and createdAt. ContactMessage stores fullName, email, message, and createdAt. DailyQuota stores an email/day key and atomic count.

Business hours are 10:00–18:00 Asia/Kolkata, Monday–Saturday, on a 30-minute grid. Configured holidays and past slots are rejected by the server. Cancellation frees a slot by deleting its booking through an authorized database operation; there is no public cancellation endpoint.
