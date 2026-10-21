import { ValidationError } from "../domain/errors";
import type { ISlotPolicy } from "../interfaces";

export const IST_OFFSET = 330 * 60_000;
export function istDay(date: Date) { return new Date(date.getTime() + IST_OFFSET).toISOString().slice(0, 10); }
export class BusinessHoursPolicy implements ISlotPolicy {
  constructor(private readonly holidays: string[] = []) {}
  validate(start: Date, now: Date) {
    if (!Number.isFinite(start.getTime())) throw new ValidationError("Invalid slot");
    const local = new Date(start.getTime() + IST_OFFSET);
    const hour = local.getUTCHours();
    if (start <= now || start.getTime() > now.getTime() + 90 * 86400_000 || local.getUTCDay() === 0 || this.holidays.includes(istDay(start)) || hour < 10 || hour >= 18 || local.getUTCMinutes() % 30 !== 0 || local.getUTCSeconds() !== 0 || local.getUTCMilliseconds() !== 0) {
      throw new ValidationError("Choose a future, half-hour slot within the next 90 days, Monday–Saturday, 10 AM–6 PM IST, excluding holidays.");
    }
  }
}
