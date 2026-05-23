import { AnimatePresence, motion } from 'framer-motion';

export default function AnimatedDropdown({ open, children, className = '' }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={className}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
