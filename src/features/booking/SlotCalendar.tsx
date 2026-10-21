"use client";
import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import { api } from "@/lib/ApiClient";
export function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
export function SlotCalendar({ date, onSelect }: { date: Date; onSelect: (date: Date) => void }) {
  const [month, setMonth] = useState(date);
  const [available, setAvailable] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const monthKey = dateKey(month).slice(0, 7);
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const today = new Date(`${todayKey}T00:00:00`);
  const last = new Date(today); last.setDate(last.getDate() + 90);
  useEffect(() => { const controller = new AbortController(); api.month(monthKey, controller.signal).then(setAvailable).catch((error: Error) => { if (error.name !== "AbortError") setError(error.message); }); return () => controller.abort(); }, [monthKey, retry]);
  return <><DayPicker mode="single" required selected={date} onSelect={onSelect} month={month} onMonthChange={value => { setAvailable(null); setError(""); setMonth(value); }} startMonth={today} endMonth={last} disabled={[{ before: today }, { after: last }, { dayOfWeek: [0] }, day => available === null || !available.includes(dateKey(day))]} />{available === null && !error && <p role="status" className="fine-print">Checking available dates…</p>}{error && <p role="alert" className="field-error">{error} <button type="button" onClick={() => { setError(""); setRetry(value => value + 1); }}>Retry</button></p>}<p className="fine-print">All times are India Standard Time (UTC+5:30).</p></>;
}
