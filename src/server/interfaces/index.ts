import type { BookingInput } from "@/shared/schemas";

export type BookingRecord = Omit<BookingInput, "slotStart" | "website" | "interest" | "message"> & { id: string; slotStart: Date; slotEnd: Date; interest: string; message?: string | null };
export interface IClock { now(): Date }
export interface ISlotPolicy { validate(start: Date, now: Date): void }
export interface IBookingRepository {
  create(input: BookingInput, end: Date, limit: number, now: Date): Promise<BookingRecord>;
  taken(from: Date, to: Date): Promise<Date[]>;
}
export interface IEmailService { sendConfirmation(booking: BookingRecord): Promise<boolean> }
