import { motion } from 'framer-motion';
import DashboardArt from './DashboardArt.jsx';

export default function KpiCard({ art, label, value, hint, tone = 'blue', index = 0, detail = null }) {
  return (
    <motion.article
      className={`pro-kpi-card pro-kpi-${tone} ${detail ? 'has-kpi-detail' : ''}`.trim()}
      tabIndex={detail ? 0 : undefined}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.045, duration: 0.28 }}
      whileHover={{ y: -4 }}
    >
      <div className="pro-kpi-head">
        <span>{label}</span>
        {art ? <DashboardArt src={art} className="kpi-art" /> : null}
      </div>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
      {detail ? <div className="pro-kpi-detail-popover">{detail}</div> : null}
    </motion.article>
  );
}
