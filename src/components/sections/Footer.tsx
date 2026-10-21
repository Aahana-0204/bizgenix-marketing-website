import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BookButton } from "@/features/booking/BookingProvider";
import { navigation } from "../Navbar";
export function Footer() {
  return <><section className="final-cta section-dark"><div className="container"><p className="eyebrow">YOUR NEXT CHAPTER, WITH LESS BUSYWORK</p><h2>Big ambitions.<br /><span>A little more breathing room.</span></h2><p>Let’s find the work AI can take off your desk.</p><BookButton className="button lime">Book a Free Business Review <ArrowUpRight size={18} /></BookButton><span className="cta-note">30 minutes · No obligation · Built around your business</span></div></section><footer><div className="container footer-grid"><div><Link href="/" className="brand">bizgenix<span className="brand-dot">.</span></Link><p>Practical AI. Real possibilities.<br />More room for the work that matters.</p></div><div className="footer-links">{navigation.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</div><div><span className="eyebrow">LET’S BUILD SOMETHING BETTER</span><Link className="footer-contact" href="/contact">Start a conversation ↗</Link><p>Built for ambitious businesses.</p></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} BizGenix AI Solutions</span><span>AI That Takes Work Off Your Desk.</span></div></footer></>;
}
