import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import { site } from "@/config/site";
import "./globals.css";
const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  display: "swap",
  variable: "--font-inter",
  weight: "100 900",
});
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: "Bizgenix AI CRM | Leads, Pipeline & Better Follow-Through",
  description:
    "Bring customer enquiries, sales activities and follow-ups into one organized workspace. Explore Bizgenix AI CRM with a free live demo.",
  alternates: { canonical: "/" },
  robots: { index: site.production, follow: site.production },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Bizgenix AI CRM",
    title: "Leads Are Coming In. Are They Moving Forward?",
    description:
      "One organized workspace for your leads, pipeline and follow-ups.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bizgenix AI CRM",
    description: "Your next sales opportunity deserves a clear next step.",
  },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={inter.variable}>
      <body>
        <Script
          id="consent-default"
          strategy="beforeInteractive"
        >{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});try{if(localStorage.getItem('bizgenix-consent-v1')==='accepted')gtag('consent','update',{ad_storage:'granted',analytics_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'});}catch(e){}`}</Script>
        {children}
      </body>
    </html>
  );
}
