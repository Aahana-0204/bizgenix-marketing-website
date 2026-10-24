import { landing } from "@/content/landing";
import { Action } from "../actions/Actions";
import { Icon } from "../ui/Icon";
export function Proof() {
  return (
    <section className="proof-section story">
      <div className="container proof-inner">
        <div className="proof-orbit" aria-hidden="true">
          <div />
          <div />
          <div />
          <span>
            <Icon name="pipeline" size={48} />
          </span>
        </div>
        <div className="proof-copy">
          <div className="eyebrow">LESS GUESSWORK. MORE CLARITY.</div>
          <h2>{landing.proof.title}</h2>
          <p>{landing.proof.body}</p>
          <Action className="button light">
            {landing.proof.cta}
            <Icon name="arrow" />
          </Action>
        </div>
      </div>
    </section>
  );
}
