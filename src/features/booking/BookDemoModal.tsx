"use client";
import { useReducer, useState } from "react";
import { Check, ArrowLeft, CalendarDays } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ApiError, api } from "@/lib/ApiClient";
import type { BookingDetails, BookingResult } from "@/shared/schemas";
import { DetailsForm } from "./DetailsForm";
import { dateKey, SlotCalendar } from "./SlotCalendar";
import { useAvailability } from "./useAvailability";
type State = { step: "details"; details?: BookingDetails } | { step: "slot"; details: BookingDetails } | { step: "success"; booking: BookingResult };
type Action = { type: "details"; data: BookingDetails } | { type: "back" } | { type: "success"; booking: BookingResult };
function reducer(state: State, action: Action): State { if (action.type === "details") return { step: "slot", details: action.data }; if (action.type === "success") return { step: "success", booking: action.booking }; if (state.step === "slot") return { step: "details", details: state.details }; return state; }
const time = (value: string) => new Date(value).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });
function SlotStep({ details, onSuccess }: { details: BookingDetails; onSuccess: (booking: BookingResult) => void }) {
  const [date, setDate] = useState(() => new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date())}T12:00:00`));
  const [selected, setSelected] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const day = dateKey(date);
  const { slots, loading, error: availabilityError, refresh } = useAvailability(day);
  async function book() { setPending(true); setError(""); try { onSuccess(await api.book({ ...details, slotStart: selected })); } catch (error) { setError(error instanceof Error ? error.message : "Please try again"); if (error instanceof ApiError && error.code === "SLOT_TAKEN") { setSelected(""); refresh(); } } finally { setPending(false); } }
  return <><SlotCalendar date={date} onSelect={value => { setDate(value); setSelected(""); setError(""); }} /><div className="slot-grid" aria-label="Available time slots" aria-busy={loading}>{loading ? Array.from({ length: 6 }, (_, i) => <div className="skeleton" key={i} />) : slots.map(slot => <button type="button" className={`slot ${selected === slot.start ? "selected" : ""}`} key={slot.start} disabled={!slot.available || pending} aria-pressed={selected === slot.start} onClick={() => setSelected(slot.start)}>{time(slot.start)}</button>)}</div>{!loading && !slots.some(slot => slot.available) && !availabilityError && <p role="status">No slots available. Please select another date.</p>}{availabilityError && <p role="alert" className="field-error">{availabilityError} <button onClick={refresh}>Retry</button></p>}{error && <p role="alert" className="field-error">{error}</p>}<button className="button full" disabled={!selected || loading || pending} onClick={book}>{pending ? "Confirming your booking…" : "Confirm my free review"}</button></>;
}
export default function BookDemoModal({ onClose }: { onClose: () => void }) {
  const [state, dispatch] = useReducer(reducer, { step: "details" });
  const booking = state.step === "success" ? state.booking : null;
  const calendar = booking ? `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: "TEMPLATE", text: "BizGenix business review", dates: `${booking.slotStart.replace(/[-:]/g, "").replace(".000", "")}/${booking.slotEnd.replace(/[-:]/g, "").replace(".000", "")}`, details: `Booking reference: ${booking.id}`, ctz: "Asia/Kolkata" })}` : "";
  return <Modal onClose={onClose}>{state.step === "success" && booking ? <div className="success"><div className="success-check"><Check size={34} /></div><p className="eyebrow">A little less work starts here</p><h2 id="booking-title">You’re on the calendar.</h2><p>{booking.fullName}, your free 30-minute review is confirmed.</p><div className="booking-summary"><CalendarDays /><strong>{new Date(booking.slotStart).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full" })}<br />{time(booking.slotStart)}–{time(booking.slotEnd)} IST</strong></div><p className="fine-print">{booking.emailSent ? `Confirmation sent to ${booking.email}.` : "Your booking is saved. Email confirmation is currently unavailable; please save these details."}</p><p className="fine-print">Reference: {booking.id}</p><a className="button full" href={calendar} target="_blank" rel="noreferrer">Add to Google Calendar ↗</a></div> : <>{state.step === "slot" && <button className="back-button" onClick={() => dispatch({ type: "back" })}><ArrowLeft size={16} /> Your details</button>}<p className="eyebrow">Let’s make room for better work</p><h2 id="booking-title">Book a free business review.</h2><p className="modal-description">30 minutes. Your business. A practical path forward.</p><div className="steps"><span className={state.step === "details" ? "active" : ""}>01 Your details</span><span className={state.step === "slot" ? "active" : ""}>02 Pick a time</span><span>03 You’re booked</span></div>{state.step === "details" ? <DetailsForm initial={state.details} onNext={data => dispatch({ type: "details", data })} /> : state.step === "slot" ? <SlotStep details={state.details} onSuccess={booking => dispatch({ type: "success", booking })} /> : null}</>}</Modal>;
}
