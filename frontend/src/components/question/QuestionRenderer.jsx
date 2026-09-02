import { useState } from "react";
import { Flag } from "lucide-react";
import ListeningQuestionRenderer from "../exam/renderers/ListeningQuestionRenderer.jsx";
import MathQuestionRenderer from "../exam/renderers/MathQuestionRenderer.jsx";
import ReadingQuestionRenderer from "../exam/renderers/ReadingQuestionRenderer.jsx";

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
  preview = false,
}) {
  const [eliminateMode, setEliminateMode] = useState(false);
  const rendererProps = {
    question,
    value,
    onChange,
    eliminatedValues,
    onToggleEliminated,
    eliminateMode,
  };

  function renderQuestion() {
    if (section?.type === "reading_writing") {
      return <ReadingQuestionRenderer {...rendererProps} />;
    }
    if (section?.type === "math") {
      return <MathQuestionRenderer {...rendererProps} />;
    }
    if (section?.type === "listening" || question.type === "audio_question") {
      return <ListeningQuestionRenderer {...rendererProps} />;
    }
    if (
      question.formulaText ||
      question.imageUrl ||
      question.type === "text_input"
    ) {
      return <MathQuestionRenderer {...rendererProps} />;
    }
    return <ReadingQuestionRenderer {...rendererProps} />;
  }

  return (
    <div
      className={`question-panel ${
        preview ? "question-panel-preview" : ""
      }`.trim()}
    >
      <div className="question-panel-head">
        <span className="question-number">{questionNumber}</span>
        {preview ? (
          <span className="preview-mode-label">Student Preview</span>
        ) : (
          <button
            type="button"
            className={`mark-review ${markedForReview ? "active" : ""}`.trim()}
            onClick={onMarkForReview}
          >
            <Flag size={18} strokeWidth={1.8} aria-hidden="true" />
            {markedForReview ? "Marked for Review" : "Mark for Review"}
          </button>
        )}
        {!preview && question.type !== "text_input" && question.options?.length ? (
          <button type="button" className={`answer-elimination-toggle ${eliminateMode ? "active" : ""}`.trim()} aria-pressed={eliminateMode} onClick={() => setEliminateMode((value) => !value)}>
            <span aria-hidden="true">ABC</span>
            {eliminateMode ? "Hide eliminator" : "Eliminate choices"}
          </button>
        ) : null}
      </div>
      {renderQuestion()}
    </div>
  );
}
