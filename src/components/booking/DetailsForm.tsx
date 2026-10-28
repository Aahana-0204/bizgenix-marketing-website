"use client";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadSchema, type LeadInput, type ValidLead } from "@/shared/schemas";
import { formContent as copy } from "@/content/landing";
import type { PublicSite } from "@/config/site";
import { attribution, consentChoice, track } from "@/lib/tracking";
import { FormSelect } from "../ui/FormSelect";
import { Icon } from "../ui/Icon";
export type LeadResult = {
  leadId: string;
  statusToken: string;
  preview: boolean;
};
export default function DetailsForm({
  kind,
  plan,
  config,
  submitLabel,
  onSuccess,
}: {
  kind: "demo" | "plan";
  plan?: string;
  config: PublicSite;
  submitLabel?: string;
  onSuccess: (result: LeadResult, data: ValidLead) => void;
}) {
  const [failure, setFailure] = useState("");
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LeadInput, unknown, ValidLead>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      kind: kind === "demo" ? "DEMO_BOOKING" : "PLAN_ENQUIRY",
      interested_in: "AI CRM",
      plan_interest: (copy.plans.includes(plan as (typeof copy.plans)[number])
        ? plan
        : "Not sure yet") as LeadInput["plan_interest"],
      consent: false,
      website: "",
      mobile: "",
    },
  });
  async function submit(data: ValidLead) {
    setFailure("");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          attribution: attribution(),
          analytics_consent: consentChoice() === "accepted",
        }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || "We couldn’t save your enquiry. Please try again.",
        );
      track(
        "generate_lead",
        { lead_id: result.leadId, kind: data.kind, event_id: result.eventId },
        `lead:${result.eventId}`,
      );
      onSuccess(result, data);
    } catch (error) {
      setFailure(
        error instanceof Error && error.name !== "TimeoutError"
          ? error.message
          : "The connection took too long. Please try again.",
      );
    }
  }
  const error = (name: keyof LeadInput) => errors[name]?.message?.toString();
  function text(name: "full_name" | "company_name" | "work_email" | "mobile") {
    return (
      <div className="field" key={name}>
        <label htmlFor={name}>
          {copy[name]} <span>*</span>
        </label>
        <input
          id={name}
          {...register(name)}
          autoComplete={
            {
              full_name: "name",
              company_name: "organization",
              work_email: "email",
              mobile: "tel-national",
            }[name]
          }
          type={
            name === "work_email" ? "email" : name === "mobile" ? "tel" : "text"
          }
          inputMode={name === "mobile" ? "tel" : undefined}
          placeholder={name === "mobile" ? "+91" : ""}
          aria-required="true"
          aria-invalid={Boolean(error(name))}
          aria-describedby={error(name) ? `${name}-error` : undefined}
        />
        {error(name) && (
          <p id={`${name}-error`} className="field-error">
            {error(name)}
          </p>
        )}
      </div>
    );
  }
  function select(
    name: "industry" | "team_size" | "interested_in" | "plan_interest",
    options: readonly string[],
    wide = false,
  ) {
    return (
      <div className={`field ${wide ? "wide" : ""}`} key={name}>
        <label htmlFor={name}>
          {copy[name]} <span>*</span>
        </label>
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <FormSelect
              id={name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              options={options}
              invalid={Boolean(error(name))}
              describedBy={error(name) ? `${name}-error` : undefined}
            />
          )}
        />
        {error(name) && (
          <p className="field-error" id={`${name}-error`}>
            {error(name)}
          </p>
        )}
      </div>
    );
  }
  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      {config.preview && (
        <p className="form-alert info">
          Preview mode: details are stored only in this server session. CRM
          delivery and email are not active.
        </p>
      )}
      <div className="form-grid">
        {text("company_name")}
        {text("full_name")}
        {text("work_email")}
        {text("mobile")}
        {kind === "plan" && (
          <>
            {select("plan_interest", copy.plans)}
            {select("team_size", copy.teamSizes)}
          </>
        )}
        {kind === "plan" && (
          <div className="field wide">
            <label htmlFor="key_challenge">{copy.key_challenge}</label>
            <textarea
              id="key_challenge"
              {...register("key_challenge")}
              placeholder={copy.placeholder}
              maxLength={2000}
              aria-invalid={Boolean(error("key_challenge"))}
              aria-describedby={
                error("key_challenge") ? "key_challenge-error" : undefined
              }
            />
            {error("key_challenge") && (
              <p className="field-error" id="key_challenge-error">
                {error("key_challenge")}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">Website (leave empty)</label>
        <input
          id="website"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>
      <div className="consent-field">
        <input
          type="checkbox"
          id="contact-consent"
          {...register("consent")}
          aria-invalid={Boolean(error("consent"))}
          aria-describedby={error("consent") ? "consent-error" : undefined}
        />
        <label htmlFor="contact-consent">
          I agree to be contacted about my enquiry and have read the{" "}
          {config.privacyUrl ? (
            <a
              href={config.privacyUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
          ) : (
            <>Privacy Policy{!config.production && " (TODO: approved URL)"}</>
          )}
          .
        </label>
      </div>
      {error("consent") && (
        <p className="field-error" id="consent-error">
          {error("consent")}
        </p>
      )}
      <div role="alert" aria-live="polite">
        {failure && <p className="form-alert">{failure}</p>}
      </div>
      <p className="form-helper">{copy.helper}</p>
      <button
        className="button form-submit"
        disabled={isSubmitting || (config.production && !config.privacyUrl)}
        type="submit"
      >
        {isSubmitting
          ? kind === "demo"
            ? "Confirming your booking…"
            : "Saving your enquiry…"
          : submitLabel ||
            (kind === "demo" ? copy.submitDemo : copy.submitPlan)}
        <Icon name="arrow" size={17} />
      </button>
    </form>
  );
}
