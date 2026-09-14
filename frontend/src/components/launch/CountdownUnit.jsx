export default function CountdownUnit({ value, label }) {
  return (
    <div className="launch-countdown-unit">
      <strong>{String(value).padStart(2, "0")}</strong>
      <span>{label}</span>
    </div>
  );
}

