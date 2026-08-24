import { useEffect, useRef, useState } from 'react';
import { Calculator, Grip, X } from 'lucide-react';
import DesmosGraphingCalculator from './DesmosGraphingCalculator.jsx';

export default function CalculatorModal({ open, onClose, docked = false }) {
  const [position, setPosition] = useState({ x: 24, y: 72 });
  const dragRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const windowWidth = Math.min(docked ? 640 : 680, window.innerWidth - (docked ? 56 : 24));
    const windowHeight = Math.min(docked ? 680 : 640, window.innerHeight - 24);
    const initialX = Math.max(0, window.innerWidth - windowWidth - (docked ? 0 : 24));
    const maxY = Math.max(12, window.innerHeight - windowHeight - 12);
    setPosition((current) => docked ? ({
      x: initialX,
      y: Math.max(12, (window.innerHeight - windowHeight) / 2)
    }) : ({
      x: Math.min(initialX, Math.max(12, current.x)),
      y: Math.min(maxY, Math.max(12, current.y))
    }));

    function handleMove(event) {
      if (!dragRef.current) return;
      const maxX = Math.max(12, window.innerWidth - windowWidth - 12);
      const maxY = Math.max(12, window.innerHeight - windowHeight - 12);
      const nextX = Math.min(maxX, Math.max(12, event.clientX - dragRef.current.offsetX));
      const nextY = Math.min(maxY, Math.max(12, event.clientY - dragRef.current.offsetY));
      setPosition({ x: nextX, y: nextY });
    }

    function handleUp() {
      dragRef.current = null;
      document.body.classList.remove('dragging-desmos');
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [docked, open]);

  if (!open) return null;

  return (
    <div className={`draggable-desmos-window ${docked ? 'docked' : ''}`.trim()} style={{ left: position.x, top: position.y }} role="dialog" aria-label="Desmos Calculator">
      <div
        className="draggable-desmos-head"
        onPointerDown={(event) => {
          if (docked) return;
          event.currentTarget.setPointerCapture?.(event.pointerId);
          dragRef.current = {
            offsetX: event.clientX - position.x,
            offsetY: event.clientY - position.y
          };
          document.body.classList.add('dragging-desmos');
        }}
      >
        <span><Calculator aria-hidden="true" /> Desmos Calculator</span>
        <Grip aria-hidden="true" />
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            dragRef.current = null;
            document.body.classList.remove('dragging-desmos');
            onClose();
          }}
          aria-label="Close calculator"
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="desmos-calculator-shell">
        <DesmosGraphingCalculator />
      </div>
    </div>
  );
}
