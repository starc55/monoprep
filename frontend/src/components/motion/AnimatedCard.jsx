import { motion } from 'framer-motion';

export default function AnimatedCard({ children, className = '', ...props }) {
  return (
    <motion.div
      className={className}
      {...props}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
