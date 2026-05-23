import { motion } from 'framer-motion';

export default function FadeIn({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay }}
    >
      {children}
    </motion.div>
  );
}
