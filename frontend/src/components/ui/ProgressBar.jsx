import { motion } from 'framer-motion';

export default function ProgressBar({ value = 0, tone = 'blue', className = '' }) {
  const safeValue = Math.min(100, Math.max(0, Number(value) || 0));

  return (
    <div className={`progress-track progress-${tone} ${className}`.trim()}>
      <motion.span
        initial={{ width: 0 }}
        animate={{ width: `${safeValue}%` }}
        transition={{ duration: 0.38, ease: 'easeOut' }}
      />
    </div>
  );
}
