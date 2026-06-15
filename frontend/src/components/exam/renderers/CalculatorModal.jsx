import { useEffect, useRef, useState } from 'react';
import { Calculator, Grip, X } from 'lucide-react';

export default function CalculatorModal({ open, onClose }) {
  const [position, setPosition] = useState({ x: 820, y: 96 });
  const dragRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function handleMove(event) {
      if (!dragRef.current) return;
      const maxX = Math.max(12, window.innerWidth - 360);
      const maxY = Math.max(12, window.innerHeight - 220);
      const nextX = Math.min(maxX, Math.max(12, event.clientX - dragRef.current.offsetX));
      const nextY = Math.min(maxY, Math.max(12, event.clientY - dragRef.current.offsetY));
      setPosition({ x: nextX, y: nextY });
    }

    function handleUp() {
      dragRef.current = null;
      document.body.classList.remove('dragging-desmos');
    }

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="draggable-desmos-window" style={{ left: position.x, top: position.y }} role="dialog" aria-label="Desmos Calculator">
      <div
        className="draggable-desmos-head"
        onMouseDown={(event) => {
          dragRef.current = {
            offsetX: event.clientX - position.x,
            offsetY: event.clientY - position.y
          };
          document.body.classList.add('dragging-desmos');
        }}
      >
        <span><Calculator aria-hidden="true" /> Desmos Calculator</span>
        <Grip aria-hidden="true" />
        <button type="button" onClick={onClose} aria-label="Close calculator">
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="desmos-calculator-shell">
        <iframe
          title="Desmos scientific calculator"
          src="https://www.desmos.com/scientific?embed"
          loading="lazy"
          allow="clipboard-write"
        />
      </div>
    </div>
  );
}
