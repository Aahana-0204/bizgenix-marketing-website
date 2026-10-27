import { Action, ActionProvider } from "@/components/actions/Actions";
import { Hero } from "@/components/sections/Hero";
import { Problem } from "@/components/sections/Problem";
import { Features } from "@/components/sections/Features";
import { Industries } from "@/components/sections/Industries";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Proof } from "@/components/sections/Proof";
import { Plans } from "@/components/sections/Plans";
import { Booking } from "@/components/sections/Booking";
import { FaqSection } from "@/components/sections/FaqSection";
import { FinalCta } from "@/components/sections/FinalCta";

import { landing } from "@/content/landing";
import { site } from "@/config/site";
import { Navigation } from "@/components/Navigation";

import { Icon } from "@/components/ui/Icon";
import { Brand } from "@/components/Brand";
import { Tracking } from "@/components/Tracking";

export default function Home() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Bizgenix AI",
      url: site.url,
      ...(site.logo
        ? {
            logo: `${site.url}/brand/bizgenix-logo.${site.logoFormat || "svg"}`,
          }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: landing.brand,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: landing.hero.body,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: landing.faqs.map(([name, text]) => ({
        "@type": "Question",
        name,
        acceptedAnswer: { "@type": "Answer", text },
      })),
    },
  ];
  return (
    <ActionProvider config={site}>
      <Tracking gtmId={site.gtmId} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\u003c"),
        }}
      />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navigation logo={site.logo} logoFormat={site.logoFormat} />
      <main id="main">
        <Hero />
        <Problem />
        <Features />
        <Industries />
        <HowItWorks />
        <Proof />
        <Plans />
        <Booking />
        <FaqSection />
        <FinalCta />
      </main>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-top">
            <Brand logo={site.logo} logoFormat={site.logoFormat} />
            <p>Clarity for your next chapter.</p>
            <a href="#top" className="back-top">
              Back to top
              <Icon name="arrow" size={17} />
            </a>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Bizgenix AI</span>
            <div>
              {site.contactEmail && (
                <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
              )}
              {site.contactPhone && (
                <a href={`tel:${site.contactPhone.replace(/[^+0-9]/g, "")}`}>
                  {site.contactPhone}
                </a>
              )}
              {site.privacyUrl && <a href={site.privacyUrl}>Privacy Policy</a>}
              {site.termsUrl && <a href={site.termsUrl}>Terms</a>}
            </div>
          </div>
          {!site.production &&
            (!site.contactEmail ||
              !site.privacyUrl ||
              !site.termsUrl ||
              !site.logo) && (
              <p className="dev-note">
                Preview TODO:{" "}
                {(!site.logo ? "official SVG · " : "") +
                  (!site.contactEmail ? "contact details · " : "") +
                  (!site.privacyUrl ? "Privacy URL · " : "") +
                  (!site.termsUrl ? "Terms URL" : "")}
              </p>
            )}
        </div>
      </footer>
      <div className="mobile-cta">
        <Action className="button">
          Book Free Demo
          <Icon name="arrow" size={18} />
        </Action>
        <Action kind="start" className="mobile-start">
          Get Started
        </Action>
      </div>
    </ActionProvider>
  );
}
