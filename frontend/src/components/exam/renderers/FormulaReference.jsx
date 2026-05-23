export default function FormulaReference({ text }) {
  if (!text) {
    return null;
  }

  return (
    <aside className="formula-reference" aria-label="Formula reference">
      <strong>Formula Reference</strong>
      <p>{text}</p>
    </aside>
  );
}
