import { useEffect, useRef, useState } from 'react';

const DESMOS_SCRIPT_ID = 'monoprep-desmos-api';
const DESMOS_DEMO_KEY = 'dcb31709b452b1cf9dc26972add0fda6';

function loadDesmos(apiKey) {
  if (window.Desmos?.GraphingCalculator) return Promise.resolve(window.Desmos);

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(DESMOS_SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Desmos), { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = DESMOS_SCRIPT_ID;
    script.src = `https://www.desmos.com/api/v1.12/calculator.js?apiKey=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.onload = () => resolve(window.Desmos);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function DesmosGraphingCalculator() {
  const hostRef = useRef(null);
  const calculatorRef = useRef(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    let active = true;
    const apiKey = import.meta.env.VITE_DESMOS_API_KEY || DESMOS_DEMO_KEY;

    if (!apiKey) {
      setFallback(true);
      return undefined;
    }

    loadDesmos(apiKey)
      .then((Desmos) => {
        if (!active || !hostRef.current || !Desmos?.GraphingCalculator) return;
        calculatorRef.current = Desmos.GraphingCalculator(hostRef.current, {
          expressions: true,
          expressionsTopbar: true,
          graphpaper: true,
          keypad: true,
          keypadActivated: true,
          settingsMenu: true,
          zoomButtons: true,
          pointsOfInterest: true,
          trace: true,
          border: false,
          lockViewport: false,
        });
      })
      .catch(() => {
        if (active) setFallback(true);
      });

    return () => {
      active = false;
      calculatorRef.current?.destroy?.();
      calculatorRef.current = null;
    };
  }, []);

  if (fallback) {
    return (
      <iframe
        title="Desmos graphing calculator"
        src="https://www.desmos.com/calculator?embed=true"
        allow="clipboard-read; clipboard-write"
      />
    );
  }

  return <div ref={hostRef} className="desmos-api-host" aria-label="Interactive Desmos graphing calculator" />;
}
