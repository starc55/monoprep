import { resolveAssetUrl } from '../../../utils/assets.js';
import MathJaxContent from '../../math/MathJaxContent.jsx';

export default function QuestionOptions({
  question,
  value,
  onChange,
  multiple = false,
  eliminatedValues = [],
  onToggleEliminated,
  eliminateMode = false
}) {
  const selectedValues = Array.isArray(value?.values)
    ? value.values
    : value?.value
      ? [value.value]
      : [];

  function toggleValue(label) {
    if (!multiple) {
      onChange({ value: label });
      return;
    }

    const nextValues = selectedValues.includes(label)
      ? selectedValues.filter((entry) => entry !== label)
      : [...selectedValues, label];

    onChange({ values: nextValues.sort() });
  }

  return (
    <div className={`choice-list ${eliminateMode ? 'elimination-mode' : ''}`.trim()}>
      {(question.options || []).map((option) => (
        <div key={option.id || option.label} className="choice-row">
          {eliminateMode ? <button
            type="button"
            className={`choice-item ${selectedValues.includes(option.label) ? 'selected' : ''} ${eliminatedValues.includes(option.label) ? 'eliminated' : ''}`.trim()}
            onClick={() => toggleValue(option.label)}
          >
            <span className="choice-label">{option.label}</span>
            <span className="choice-content">
              <MathJaxContent className="choice-text">{option.text}</MathJaxContent>
              {option.imageUrl ? (
                <span className="choice-media">
                  <img src={resolveAssetUrl(option.imageUrl)} alt={`Answer choice ${option.label} image`} />
                </span>
              ) : null}
            </span>
          </button> : null}
          <button
            type="button"
            className={`eliminate-choice ${eliminatedValues.includes(option.label) ? 'active' : ''}`.trim()}
            aria-label={`${eliminatedValues.includes(option.label) ? 'Restore' : 'Eliminate'} ${option.label}`}
            aria-pressed={eliminatedValues.includes(option.label)}
            onClick={() => onToggleEliminated?.(option.label)}
          >
            {option.label}
          </button>
        </div>
      ))}
    </div>
  );
}
