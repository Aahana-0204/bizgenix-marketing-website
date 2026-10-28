"use client";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import dynamic from "next/dynamic";
import type { PublicSite } from "@/config/site";
import { formContent as copy } from "@/content/landing";
import type { ValidLead } from "@/shared/schemas";
import DetailsForm, { type LeadResult } from "./DetailsForm";
import { Icon } from "../ui/Icon";
const CalEmbed = dynamic(() => import("./CalEmbed"), {
  ssr: false,
  loading: () => (
    <div className="loading-modal" role="status">
      Loading available times…
    </div>
  ),
});
const GoogleCalendarSlots = dynamic(() => import("./GoogleCalendarSlots"), {
  ssr: false,
  loading: () => (
    <div className="loading-modal" role="status">
      Loading available times…
    </div>
  ),
});
export type ConfirmedBooking = {
  status: string;
  startAt: string;
  timezone: string;
  presenter?: string;
  meetingUrl?: string;
  uid: string;
};
export default function BookingModal({
  kind,
  plan,
  config,
}: {
  kind: "demo" | "plan";
  plan?: string;
  config: PublicSite;
}) {
  const [lead, setLead] = useState<{
    result: LeadResult;
    data: ValidLead;
  } | null>(null);
  const [booking, setBooking] = useState<ConfirmedBooking | null>(null);
  const [step, setStep] = useState(1);
  const googleBooking =
    kind === "demo" && config.schedulingProvider === "google";
  const stepLabels = googleBooking
    ? ["Choose a time", "Your details", "You’re booked"]
    : ["Your details", "Pick a time", "You’re booked"];
  return (
    <>
      <div className="eyebrow modal-eyebrow">
        BIZGENIX AI CRM / {kind === "demo" ? "YOUR NEXT STEP" : "PLAN ENQUIRY"}
      </div>
      <Dialog.Title className="modal-title">
        {kind === "demo" ? copy.bookingTitle : copy.planTitle}
      </Dialog.Title>
      <Dialog.Description id="modal-description" className="modal-description">
        {kind === "demo" ? copy.bookingSubtitle : copy.planSubtitle}
      </Dialog.Description>
      {kind === "demo" && (
        <ol className="stepper" aria-label="Booking progress">
          {stepLabels.map((label, i) => (
            <li
              key={label}
              className={step === i + 1 ? "active" : ""}
              aria-current={step === i + 1 ? "step" : undefined}
            >
              0{i + 1} {label}
            </li>
          ))}
        </ol>
      )}
      {booking ? (
        <div className="success-panel" role="status">
          <div className="success-icon">
            <Icon name="success" size={34} />
          </div>
          <h3>You’re booked.</h3>
          <p>
            {booking.presenter
              ? `Your meeting with ${hostName(booking.presenter)} is confirmed. Google Calendar sends an invitation to your email.`
              : config.schedulingProvider === "google"
                ? "Your appointment is confirmed. Google Calendar sends an invitation to your email. Contact the organizer through the invitation if you need to change your time."
                : "Your booking is confirmed. Cal.com sends the confirmation and cancellation or rescheduling details to your email."}
          </p>
          <div className="meeting-detail">
            {new Intl.DateTimeFormat("en-IN", {
              dateStyle: "full",
              timeStyle: "short",
              timeZone: "Asia/Kolkata",
            }).format(new Date(booking.startAt))}
            <br />
            Asia/Kolkata (India Standard Time)
          </div>
          {booking.meetingUrl && (
            <a
              className="button"
              href={booking.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Meeting link
              <Icon name="arrow" size={17} />
            </a>
          )}
        </div>
      ) : googleBooking ? (
        <GoogleCalendarSlots
          config={config}
          onConfirmed={(confirmed) => {
            setStep(3);
            setBooking(confirmed);
          }}
          onStepChange={setStep}
        />
      ) : !lead ? (
        <DetailsForm
          kind={kind}
          plan={plan}
          config={config}
          onSuccess={(result, data) => {
            setStep(2);
            setLead({ result, data });
          }}
        />
      ) : kind === "plan" ? (
        <div className="success-panel" role="status">
          <div className="success-icon">
            <Icon name="success" size={34} />
          </div>
          <h3>
            {lead.result.preview
              ? "Your preview enquiry was saved."
              : copy.planSuccess}
          </h3>
          <p>
            {lead.result.preview
              ? "This is a local preview. No email or CRM notification was sent."
              : "We’ll review your requirements and get in touch using the details you shared."}
          </p>
          <Dialog.Close className="button secondary">
            Back to exploring
            <Icon name="right" size={17} />
          </Dialog.Close>
        </div>
      ) : config.schedulingProvider === "google" ? (
        <p className="calendar-empty" role="status">
          Choose a time to see available appointments.
        </p>
      ) : (
        <CalEmbed config={config} lead={lead} onConfirmed={setBooking} />
      )}
    </>
  );
}

function hostName(email: string) {
  const name = email.split("@")[0].replace(/[._-]+/g, " ");
  return name.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
