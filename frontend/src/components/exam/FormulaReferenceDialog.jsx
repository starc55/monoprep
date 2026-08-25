import { useRef, useState } from 'react';
import { Grip, Maximize2, X } from 'lucide-react';
import SatMathReferenceSheet from './SatMathReferenceSheet.jsx';

export default function FormulaReferenceDialog({ open, onClose }) {
  const [position, setPosition] = useState({ x: 12, y: 96 });
  const [expanded, setExpanded] = useState(false);
  const dragRef = useRef(null);

  if (!open) return null;

  function startDrag(event) {
    if (expanded) return;
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { ...position };
    const bounds = dragRef.current?.getBoundingClientRect();

    function handleMove(moveEvent) {
      setPosition({
        x: Math.min(Math.max(12, window.innerWidth - (bounds?.width || 0) - 12), Math.max(12, origin.x + moveEvent.clientX - startX)),
        y: Math.min(Math.max(12, window.innerHeight - (bounds?.height || 0) - 12), Math.max(12, origin.y + moveEvent.clientY - startY))
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
        <SatMathReferenceSheet />
      </div>
    </section>
  );
}
