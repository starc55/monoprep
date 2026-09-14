import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export default function CountdownUnit({ value, label }) {
  const reduceMotion = useReducedMotion();
  const displayValue = String(value).padStart(2, "0");

  return (
    <div className="launch-countdown-unit" aria-label={`${value} ${label}`}>
      <strong className="launch-flip-display" aria-hidden="true">
        <span className="launch-flip-half launch-flip-half-top" />
        <span className="launch-flip-half launch-flip-half-bottom" />
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={displayValue}
            className="launch-flip-number"
            initial={reduceMotion ? false : { y: "-105%", opacity: 0, rotateX: 70 }}
            animate={{ y: 0, opacity: 1, rotateX: 0 }}
            exit={reduceMotion ? undefined : { y: "105%", opacity: 0, rotateX: -70 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            {displayValue}
          </motion.span>
        </AnimatePresence>
        <span className="launch-flip-hinge" />
      </strong>
      <span className="launch-countdown-label">{label}</span>
    </div>
  );
}
