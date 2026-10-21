import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { BookButton } from "@/features/booking/BookingProvider";
export const metadata: Metadata = { title: "Contact", description: "Tell BizGenix about your business, ask a question, or book a free business review.", alternates: { canonical: "/contact" } };
export default function ContactPage() { return <main id="main-content" className="section section-mint"><div className="container contact-grid"><div className="contact-intro"><p className="eyebrow">LET’S START A CONVERSATION</p><h1>What’s taking up<br />your time?</h1><p>Tell us about your business and the work you’d like to make easier. We’ll help you explore a practical next step.</p><h2>Prefer to talk it through?</h2><p>Pick a time for a free, 30-minute business review.</p><BookButton>Book a Free Business Review ↗</BookButton></div><ContactForm /></div></main>; }
