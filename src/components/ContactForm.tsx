"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { contactSchema } from "@/shared/schemas";
import { api } from "@/lib/ApiClient";
type Fields = { fullName: string; email: string; message: string; website: string };
export function ContactForm() {
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm<Fields>();
  const [status, setStatus] = useState("");
  return <form className="contact-form card" noValidate onSubmit={handleSubmit(async values => { setStatus(""); const result = contactSchema.safeParse(values); if (!result.success) { for (const issue of result.error.issues) setError(issue.path[0] as keyof Fields, { message: issue.message }); return; } try { await api.request("/api/contact", { method: "POST", body: JSON.stringify(result.data) }); reset(); setStatus("Thanks. Your message has been received."); } catch (error) { setStatus(error instanceof Error ? error.message : "Please try again."); } })}><label htmlFor="contact-name">Full name <span>*</span></label><input id="contact-name" autoComplete="name" aria-required="true" {...register("fullName")} />{errors.fullName && <p className="field-error">{errors.fullName.message}</p>}<label htmlFor="contact-email">Work email <span>*</span></label><input id="contact-email" type="email" autoComplete="email" aria-required="true" {...register("email")} />{errors.email && <p className="field-error">{errors.email.message}</p>}<label htmlFor="contact-message">How can we help? <span>*</span></label><textarea id="contact-message" rows={5} aria-required="true" {...register("message")} />{errors.message && <p className="field-error">{errors.message.message}</p>}<div className="honeypot" aria-hidden="true"><input tabIndex={-1} autoComplete="off" aria-label="Website" {...register("website")} /></div><p className="fine-print">Your details will be used to respond to this enquiry.</p><button className="button" disabled={isSubmitting}>{isSubmitting ? "Sending…" : "Send your message ↗"}</button>{status && <p role="status">{status}</p>}</form>;
}
