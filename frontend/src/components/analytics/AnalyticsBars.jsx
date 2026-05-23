import { formatPercent } from '../../utils/format.js';

export default function AnalyticsBars({ items, labelKey = 'skill', valueKey = 'accuracy' }) {
  return (
    <div className="analytics-bars">
      {items.map((item) => {
        const label = item[labelKey] ?? item.label;
        const value = item[valueKey] ?? item.value ?? 0;
        return (
          <div key={`${label}-${value}`} className="analytics-bar-row">
            <div className="analytics-bar-label">
              <span>{label}</span>
              <strong>{formatPercent(value)}</strong>
            </div>
            <div className="analytics-bar-track">
              <span style={{ width: `${value}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
