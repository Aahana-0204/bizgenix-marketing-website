import type { IClock, ISlotPolicy } from "../interfaces";
import { ValidationError } from "../domain/errors";

export class SlotGenerator {
  constructor(private readonly policy: ISlotPolicy, private readonly clock: IClock) {}
  forDate(day: string) {
    const now = this.clock.now();
    return Array.from({ length: 16 }, (_, index) => {
      const start = new Date(`${day}T${String(10 + Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}:00+05:30`);
      try { this.policy.validate(start, now); return { start, end: new Date(start.getTime() + 1800_000) }; }
      catch (error) { if (error instanceof ValidationError) return null; throw error; }
    }).filter((slot): slot is { start: Date; end: Date } => slot !== null);
  }
}
