import { landing } from "@/content/landing";
import { Action } from "../actions/Actions";
import { Icon } from "../ui/Icon";
export function Plans() {
  return (
    <section id="plans" className="section plans-section">
      <div className="container">
        <div className="center-heading">
          <div className="eyebrow">05 / ROOM TO GROW</div>
          <h2>{landing.plans.title}</h2>
          <p className="section-body">{landing.plans.body}</p>
        </div>
        <div className="plan-grid">
          {landing.plans.items.map((plan, i) => (
            <article
              className={`plan-card ${i === 1 ? "plan-accent" : ""}`}
              key={plan.name}
            >
              <div className="plan-top">
                <span className="eyebrow">
                  {["GROWING TEAMS", "EXPANDING TEAMS", "WIDER DEPLOYMENTS"][i]}
                </span>
                <Icon name="users" />
              </div>
              <h3>{plan.name}</h3>
              <p>{plan.body}</p>
              <div className="plan-divider" />
              <span className="plan-note">Let’s talk about your workflow.</span>
              <Action
                kind="plan"
                plan={plan.name}
                className={`button ${i === 1 ? "" : "secondary"}`}
              >
                {plan.cta}
                <Icon name="arrow" size={17} />
              </Action>
            </article>
          ))}
        </div>
        <p className="plans-footnote">
          Have a pricing question?{" "}
          <Action kind="plan" className="text-button">
            Ask About Pricing
            <Icon name="arrow" size={14} />
          </Action>
        </p>
      </div>
    </section>
  );
}
