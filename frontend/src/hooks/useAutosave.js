import { useEffect, useRef } from 'react';

export function useAutosave(value, onSave, delay = 500) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (value === undefined) {
      return undefined;
    }

    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      onSave?.(value);
    }, delay);

    return () => window.clearTimeout(timerRef.current);
  }, [delay, onSave, value]);
}
