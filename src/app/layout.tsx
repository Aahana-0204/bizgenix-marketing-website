import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { BookingProvider } from "@/features/booking/BookingProvider";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";
import "./globals.css";

const geistSans = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const geistMono = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "BizGenix AI Solutions | AI That Takes Work Off Your Desk.", template: "%s | BizGenix AI Solutions" },
  description: "Practical AI solutions for growing businesses. Explore Growth Intelligence, CRM, ScaleOS, Voice AI, and BizChat, or book a free business review.",
  openGraph: { title: "BizGenix AI Solutions", description: "AI That Takes Work Off Your Desk.", type: "website", locale: "en_IN", siteName: "BizGenix AI Solutions" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body><a className="skip-link" href="#main-content">Skip to content</a><BookingProvider><Navbar />{children}<Footer /></BookingProvider><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: "BizGenix AI Solutions", url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000", slogan: "AI That Takes Work Off Your Desk." }).replace(/</g, "\\u003c") }} /></body>
    </html>
  );
}
