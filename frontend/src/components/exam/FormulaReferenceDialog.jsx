import { useRef, useState } from 'react';
import { Grip, Maximize2, X } from 'lucide-react';
import MathJaxContent from '../math/MathJaxContent.jsx';

const defaultReferences = [
  ['Circle', '\\(A=\\pi r^2\\)', '\\(C=2\\pi r\\)'],
  ['Rectangle', '\\(A=lw\\)', ''],
  ['Triangle', '\\(A=\\frac{1}{2}bh\\)', ''],
  ['Right triangle', '\\(a^2+b^2=c^2\\)', ''],
  ['Cylinder', '\\(V=\\pi r^2h\\)', ''],
  ['Sphere', '\\(V=\\frac{4}{3}\\pi r^3\\)', ''],
  ['Cone', '\\(V=\\frac{1}{3}\\pi r^2h\\)', ''],
  ['Pyramid', '\\(V=\\frac{1}{3}lwh\\)', '']
];

export default function FormulaReferenceDialog({ open, text, onClose }) {
  const [position, setPosition] = useState({ x: 96, y: 120 });
  const [expanded, setExpanded] = useState(false);
  const dragRef = useRef(null);

  if (!open) return null;

  function startDrag(event) {
    if (expanded) return;
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { ...position };

    function handleMove(moveEvent) {
      setPosition({
        x: Math.max(12, origin.x + moveEvent.clientX - startX),
        y: Math.max(12, origin.y + moveEvent.clientY - startY)
      });
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', () => window.removeEventListener('pointermove', handleMove), { once: true });
  }

  return (
    <section
      ref={dragRef}
      className={`formula-window ${expanded ? 'expanded' : ''}`.trim()}
      style={expanded ? undefined : { transform: `translate(${position.x}px, ${position.y}px)` }}
      role="dialog"
      aria-label="Formula reference"
    >
      <header className="formula-window-head" onPointerDown={startDrag}>
        <strong>Reference</strong>
        <span><Grip aria-hidden="true" /></span>
        <div>
          <button type="button" onClick={() => setExpanded((value) => !value)} aria-label="Resize reference">
            <Maximize2 aria-hidden="true" />
          </button>
          <button type="button" onClick={onClose} aria-label="Close reference">
            <X aria-hidden="true" />
          </button>
        </div>
      </header>
      <div className="formula-window-body">
        {text ? (
          <MathJaxContent block className="formula-custom-text">{text}</MathJaxContent>
        ) : (
          <div className="formula-reference-grid">
            {defaultReferences.map(([title, first, second]) => (
              <article key={title}>
                <div className="formula-shape" aria-hidden="true" />
                <strong>{title}</strong>
                <MathJaxContent>{first}</MathJaxContent>
                {second ? <MathJaxContent>{second}</MathJaxContent> : null}
              </article>
            ))}
          </div>
        )}
        <p className="formula-footnote">
          The number of degrees of arc in a circle is 360. The sum of the measures in degrees of the angles of a triangle is 180.
        </p>
      </div>
    </section>
  );
}
