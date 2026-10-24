import { landing } from "@/content/landing";
import { site } from "@/config/site";
import { Icon } from "../ui/Icon";
import { Dashboard } from "../Dashboard";
import { Buttons } from "./Buttons";
import Image from "next/image";
export function Hero() {
  return (
    <section className="hero story" id="top">
      <div className="hero-glow" />
      <div className="container hero-content">
        <div className="eyebrow">
          <span className="live-dot" />
          {landing.hero.eyebrow}
        </div>
        <h1>
          Leads Are Coming In.
          <br />
          <span>Are They Moving Forward?</span>
        </h1>
        <p className="hero-description">{landing.hero.body}</p>
        <Buttons />
        <p className="hero-note">
          <Icon name="shield" size={15} />
          {landing.hero.note}
        </p>
        <div className="hero-product">
          <div className="product-label">
            <span>YOUR SALES. ONE CLEAR PICTURE.</span>
            <span>
              <i /> Illustrative workspace
            </span>
          </div>
          {site.dashboard ? (
            <Image
              src="/product/dashboard.webp"
              alt="Bizgenix AI CRM dashboard"
              width={1440}
              height={900}
              priority
              sizes="(max-width: 768px) 95vw, 1050px"
            />
          ) : (
            <Dashboard />
          )}
          <div className="floating-note">
            <span className="note-icon">
              <Icon name="check" size={17} />
            </span>
            <div>
              Every conversation.<strong>A clear next step.</strong>
            </div>
            <Icon name="sparkles" size={19} />
          </div>
        </div>
        <a href="#why-bizgenix" className="scroll-hint">
          A better way to follow through
          <Icon name="down" size={15} />
        </a>
      </div>
    </section>
  );
}
