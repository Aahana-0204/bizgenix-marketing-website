export const BOOKING_TIMEZONE = "Asia/Kolkata";
export type BusyPeriod = { start: string; end: string };
export type SchedulingRules = {
  durationMinutes: number;
  bufferMinutes: number;
  noticeMinutes: number;
  horizonDays: number;
  startHour: number;
  endHour: number;
  weekdays: number[];
};
export function indiaDate(now = new Date()) {
  return new Date(now.getTime() + 330 * 60000).toISOString().slice(0, 10);
}
export function candidateSlots(
  date: string,
  rules: SchedulingRules,
  now = new Date(),
) {
  const midnight = new Date(`${date}T00:00:00+05:30`);
  if (!Number.isFinite(midnight.getTime()) || indiaDate(midnight) !== date)
    return [];
  const day = Math.round(
    (Date.parse(`${date}T00:00:00Z`) -
      Date.parse(`${indiaDate(now)}T00:00:00Z`)) /
      86400000,
  );
  if (
    day < 0 ||
    day >= rules.horizonDays ||
    !rules.weekdays.includes(new Date(`${date}T12:00:00Z`).getUTCDay())
  )
    return [];
  const slots: string[] = [];
  // Offer half-hour start times, regardless of demo duration.
  for (
    let minute = rules.startHour * 60;
    minute + rules.durationMinutes <= rules.endHour * 60;
    minute += 30
  ) {
    const time = midnight.getTime() + minute * 60000;
    if (time >= now.getTime() + rules.noticeMinutes * 60000)
      slots.push(new Date(time).toISOString());
  }
  return slots;
}
export function isFree(
  start: string,
  busy: BusyPeriod[],
  rules: SchedulingRules,
) {
  const from = Date.parse(start) - rules.bufferMinutes * 60000;
  const until =
    Date.parse(start) + (rules.durationMinutes + rules.bufferMinutes) * 60000;
  return busy.every(
    (period) =>
      Date.parse(period.end) <= from || Date.parse(period.start) >= until,
  );
}
export function nextCandidateDate(rules: SchedulingRules, now = new Date()) {
  for (let day = 0; day < rules.horizonDays; day++) {
    const date = indiaDate(new Date(now.getTime() + day * 86400000));
    if (candidateSlots(date, rules, now).length) return date;
  }
  return indiaDate(now);
}
