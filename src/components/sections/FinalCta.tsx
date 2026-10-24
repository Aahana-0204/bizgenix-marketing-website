import { landing } from "@/content/landing";
import { Buttons } from "./Buttons";
export function FinalCta() {
  return (
    <section className="final-section story">
      <div className="container">
        <div className="eyebrow">MAKE FOLLOW-THROUGH YOUR ADVANTAGE.</div>
        <h2>{landing.final.title}</h2>
        <p>{landing.final.body}</p>
        <Buttons />
        <div className="final-decoration" aria-hidden="true">
          Follow through.
        </div>
      </div>
    </section>
  );
}
