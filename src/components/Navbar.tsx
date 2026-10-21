"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { BookButton } from "@/features/booking/BookingProvider";
export const navigation = [["About", "/about"], ["Custom Solution", "/custom-solution"], ["Product", "/product"], ["Learning", "/learning"], ["Case Study", "/case-study"], ["Insights", "/insights"], ["Contact Us", "/contact"]] as const;
export function Navbar() {
  const [open, setOpen] = useState(false);
  return <header className="nav-shell"><nav className="navbar" aria-label="Main navigation"><Link href="/" className="brand" aria-label="BizGenix home"><span className="brand-mark" aria-hidden="true">b<span>✦</span></span><span>bizgenix<span className="brand-dot">.</span><small>AI SOLUTIONS</small></span></Link><div className="desktop-links">{navigation.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}</div><div className="nav-actions"><BookButton>Book a Demo <ArrowUpRight size={15} /></BookButton><button className="icon-button mobile-toggle" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div></nav>{open && <div id="mobile-navigation" className="mobile-links" onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}>{navigation.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}<ArrowUpRight size={16} /></Link>)}</div>}</header>;
}
