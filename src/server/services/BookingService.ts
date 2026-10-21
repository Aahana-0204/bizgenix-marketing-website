import { bookingSchema, type BookingInput, type BookingResult } from "@/shared/schemas";
import type { IBookingRepository, IClock, IEmailService, ISlotPolicy } from "../interfaces";

export class BookingService {
  constructor(private readonly repository: IBookingRepository, private readonly email: IEmailService, private readonly clock: IClock, private readonly policy: ISlotPolicy, private readonly limit: number) {}
  async book(input: BookingInput): Promise<BookingResult> {
    const valid = bookingSchema.parse(input);
    const start = new Date(valid.slotStart);
    const now = this.clock.now();
    this.policy.validate(start, now);
    const booking = await this.repository.create(valid, new Date(start.getTime() + 1800_000), this.limit, now);
    let emailSent = false;
    try { emailSent = await this.email.sendConfirmation(booking); } catch { console.error("Booking confirmation delivery failed", { bookingId: booking.id }); }
    return { id: booking.id, fullName: booking.fullName, email: booking.email, slotStart: booking.slotStart.toISOString(), slotEnd: booking.slotEnd.toISOString(), emailSent };
  }
}
