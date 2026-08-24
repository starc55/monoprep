import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

export default function RowActionMenu({ label = 'Open actions', items = [] }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function close(event) {
      if (event.key === 'Escape' || (
        !menuRef.current?.contains(event.target) && !popoverRef.current?.contains(event.target)
      )) setOpen(false);
    }
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  function toggleMenu() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuHeight = Math.max(52, items.length * 45 + 12);
      const opensUp = rect.bottom + menuHeight + 8 > window.innerHeight;
      setPosition({
        top: opensUp ? Math.max(8, rect.top - menuHeight - 7) : rect.bottom + 7,
        right: Math.max(8, window.innerWidth - rect.right)
      });
    }
    setOpen((value) => !value);
  }

  return (
    <div className="row-action-menu" ref={menuRef}>
      <button ref={triggerRef} type="button" className="row-action-trigger" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={toggleMenu}>
        <MoreVertical aria-hidden="true" />
      </button>
      {open ? createPortal(
        <div ref={popoverRef} className="row-action-popover" role="menu" style={position}>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={item.tone === 'danger' ? 'danger' : ''}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}
              >
                {Icon ? <Icon aria-hidden="true" /> : null}
                {item.label}
              </button>
            );
          })}
        </div>,
        document.body
      ) : null}
    </div>
  );
}
