import { useState } from 'react';

export default function PassagePanel({ question }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!question?.passage) {
    return (
      <div className="passage-panel empty">
        <h2>Stimulus</h2>
        <p>This item does not include a separate passage. Use the prompt and choices on the right.</p>
      </div>
    );
  }

  return (
    <div className={`passage-panel ${collapsed ? 'collapsed' : ''}`.trim()}>
      <div className="passage-mobile-head">
        <div>
          <span className="passage-category">{question.passage.category}</span>
          <h2>{question.passage.title}</h2>
        </div>
        <button type="button" onClick={() => setCollapsed((value) => !value)}>
          {collapsed ? 'Show' : 'Hide'}
        </button>
      </div>
      <div className="passage-content">
        <p>{question.passage.content}</p>
      </div>
    </div>
  );
}
