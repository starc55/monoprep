import { useEffect, useMemo, useState } from 'react';

export function useCountdown(targetTimestamp, onExpire) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const remaining = useMemo(() => {
    return Math.max(0, Math.floor((targetTimestamp - now) / 1000));
  }, [targetTimestamp, now]);

  useEffect(() => {
    if (remaining === 0 && targetTimestamp > 0) {
      onExpire?.();
    }
  }, [remaining, onExpire, targetTimestamp]);

  return remaining;
}
