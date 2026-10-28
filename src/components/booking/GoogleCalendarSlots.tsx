"use client";
import { useEffect, useState } from "react";
import type { PublicSite } from "@/config/site";
import type { LeadResult } from "./DetailsForm";
import type { ConfirmedBooking } from "./BookingModal";
import { indiaDate, nextCandidateDate } from "@/domain/scheduling";
import { Icon } from "../ui/Icon";
import { track } from "@/lib/tracking";
import DetailsForm from "./DetailsForm";

type Slot = { startAt: string; presenter: string };

function isSlot(value: unknown): value is Slot {
  return (
    typeof value === "object" &&
    value !== null &&
    "startAt" in value &&
    typeof value.startAt === "string" &&
    "presenter" in value &&
    typeof value.presenter === "string"
  );
}

function parseSlots(value: unknown): Slot[] {
  if (
    typeof value !== "object" ||
    value === null ||
    !("slots" in value) ||
    !Array.isArray(value.slots) ||
    !value.slots.every(isSlot)
  )
    throw new Error("We couldn’t read the available times. Please try again.");
  return value.slots;
}

function hostName(email: string) {
  const name = email.split("@")[0].replace(/[._-]+/g, " ");
  return name.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const timeLabel = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}-01T12:00:00Z`));
}

function calendarDays(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const offset = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  return [
    ...Array.from({ length: offset }, () => ""),
    ...Array.from(
      { length: count },
      (_, day) =>
        `${year}-${String(monthNumber).padStart(2, "0")}-${String(day + 1).padStart(2, "0")}`,
    ),
  ];
}

function monthOffset(value: string, offset: number) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function GoogleCalendarSlots({
  config,
  onConfirmed,
  onStepChange,
}: {
  config: PublicSite;
  onConfirmed: (booking: ConfirmedBooking) => void;
  onStepChange: (step: number) => void;
}) {
  const [date, setDate] = useState(() =>
    nextCandidateDate(config.bookingRules),
  );
  const [month, setMonth] = useState(() => date.slice(0, 7));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [lead, setLead] = useState<LeadResult | null>(null);
  const [step, setStep] = useState(1);
  const [detailsSubmitted, setDetailsSubmitted] = useState(false);
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
  const days = calendarDays(month);
  const firstMonth = today.slice(0, 7);
  const lastMonth = maxDate.slice(0, 7);

  function resetAvailability() {
    setLoading(true);
    setSlots([]);
    setSelected(null);
    setError("");
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/availability?date=${date}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data: unknown = await response.json();
        if (!response.ok) {
          const message =
            typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
              ? data.error
              : "We couldn’t load available times.";
          throw new Error(message);
        }
        return parseSlots(data);
      })
      .then((available) => {
        if (!controller.signal.aborted) setSlots(available);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Please try again.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [date, retry]);

  async function confirm(result: LeadResult) {
    if (!selected || booking) return;
    setBooking(true);
    setError("");
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${result.statusToken}`,
        },
        body: JSON.stringify({
          leadId: result.leadId,
          startAt: selected.startAt,
          presenter: selected.presenter,
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "We couldn’t confirm your booking. Please try again.";
        if (response.status === 409 || response.status === 422) {
          setPending(false);
          setSlots((current) =>
            current.filter(
              (slot) =>
                slot.startAt !== selected.startAt ||
                slot.presenter !== selected.presenter,
            ),
          );
          setSelected(null);
          onStepChange(1);
        } else {
          setPending(true);
        }
        setError(message);
        return;
      }
      if (
        typeof data !== "object" ||
        data === null ||
        !("status" in data) ||
        data.status !== "CONFIRMED" ||
        !("uid" in data) ||
        typeof data.uid !== "string" ||
        !("startAt" in data) ||
        typeof data.startAt !== "string"
      )
        throw new Error(
          "We couldn’t verify your booking yet. Please retry the same time.",
        );
      const confirmed = {
        status: data.status,
        uid: data.uid,
        startAt: data.startAt,
        timezone:
          "timezone" in data && typeof data.timezone === "string"
            ? data.timezone
            : "Asia/Kolkata",
        presenter: selected.presenter,
        meetingUrl:
          "meetingUrl" in data && typeof data.meetingUrl === "string"
            ? data.meetingUrl
            : undefined,
      };
      track(
        "demo_booking_confirmed",
        { lead_id: result.leadId, event_id: confirmed.uid },
        `booking:${confirmed.uid}`,
      );
      onConfirmed(confirmed);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We couldn’t reach the calendar. Retry the same time to check your booking.",
      );
      setPending(true);
    } finally {
      setBooking(false);
    }
  }

  function continueToDetails() {
    if (!selected) return;
    if (lead) {
      void confirm(lead);
      return;
    }
    setError("");
    setPending(false);
    setStep(2);
    onStepChange(2);
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
      {selected && onStepChange && (
        <div className="calendar-selection-summary">
          <span>
            <strong>{hostName(selected.presenter)}</strong>
            <span>
              {new Intl.DateTimeFormat("en-IN", {
                dateStyle: "medium",
                timeZone: "Asia/Kolkata",
              }).format(new Date(selected.startAt))}
              {" · "}
              {timeLabel(selected.startAt)} IST
            </span>
          </span>
          {onStepChange && (
            <button
              className="text-button"
              disabled={pending || booking}
              onClick={() => {
                setSelected(null);
                setError("");
                setPending(false);
                setStep(1);
                onStepChange(1);
              }}
            >
              Change
            </button>
          )}
        </div>
      )}
      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      {step === 2 && selected ? (
        <div className="calendar-details">
          {detailsSubmitted && lead ? (
            <div className="calendar-retry">
              <p role="status">
                {pending || booking
                  ? `Your details are saved. We’re confirming your selected time with ${hostName(selected!.presenter)}.`
                  : `Your details are saved. Review this time and book it with ${hostName(selected!.presenter)}.`}
              </p>
              <button
                className="button"
                disabled={booking}
                onClick={() => void confirm(lead)}
              >
                {booking
                  ? "Checking your booking…"
                  : pending
                    ? "Check and retry booking"
                    : "Book this time"}
                <Icon name="arrow" size={17} />
              </button>
            </div>
          ) : (
            <DetailsForm
              kind="demo"
              config={config}
              submitLabel={`Book with ${hostName(selected!.presenter)} · ${timeLabel(selected!.startAt)}`}
              onSuccess={(result) => {
                setLead(result);
                setDetailsSubmitted(true);
                setPending(false);
                void confirm(result);
              }}
            />
          )}
        </div>
      ) : (
        <>
          <div className="calendar-intro">
            <h3>Choose an open time.</h3>
            <p>
              See live availability for Khushi and Pranesh. Each appointment is
              booked on the selected host’s calendar.
            </p>
          </div>
          <div className="calendar-booking-layout">
            <section className="calendar-month" aria-label="Choose a date">
              <div className="calendar-month-heading">
                <strong>{monthLabel(month)}</strong>
                <div>
                  <button
                    className="calendar-month-nav"
                    aria-label="Previous month"
                    disabled={month <= firstMonth}
                    onClick={() => setMonth((value) => monthOffset(value, -1))}
                  >
                    <Icon name="right" size={15} />
                  </button>
                  <button
                    className="calendar-month-nav next"
                    aria-label="Next month"
                    disabled={month >= lastMonth}
                    onClick={() => setMonth((value) => monthOffset(value, 1))}
                  >
                    <Icon name="right" size={15} />
                  </button>
                </div>
              </div>
              <div className="calendar-weekdays" aria-hidden="true">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="calendar-days">
                {days.map((value, index) => {
                  if (!value) return <span key={`empty-${index}`} />;
                  const weekday = new Date(`${value}T12:00:00Z`).getUTCDay();
                  const enabled =
                    value >= today &&
                    value <= maxDate &&
                    config.bookingRules.weekdays.includes(weekday) &&
                    !pending &&
                    !booking;
                  return (
                    <button
                      key={value}
                      className="calendar-day"
                      aria-label={new Intl.DateTimeFormat("en-IN", {
                        dateStyle: "full",
                        timeZone: "UTC",
                      }).format(new Date(`${value}T12:00:00Z`))}
                      aria-pressed={value === date}
                      disabled={!enabled}
                      onClick={() => {
                        if (value !== date) {
                          resetAvailability();
                          setSelected(null);
                          setStep(1);
                          onStepChange(1);
                          setDate(value);
                        }
                      }}
                    >
                      {Number(value.slice(-2))}
                    </button>
                  );
                })}
              </div>
              <p className="calendar-timezone">
                <Icon name="clock" size={14} />
                Times shown in India Standard Time
              </p>
            </section>
            <section
              className="calendar-times"
              role="group"
              aria-label="Available appointment times"
            >
              <h4>
                {new Intl.DateTimeFormat("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  timeZone: "UTC",
                }).format(new Date(`${date}T12:00:00Z`))}
              </h4>
              {loading ? (
                <p className="calendar-empty" role="status">
                  Checking live availability…
                </p>
              ) : error && slots.length === 0 ? (
                <div className="calendar-empty">
                  <p>No times are available right now.</p>
                  <button
                    className="text-button"
                    onClick={() => {
                      resetAvailability();
                      setRetry((value) => value + 1);
                    }}
                  >
                    Check availability again
                    <Icon name="right" size={15} />
                  </button>
                </div>
              ) : slots.length ? (
                <div className="calendar-slots" role="group">
                  {slots.map((slot) => (
                    <button
                      key={`${slot.startAt}:${slot.presenter}`}
                      className="calendar-slot"
                      aria-pressed={
                        selected?.startAt === slot.startAt &&
                        selected.presenter === slot.presenter
                      }
                      disabled={pending || booking}
                      onClick={() => {
                        setSelected(slot);
                        setError("");
                      }}
                    >
                      <strong>{timeLabel(slot.startAt)}</strong>
                      <span>with {hostName(slot.presenter)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="calendar-empty" role="status">
                  No available times on this date. Please choose another day.
                </p>
              )}
            </section>
          </div>
          {selected && (
            <div className="calendar-selection">
              <span>
                <Icon name="check" size={16} />
                {timeLabel(selected.startAt)} with{" "}
                {hostName(selected.presenter)}
              </span>
              <button
                className="button"
                onClick={continueToDetails}
                disabled={booking || pending}
              >
                {booking
                  ? "Confirming your booking…"
                  : lead
                    ? "Book this time"
                    : `Continue with ${hostName(selected.presenter)}`}
                <Icon name="arrow" size={18} />
              </button>
            </div>
          )}
          <p className="form-helper">
            Your meeting is added to the selected host’s Google Calendar and
            confirmed by email.
          </p>
        </>
      )}
    </div>
  );
}
