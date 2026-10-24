import { landing } from "@/content/landing";
import { Icon } from "../ui/Icon";
export function Problem() {
  return (
    <section id="why-bizgenix" className="section problem-section">
      <div className="container">
        <div className="split-heading">
          <div>
            <div className="eyebrow">01 / THE FOLLOW-THROUGH GAP</div>
            <h2>{landing.problem.title}</h2>
          </div>
          <p className="section-body">{landing.problem.body}</p>
        </div>
        <div className="question-grid">
          {landing.problem.questions.map((q, i) => (
            <article className="question-card" key={q}>
              <span className="question-number">0{i + 1}</span>
              <Icon
                name={["clock", "pipeline", "message", "users"][i]}
                size={26}
              />
              <h3>{q}</h3>
            </article>
          ))}
        </div>
        <p className="closing-question">
          {landing.problem.closing}
          <Icon name="arrow" size={21} />
        </p>
      </div>
    </section>
  );
}
