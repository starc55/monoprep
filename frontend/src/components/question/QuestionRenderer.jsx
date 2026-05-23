import ListeningQuestionRenderer from '../exam/renderers/ListeningQuestionRenderer.jsx';
import MathQuestionRenderer from '../exam/renderers/MathQuestionRenderer.jsx';
import ReadingQuestionRenderer from '../exam/renderers/ReadingQuestionRenderer.jsx';

export default function QuestionRenderer({
  section,
  question,
  value,
  onChange,
  questionNumber,
  markedForReview,
  onMarkForReview,
  eliminatedValues = [],
  onToggleEliminated,
  preview = false
}) {
  const rendererProps = {
    question,
    value,
    onChange,
    eliminatedValues,
    onToggleEliminated
  };

  function renderQuestion() {
    if (section?.type === 'reading_writing') {
      return <ReadingQuestionRenderer {...rendererProps} />;
    }
    if (section?.type === 'math') {
      return <MathQuestionRenderer {...rendererProps} />;
    }
    if (section?.type === 'listening' || question.type === 'audio_question') {
      return <ListeningQuestionRenderer {...rendererProps} />;
    }
    if (question.formulaText || question.imageUrl || question.type === 'text_input') {
      return <MathQuestionRenderer {...rendererProps} />;
    }
    return <ReadingQuestionRenderer {...rendererProps} />;
  }

  return (
    <div className={`question-panel ${preview ? 'question-panel-preview' : ''}`.trim()}>
      <div className="question-panel-head">
        <span className="question-number">{questionNumber}</span>
        {preview ? (
          <span className="preview-mode-label">Student Preview</span>
        ) : (
          <button
            type="button"
            className={`mark-review ${markedForReview ? 'active' : ''}`.trim()}
            onClick={onMarkForReview}
          >
            <span aria-hidden="true">Flag</span>
            {markedForReview ? 'Marked for Review' : 'Mark for Review'}
          </button>
        )}
      </div>
      {renderQuestion()}
    </div>
  );
}
