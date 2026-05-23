import { useEffect } from 'react';

export function useExamGuard(active, onVisibilityWarning) {
  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        onVisibilityWarning?.();
      }
    };

    const blockClipboard = (event) => {
      event.preventDefault();
    };

    const blockKey = (event) => {
      const isClipboardCombo =
        (event.ctrlKey || event.metaKey) &&
        ['c', 'v', 'x', 'a'].includes(event.key.toLowerCase());

      if (isClipboardCombo) {
        event.preventDefault();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('copy', blockClipboard);
    document.addEventListener('paste', blockClipboard);
    document.addEventListener('cut', blockClipboard);
    document.addEventListener('keydown', blockKey);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('copy', blockClipboard);
      document.removeEventListener('paste', blockClipboard);
      document.removeEventListener('cut', blockClipboard);
      document.removeEventListener('keydown', blockKey);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [active, onVisibilityWarning]);
}
