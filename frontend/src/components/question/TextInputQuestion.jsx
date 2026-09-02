export default function TextInputQuestion({ value, onChange, placeholder = 'Type your answer' }) {
  const answer = value?.value || '';

  return (
    <div className="student-response-answer">
      <input
        className="text-answer-input"
        type="text"
        inputMode="decimal"
        aria-label="Student-produced answer"
        placeholder={placeholder}
        value={answer}
        onChange={(event) => onChange({ value: event.target.value })}
      />
      <div className="answer-preview" aria-live="polite">
        <strong>Answer Preview:</strong>
        <span>{answer || '\u00a0'}</span>
      </div>
    </div>
  );
}
