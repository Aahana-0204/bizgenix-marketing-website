import { landing } from "@/content/landing";
import { Icon } from "../ui/Icon";
export function Industries() {
  return (
    <section id="industries" className="section industries-section">
      <div className="container">
        <div className="split-heading">
          <div>
            <div className="eyebrow">03 / BUILT AROUND YOUR BUSINESS</div>
            <h2>{landing.industries.title}</h2>
          </div>
          <p className="section-body">{landing.industries.note}</p>
        </div>
        <div className="industry-grid">
          {landing.industries.items.map((item, i) => (
            <article className="industry-card" key={item.name}>
              <div className="industry-top">
                <Icon name={item.icon} size={29} />
                <span>0{i + 1}</span>
              </div>
              <h3>{item.name}</h3>
              <ol>
                {item.stages.map((stage, index) => (
                  <li key={stage}>
                    <span>{stage}</span>
                    {index < 3 && <Icon name="right" size={14} />}
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
