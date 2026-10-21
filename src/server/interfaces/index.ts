import type { BookingInput } from "@/shared/schemas";

export type BookingRecord = Omit<BookingInput, "slotStart" | "website"> & { id: string; slotStart: Date; slotEnd: Date };
export interface IClock { now(): Date }
export interface ISlotPolicy { validate(start: Date, now: Date): void }
export interface IBookingRepository {
  create(input: BookingInput, end: Date, limit: number, now: Date): Promise<BookingRecord>;
  taken(from: Date, to: Date): Promise<Date[]>;
}
export interface IEmailService { sendConfirmation(booking: BookingRecord): Promise<boolean> }
