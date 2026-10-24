"use client";
import { useEffect, useState } from "react";
import type { PublicSite } from "@/config/site";
import type { LeadResult } from "./DetailsForm";
import type { ConfirmedBooking } from "./BookingModal";
import { indiaDate, nextCandidateDate } from "@/domain/scheduling";
import { Icon } from "../ui/Icon";
import { track } from "@/lib/tracking";

const timeLabel = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
export default function GoogleCalendarSlots({
  config,
  lead,
  onConfirmed,
}: {
  config: PublicSite;
  lead: LeadResult;
  onConfirmed: (booking: ConfirmedBooking) => void;
}) {
  const [date, setDate] = useState(() =>
    nextCandidateDate(config.bookingRules),
  );
  const [slots, setSlots] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [pending, setPending] = useState(false);
  const [{ today, maxDate }] = useState(() => {
    const now = new Date();
    return {
      today: indiaDate(now),
      maxDate: indiaDate(
        new Date(now.getTime() + (config.bookingHorizon - 1) * 86400000),
      ),
    };
  });
  function resetAvailability() {
    setLoading(true);
    setSlots([]);
    setSelected("");
    setError("");
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch(
      `/api/availability?leadId=${encodeURIComponent(lead.leadId)}&date=${date}`,
      {
        headers: { Authorization: `Bearer ${lead.statusToken}` },
        cache: "no-store",
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "We couldn’t load available times.");
        return data;
      })
      .then((data) => {
        if (!controller.signal.aborted) setSlots(data.slots);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Please try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [date, lead.leadId, lead.statusToken, retry]);
  async function confirm() {
    if (!selected || booking) return;
    setBooking(true);
    setError("");
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lead.statusToken}`,
        },
        body: JSON.stringify({ leadId: lead.leadId, startAt: selected }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409 || response.status === 422) {
          setPending(false);
          setSelected("");
          setSlots((values) => values.filter((s) => s !== selected));
        } else setPending(true);
        setError(
          data.error ||
            "We couldn’t confirm your booking. Retry the same time to check it safely.",
        );
        return;
      }
      if (data.status !== "CONFIRMED" || !data.uid || !data.startAt)
        throw new Error(
          "We couldn’t verify your booking yet. Please retry the same time.",
        );
      track(
        "demo_booking_confirmed",
        { lead_id: lead.leadId, event_id: data.uid },
        `booking:${data.uid}`,
      );
      onConfirmed(data);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "We couldn’t reach the calendar. Retry the same time to check your booking.",
      );
      setPending(true);
    } finally {
      setBooking(false);
    }
  }
  return (
    <div className="google-calendar">
      <div className="calendar-label">
        <span>
          <Icon name="clock" size={15} />
          {config.bookingDuration}-minute live walkthrough
        </span>
        <span>India Standard Time</span>
      </div>
      <div className="calendar-intro">
        <h3>Find your next clear step.</h3>
        <p>
          Pick a time that works for you. We’ll match you with one available
          member of our team. Each time slot can be booked only once across both
          hosts.
        </p>
      </div>
      <label className="calendar-date-label" htmlFor="demo-date">
        Choose a date
      </label>
      <input
        className="calendar-date"
        id="demo-date"
        type="date"
        value={date}
        min={today}
        max={maxDate}
        disabled={booking || pending}
        onChange={(e) => {
          if (e.target.value && e.target.value !== date) {
            resetAvailability();
            setDate(e.target.value);
          }
        }}
      />
      {loading ? (
        <p className="calendar-empty" role="status">
          Checking available times…
        </p>
      ) : slots.length ? (
        <div
          className="calendar-slots"
          role="group"
          aria-label="Available appointment times"
        >
          {slots.map((slot) => (
            <button
              key={slot}
              className="calendar-slot"
              aria-pressed={selected === slot}
              disabled={booking || pending}
              onClick={() => setSelected(slot)}
            >
              {timeLabel(slot)}
            </button>
          ))}
        </div>
      ) : !error ? (
        <p className="calendar-empty" role="status">
          No available times on this date. Please choose another day.
        </p>
      ) : null}
      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      {!loading && !slots.length && error && (
        <button
          className="text-button"
          disabled={booking}
          onClick={() => {
            resetAvailability();
            setRetry((v) => v + 1);
          }}
        >
          Check availability again
          <Icon name="right" size={15} />
        </button>
      )}
      {selected && (
        <div className="calendar-selection">
          <span>
            <Icon name="check" size={16} />
            {new Intl.DateTimeFormat("en-IN", {
              dateStyle: "medium",
              timeZone: "Asia/Kolkata",
            }).format(new Date(selected))}{" "}
            at {timeLabel(selected)}
          </span>
          <button
            className="button"
            onClick={() => void confirm()}
            disabled={booking}
          >
            {booking
              ? "Confirming your booking…"
              : pending
                ? "Check and retry booking"
                : "Confirm my demo"}
            <Icon name="arrow" size={18} />
          </button>
        </div>
      )}
      <p className="form-helper">
        Times are checked against our hosts’ Google Calendars. Your appointment
        is confirmed only after it is added to the assigned host’s calendar.
      </p>
    </div>
  );
}
