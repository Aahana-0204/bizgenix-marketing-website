"use client";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import Cal, { getCalApi, type EmbedEvent } from "@calcom/embed-react";
import type { PublicSite } from "@/config/site";
import type { ValidLead } from "@/shared/schemas";
import type { LeadResult } from "./DetailsForm";
import type { ConfirmedBooking } from "./BookingModal";
import { track } from "@/lib/tracking";
import { Icon } from "../ui/Icon";
export default function CalEmbed({
  config,
  lead,
  onConfirmed,
}: {
  config: PublicSite;
  lead: { result: LeadResult; data: ValidLead };
  onConfirmed: (booking: ConfirmedBooking) => void;
}) {
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false),
    [confirming, setConfirming] = useState(false),
    [message, setMessage] = useState("");
  const mounted = useRef(true),
    polling = useRef(false),
    abort = useRef<AbortController | null>(null);
  const callback = useRef(onConfirmed);
  useEffect(() => {
    callback.current = onConfirmed;
  }, [onConfirmed]);
  const namespace = `crm-${lead.result.leadId.replace(/[^a-z0-9]/gi, "")}`;
  const embedConfig = useMemo(
    () => ({
      name: lead.data.full_name,
      email: lead.data.work_email,
      phone: lead.data.mobile,
      notes: `${lead.data.company_name} | ${lead.data.key_challenge || "CRM demo"} | Lead reference: ${lead.result.leadId}`,
      "metadata[leadId]": lead.result.leadId,
      timezone: "Asia/Kolkata",
      layout: "month_view" as const,
      theme: "light" as const,
    }),
    [lead],
  );
  const poll = useCallback(
    async (expectedUid?: string) => {
      if (polling.current) return;
      polling.current = true;
      setConfirming(true);
      setMessage("We’re confirming your booking…");
      const started = Date.now();
      abort.current = new AbortController();
      try {
        while (mounted.current && Date.now() - started < 30000) {
          const response = await fetch(
            `/api/bookings/status?leadId=${encodeURIComponent(lead.result.leadId)}`,
            {
              headers: { Authorization: `Bearer ${lead.result.statusToken}` },
              cache: "no-store",
              signal: abort.current.signal,
            },
          );
          if (!response.ok) throw new Error("status");
          const data = await response.json();
          if (
            (data.status === "CONFIRMED" || data.status === "RESCHEDULED") &&
            data.uid &&
            (!expectedUid || expectedUid === data.uid)
          ) {
            track(
              "demo_booking_confirmed",
              { lead_id: lead.result.leadId, event_id: data.uid },
              `booking:${data.uid}`,
            );
            callback.current(data);
            return;
          }
          if (data.status === "CANCELLED") {
            setMessage(
              "That booking was cancelled. Please choose another available time.",
            );
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        if (mounted.current)
          setMessage(
            "Check your email for confirmation. If it hasn’t arrived, use Check confirmation again or choose another available time.",
          );
      } catch {
        if (mounted.current)
          setMessage(
            "We couldn’t check the booking yet. Check your email or try Check confirmation again.",
          );
      } finally {
        polling.current = false;
        if (mounted.current) setConfirming(false);
      }
    },
    [lead.result],
  );
  useEffect(() => {
    mounted.current = true;
    if (!config.calLink) return;
    let off: (() => void) | undefined;
    const timeout = setTimeout(() => {
      if (mounted.current) setFailed(true);
    }, 18000);
    getCalApi({ namespace })
      .then((cal) => {
        if (!mounted.current) return;
        const success = (event: EmbedEvent<"bookingSuccessfulV2">) => {
          void poll(event.detail.data.uid);
        };
        const load = () => {
          setReady(true);
          setFailed(false);
          clearTimeout(timeout);
        };
        const fail = () => {
          setFailed(true);
          clearTimeout(timeout);
        };
        cal("ui", {
          theme: "light",
          layout: "month_view",
          cssVarsPerTheme: {
            light: { "cal-brand": "#2e7d52" },
            dark: { "cal-brand": "#5aa86b" },
          },
        });
        cal("on", { action: "bookingSuccessfulV2", callback: success });
        cal("on", { action: "linkReady", callback: load });
        cal("on", { action: "linkFailed", callback: fail });
        off = () => {
          cal("off", { action: "bookingSuccessfulV2", callback: success });
          cal("off", { action: "linkReady", callback: load });
          cal("off", { action: "linkFailed", callback: fail });
        };
      })
      .catch(() => setFailed(true));
    return () => {
      mounted.current = false;
      clearTimeout(timeout);
      abort.current?.abort();
      off?.();
    };
  }, [namespace, poll, config.calLink]);
  if (!config.calLink)
    return (
      <div className="calendar-confirm">
        <strong>Your details are saved.</strong>
        <p>
          The calendar isn’t configured in this preview. No meeting has been
          booked. Add NEXT_PUBLIC_CALCOM_LINK and the signed webhook to enable
          scheduling.
        </p>
      </div>
    );
  return (
    <div className="calendar-shell">
      <div className="calendar-label">
        <span>
          <Icon name="clock" size={14} />
          20-minute live walkthrough
        </span>
        <span>Asia/Kolkata · India Standard Time</span>
      </div>
      {!ready && !failed && (
        <div
          className="calendar-skeleton"
          role="status"
          aria-label="Loading available appointment times"
        >
          <span />
          <div className="skeleton-grid">
            {Array.from({ length: 28 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
        </div>
      )}
      <Cal
        className="calendar-embed"
        namespace={namespace}
        calLink={config.calLink}
        config={embedConfig}
      />
      {message && (
        <p className="calendar-confirm" role="status">
          {message}
        </p>
      )}
      <div className="calendar-fallback">
        {failed
          ? "Calendar blocked or slow to load? "
          : "Prefer to open the calendar separately? "}
        <a
          href={`https://cal.com/${config.calLink}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open the booking page
          <Icon name="arrow" size={11} />
        </a>
        <br />
        If a time is no longer available, select another slot in the calendar.
        <br />
        <button
          className="text-button"
          onClick={() => void poll()}
          disabled={confirming}
        >
          {confirming
            ? "Checking confirmation…"
            : "I completed my booking ? Check confirmation"}
        </button>
      </div>
    </div>
  );
}
