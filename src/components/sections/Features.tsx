import { landing } from "@/content/landing";
import { Icon } from "../ui/Icon";
import { Reveal } from "../Motion";
export function Features() {
  return (
    <section id="features" className="section features-section">
      <div className="container">
        <Reveal>
          <div className="center-heading">
            <div className="eyebrow">02 / EVERYTHING IN VIEW</div>
            <h2>{landing.solution.title}</h2>
            <p className="section-body">{landing.solution.body}</p>
          </div>
        </Reveal>
        <div className="feature-grid">
          {landing.features.map((f, i) => (
            <article
              className={`feature-card ${i === 0 ? "feature-primary" : ""}`}
              key={f.title}
            >
              <span className="circle-icon">
                <Icon name={f.icon} size={25} />
              </span>
              <span className="feature-index">0{i + 1}</span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
              {!f.verified && (
                <span className="availability">
                  Available on supported configurations
                </span>
              )}
              {i === 0 && (
                <div className="mini-lead">
                  <span className="mini-avatar">↗</span>
                  <div>
                    A new enquiry
                    <strong>A clear owner. A visible next step.</strong>
                  </div>
                  <Icon name="check" size={16} />
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
