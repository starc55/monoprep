import { motion } from 'framer-motion';

export default function SlideUp({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
