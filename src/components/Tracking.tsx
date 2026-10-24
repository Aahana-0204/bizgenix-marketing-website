"use client";
import Script from "next/script";
import { useEffect, useState } from "react";
import {
  changeConsent,
  consentChoice,
  attribution,
  type Consent,
} from "@/lib/tracking";
import { Icon } from "./ui/Icon";
export function Tracking({ gtmId }: { gtmId?: string }) {
  const [choice, setChoice] = useState<Consent | null | undefined>(undefined);
  const [settings, setSettings] = useState(false);
  useEffect(() => {
    const sync = () => setChoice(consentChoice());
    sync();
    attribution();
    window.addEventListener("bizgenix-consent", sync);
    return () => window.removeEventListener("bizgenix-consent", sync);
  }, []);
  function choose(value: Consent) {
    changeConsent(value);
    setChoice(value);
    setSettings(false);
  }
  return (
    <>
      {gtmId && choice === "accepted" && (
        <Script
          id="gtm"
          strategy="afterInteractive"
        >{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}</Script>
      )}
      {(choice === null || settings) && (
        <aside className="cookie-banner" aria-label="Cookie preferences">
          <div className="cookie-copy">
            <h2>A little choice. Your privacy.</h2>
            <p>
              We use essential functionality to handle your enquiry. With your
              permission, analytics and advertising cookies help us understand
              visits and improve our campaigns. You can change your choice at
              any time.
            </p>
          </div>
          <div className="cookie-actions">
            <button onClick={() => choose("accepted")}>Accept</button>
            <button onClick={() => choose("rejected")}>Reject</button>
          </div>
        </aside>
      )}
      {choice && (
        <button
          className="cookie-settings"
          onClick={() => setSettings(true)}
          aria-label="Change cookie preferences"
        >
          <Icon name="shield" size={18} />
        </button>
      )}
    </>
  );
}
