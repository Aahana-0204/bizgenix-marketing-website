import type { IBookingRepository } from "../interfaces";
import type { Slot } from "@/shared/schemas";
import { SlotGenerator } from "./SlotGenerator";

export class AvailabilityService {
  constructor(private readonly repository: IBookingRepository, private readonly generator: SlotGenerator) {}
  async day(date: string): Promise<Slot[]> {
    const slots = this.generator.forDate(date);
    if (!slots.length) return [];
    const taken = new Set((await this.repository.taken(slots[0].start, slots[slots.length - 1].end)).map(date => date.toISOString()));
    return slots.map(slot => ({ start: slot.start.toISOString(), end: slot.end.toISOString(), available: !taken.has(slot.start.toISOString()) }));
  }
  async month(month: string) {
    const days = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).getUTCDate();
    const candidates = Array.from({ length: days }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`);
    const taken = new Set((await this.repository.taken(new Date(`${month}-01T00:00:00+05:30`), new Date(`${candidates.at(-1)}T23:59:59+05:30`))).map(date => date.toISOString()));
    return candidates.filter(day => this.generator.forDate(day).some(slot => !taken.has(slot.start.toISOString())));
  }
}
