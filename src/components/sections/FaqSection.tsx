import { Action } from "../actions/Actions";
import { Icon } from "../ui/Icon";
import { Faq } from "../Faq";
export function FaqSection() {
  return (
    <section id="faqs" className="section faq-section">
      <div className="container faq-layout">
        <div>
          <div className="eyebrow">06 / GOOD QUESTIONS</div>
          <h2>
            A little more
            <br />
            <span>clarity.</span>
          </h2>
          <p className="section-body">
            Everything you need to take
            <br />
            the next step with confidence.
          </p>
          <Action className="text-button">
            Let’s talk
            <Icon name="arrow" size={17} />
          </Action>
        </div>
        <Faq />
      </div>
    </section>
  );
}
