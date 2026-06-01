import { resolveAssetUrl } from '../../utils/assets.js';

export default function ChoiceQuestion({
  question,
  value,
  onChange,
  multiple = false,
  eliminatedValues = [],
  onToggleEliminated
}) {
  const selectedValues = Array.isArray(value?.values)
    ? value.values
    : Array.isArray(value)
      ? value
      : value?.value
        ? [value.value]
        : [];

  const toggleValue = (label) => {
    if (!multiple) {
      onChange({ value: label });
      return;
    }

    const nextValues = selectedValues.includes(label)
      ? selectedValues.filter((entry) => entry !== label)
      : [...selectedValues, label];

    onChange({ values: nextValues.sort() });
  };

  return (
    <div className="choice-list">
      {question.options.map((option) => (
        <div key={option.id} className="choice-row">
          <button
            type="button"
            className={`choice-item ${selectedValues.includes(option.label) ? 'selected' : ''} ${eliminatedValues.includes(option.label) ? 'eliminated' : ''}`.trim()}
            onClick={() => toggleValue(option.label)}
          >
            <span className="choice-label">{option.label}</span>
            <span className="choice-content">
              <span className="choice-text">{option.text}</span>
              {option.imageUrl ? (
                <span className="choice-media">
                  <img src={resolveAssetUrl(option.imageUrl)} alt={`Answer choice ${option.label} image`} />
                </span>
              ) : null}
            </span>
          </button>
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
