import { landing } from "@/content/landing";
import { Action } from "../actions/Actions";
import { Icon } from "../ui/Icon";
export function Booking() {
  return (
    <section id="demo" className="section booking-section">
      <div className="container booking-card">
        <div>
          <div className="eyebrow">SEE IT. ASK QUESTIONS. EXPLORE THE FIT.</div>
          <h2>{landing.booking.title}</h2>
          <p>{landing.booking.body}</p>
        </div>
        <div className="booking-actions">
          <Action className="button">
            Book Free Demo
            <Icon name="arrow" />
          </Action>
          <Action kind="plan" className="text-button">
            Ask About Pricing
            <Icon name="arrow" size={15} />
          </Action>
        </div>
      </div>
    </section>
  );
}
