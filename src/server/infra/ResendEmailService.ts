import { Resend } from "resend";
import type { BookingRecord, IEmailService } from "../interfaces";

export class ResendEmailService implements IEmailService {
  constructor(private readonly apiKey: string | undefined, private readonly from: string) {}
  async sendConfirmation(booking: BookingRecord) {
    if (!this.apiKey) return false;
    const result = await new Resend(this.apiKey).emails.send({ from: this.from, to: booking.email, subject: "Your BizGenix business review is booked", text: `Hi ${booking.fullName},\n\nYour 30-minute business review is booked for ${booking.slotStart.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" })} IST.\n\nBooking reference: ${booking.id}\nWe look forward to learning about ${booking.companyName}.\n\nBizGenix AI Solutions` });
    return !result.error;
  }
}
