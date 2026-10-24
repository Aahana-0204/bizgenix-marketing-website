import { landing } from "@/content/landing";
import { Icon } from "../ui/Icon";
export function HowItWorks() {
  return (
    <section id="how-it-works" className="section process-section">
      <div className="container">
        <div className="center-heading">
          <div className="eyebrow">04 / A CONNECTED SALES JOURNEY</div>
          <h2>{landing.process.title}</h2>
        </div>
        <div className="process-grid">
          {landing.process.steps.map(([title, body], i) => (
            <article key={title}>
              <div className="process-number">
                <span>0{i + 1}</span>
                <Icon name="right" size={18} />
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
