import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

export default function PremiumSelect({
  label,
  value,
  options = [],
  onChange,
  ariaLabel,
  className = "",
  disabled = false,
}) {
  const id = useId();
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(selectedIndex);
  const selectedOption = options[selectedIndex] || options[0];
  const listboxId = `${id}-listbox`;

  useEffect(() => {
    setHighlightedIndex(selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function choose(option) {
    if (!option || option.disabled || disabled) return;
    onChange?.(option.value);
    setOpen(false);
    window.requestAnimationFrame(() => buttonRef.current?.focus());
  }

  function moveHighlight(step) {
    setHighlightedIndex((current) => {
      const next = current + step;
      if (next < 0) return options.length - 1;
      if (next >= options.length) return 0;
      return next;
    });
  }

  function handleKeyDown(event) {
    if (!options.length || disabled) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      moveHighlight(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) setOpen(true);
      moveHighlight(-1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex(options.length - 1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) {
        choose(options[highlightedIndex]);
      } else {
        setOpen(true);
      }
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={`premium-select ${className}`.trim()}>
      {label ? <span className="premium-select-label">{label}</span> : null}
      <button
        ref={buttonRef}
        type="button"
        className="premium-select-trigger"
        aria-label={ariaLabel || label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          open ? `${listboxId}-option-${highlightedIndex}` : undefined
        }
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        <span>{selectedOption?.label || "Select"}</span>
        <ChevronDown aria-hidden="true" className="premium-select-arrow" />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="premium-select-menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <div
              id={listboxId}
              className="premium-select-list"
              role="listbox"
              aria-label={ariaLabel || label}
            >
              {options.map((option, index) => {
                const selected = option.value === value;
                const highlighted = index === highlightedIndex;

                return (
                  <button
                    key={option.value}
                    id={`${listboxId}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={option.disabled}
                    className={[
                      "premium-select-option",
                      selected ? "selected" : "",
                      highlighted ? "highlighted" : "",
                      option.disabled ? "disabled" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => choose(option)}
                  >
                    <span>{option.label}</span>
                    {selected ? <Check aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
