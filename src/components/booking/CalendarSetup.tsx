"use client";
import { useEffect, useState } from "react";
import { Icon } from "../ui/Icon";
import Link from "next/link";
export function CalendarSetup({
  duration,
  startHour,
  endHour,
  initialStatus,
}: {
  duration: number;
  startHour: number;
  endHour: number;
  initialStatus?: string;
}) {
  const timeLabel = (hour: number) => {
    const whole = Math.floor(hour);
    return `${whole % 12 || 12}:${hour % 1 ? "30" : "00"} ${whole >= 12 && whole < 24 ? "PM" : "AM"}`;
  };
  const [key, setKey] = useState("");
  const [hosts, setHosts] = useState<
    Array<{ email: string; connected: boolean }>
  >([]);
  const [message, setMessage] = useState(() =>
    initialStatus
      ? initialStatus === "connected"
        ? "Google Calendar connected. Unlock setup to check both hosts."
        : "The calendar could not be connected. Select the approved Google account and grant both calendar permissions, then try again."
      : "",
  );
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(location.search).has("status")) {
      history.replaceState(null, "", location.pathname);
    }
  }, []);
  async function call(email?: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/calendar/google/connect", {
        method: email ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${key}`,
          ...(email ? { "Content-Type": "application/json" } : {}),
        },
        ...(email ? { body: JSON.stringify({ email }) } : {}),
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Setup is unavailable.");
      if (email) {
        setKey("");
        location.assign(data.url);
      } else setHosts(data.hosts);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="calendar-setup">
      <div className="calendar-setup-card">
        <Link href="/" className="text-button">
          <Icon name="right" size={16} />
          Back to Bizgenix
        </Link>
        <div className="eyebrow">HOST CALENDAR SETUP</div>
        <h1>Connect your demo calendars.</h1>
        <p>
          Each host connects their own Google account. Visitors will be offered
          times when either host is available, and one host is assigned to each
          appointment.
        </p>
        <p className="form-alert info">
          Slots are generated automatically: {timeLabel(startHour)}–
          {timeLabel(endHour)} IST, {duration} minutes each. Connected hosts are
          ready for bookings; Google Calendar busy times are excluded. Reconnect
          is only needed to renew Google access.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void call();
          }}
        >
          <label className="field">
            Calendar setup key
            <input
              type="password"
              autoComplete="off"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
            />
          </label>
          <button className="button" disabled={busy || !key}>
            Unlock calendar setup
            <Icon name="arrow" size={17} />
          </button>
        </form>
        {message && (
          <p role="status" className="form-alert info">
            {message}
          </p>
        )}
        <div className="calendar-hosts">
          {hosts.map((host) => (
            <article key={host.email}>
              <div>
                <strong>{host.email}</strong>
                <span>
                  {host.connected
                    ? "Connected to Google Calendar"
                    : "Not connected yet"}
                </span>
              </div>
              <button
                className="button secondary"
                disabled={busy || !key}
                onClick={() => void call(host.email)}
              >
                {host.connected ? "Reconnect" : "Connect Google"}
                <Icon name="arrow" size={16} />
              </button>
            </article>
          ))}
        </div>
        <p className="form-helper">
          Connect the primary calendar used for sales meetings. The setup key
          stays in this browser tab and is cleared before Google authorization.
        </p>
      </div>
    </main>
  );
}
