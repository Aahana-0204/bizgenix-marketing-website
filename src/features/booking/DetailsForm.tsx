"use client";
import { useForm } from "react-hook-form";
import { Building2, Mail, Phone, User } from "lucide-react";
import { detailsSchema, interests, type BookingDetails } from "@/shared/schemas";
export function DetailsForm({ initial, onNext }: { initial?: BookingDetails; onNext: (data: BookingDetails) => void }) {
  const { register, handleSubmit, setError, formState: { errors } } = useForm<BookingDetails>({ defaultValues: initial ?? { mobile: "+91", interest: "Custom solution", website: "" } });
  const fields = [{ key: "companyName", title: "Company name", icon: Building2, autoComplete: "organization" }, { key: "fullName", title: "Full name", icon: User, autoComplete: "name" }, { key: "email", title: "Work email", icon: Mail, autoComplete: "email" }, { key: "mobile", title: "Mobile (+91)", icon: Phone, autoComplete: "tel" }] as const;
  return <form noValidate onSubmit={handleSubmit(data => { const result = detailsSchema.safeParse(data); if (result.success) onNext(result.data); else for (const issue of result.error.issues) setError(issue.path[0] as keyof BookingDetails, { message: issue.message }); })}>
    <div className="form-grid">{fields.map(({ key, title, icon: Icon, autoComplete }) => <div key={key}><label htmlFor={key}>{title} <span>*</span></label><div className="input-wrap"><Icon size={17} /><input id={key} {...register(key)} autoComplete={autoComplete} type={key === "email" ? "email" : key === "mobile" ? "tel" : "text"} aria-required="true" aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${key}-error` : undefined} /></div>{errors[key] && <p id={`${key}-error`} className="field-error">{errors[key]?.message}</p>}</div>)}</div>
    <label htmlFor="interest">I’m interested in <span>*</span></label><select id="interest" {...register("interest")}>{interests.map(interest => <option key={interest}>{interest}</option>)}</select>
    <label htmlFor="message">Anything we should know?</label><textarea id="message" rows={3} maxLength={2000} {...register("message")} placeholder="Tell us where work gets in the way." />{errors.message && <p className="field-error">{errors.message.message}</p>}
    <div className="honeypot" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" tabIndex={-1} autoComplete="off" {...register("website")} /></div>
    <p className="fine-print">We’ll use your details to arrange your review and send a confirmation.</p><button className="button full" type="submit">Get your slot booked <span aria-hidden="true">↗</span></button>
  </form>;
}
