import { Icon } from "./ui/Icon";
export function Dashboard() {
  return (
    <div
      className="dashboard"
      aria-label="Illustrative CRM interface, not a verified product screenshot"
    >
      <div className="browser-bar">
        <div className="browser-dots">
          <i />
          <i />
          <i />
        </div>
        <span>Bizgenix AI CRM · Workspace preview</span>
        <Icon name="shield" size={13} />
      </div>
      <div className="dashboard-layout">
        <aside className="dash-sidebar">
          <div className="dash-brand">
            B<span>✳</span>
          </div>
          {["pipeline", "users", "message", "clock", "chart"].map((icon, i) => (
            <span className={i === 0 ? "selected" : ""} key={icon}>
              <Icon name={icon} size={19} />
            </span>
          ))}
          <div className="dash-avatar">AS</div>
        </aside>
        <div className="dash-main">
          <div className="dash-heading">
            <div>
              <span className="dash-eyebrow">YOUR SALES, CONNECTED</span>
              <h3>A little clarity. A lot of momentum.</h3>
            </div>
            <span className="dash-add">+ New lead</span>
          </div>
          <div className="dash-summary">
            {[
              ["users", "Leads", "Organized"],
              ["pipeline", "Pipeline", "Visible"],
              ["clock", "Follow-ups", "On track"],
            ].map(([icon, label, value]) => (
              <div key={label}>
                <Icon name={icon} size={18} />
                <span>
                  {label}
                  <strong>{value}</strong>
                </span>
                <span className="summary-dot" />
              </div>
            ))}
          </div>
          <div className="pipeline-heading">
            <h4>
              Sales pipeline <span>Illustrative workspace</span>
            </h4>
            <span>
              Board view <Icon name="down" size={12} />
            </span>
          </div>
          <div className="kanban">
            {[
              {
                title: "New enquiries",
                color: "mint",
                cards: [
                  [
                    "BR",
                    "Business requirements",
                    "New enquiry",
                    "Discover the right fit",
                  ],
                  [
                    "TC",
                    "Team consultation",
                    "Website",
                    "Assign a sales owner",
                  ],
                ],
              },
              {
                title: "In conversation",
                color: "blue",
                cards: [
                  [
                    "WF",
                    "Workflow discussion",
                    "Discovery",
                    "Understand the process",
                  ],
                  [
                    "PD",
                    "Product demonstration",
                    "Demo",
                    "Prepare a walkthrough",
                  ],
                ],
              },
              {
                title: "Next steps",
                color: "peach",
                cards: [
                  [
                    "PR",
                    "Proposal review",
                    "Follow-up",
                    "Continue the conversation",
                  ],
                  [
                    "TO",
                    "Team onboarding",
                    "Planning",
                    "Keep the next step clear",
                  ],
                ],
              },
            ].map((column) => (
              <div className="kanban-column" key={column.title}>
                <div className="column-title">
                  <i className={column.color} />
                  {column.title}
                  <span>•••</span>
                </div>
                {column.cards.map(([initials, title, tag, note]) => (
                  <div className="lead-card" key={title}>
                    <div>
                      <span className={`lead-avatar ${column.color}`}>
                        {initials}
                      </span>
                      <span className="card-menu">•••</span>
                    </div>
                    <h5>{title}</h5>
                    <span className={`lead-tag ${column.color}`}>{tag}</span>
                    <p>{note}</p>
                    <div className="lead-bottom">
                      <Icon name="clock" size={12} />
                      <span>Next action visible</span>
                      <span className="owner-avatar">A</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="dash-footer">
            <span className="live-dot" /> One shared view. Every next step in
            sight.
            <Icon name="sparkles" size={14} />
          </div>
        </div>
      </div>
    </div>
  );
}
