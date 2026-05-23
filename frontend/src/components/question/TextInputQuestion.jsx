export default function TextInputQuestion({ value, onChange, placeholder = 'Type your answer' }) {
  return (
    <input
      className="text-answer-input"
      type="text"
      placeholder={placeholder}
      value={value?.value || ''}
      onChange={(event) => onChange({ value: event.target.value })}
    />
  );
}
