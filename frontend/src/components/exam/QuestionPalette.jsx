import AnimatedDropdown from '../motion/AnimatedDropdown.jsx';

export default function QuestionPalette({
  open = true,
  questions,
  currentQuestionId,
  answers,
  reviewFlags,
  onSelect,
  onReview
}) {
  return (
    <AnimatedDropdown open={open} className="question-palette-popup">
      <h3>Section Questions</h3>
      <div className="palette-legend-row">
        <span><i className="current-dot" /> Current</span>
        <span><i className="empty-box" /> Unanswered</span>
        <span><i className="review-flag" /> For Review</span>
      </div>
      <div className="palette-grid">
        {questions.map((question, index) => {
          const isAnswered = Boolean(answers[question.id]?.value || answers[question.id]?.values?.length);
          const isReview = Boolean(reviewFlags[question.id]);
          const isActive = currentQuestionId === question.id;

          return (
            <button
              key={question.id}
              type="button"
              className={`palette-item ${isAnswered ? 'answered' : ''} ${isReview ? 'review' : ''} ${isActive ? 'active' : ''}`.trim()}
              onClick={() => onSelect(index)}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      <button type="button" className="review-page-button" onClick={onReview}>
        Go to Review Page
      </button>
    </AnimatedDropdown>
  );
}
