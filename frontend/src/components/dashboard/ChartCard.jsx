import { motion } from "framer-motion";
import { dashboardAssets } from "../../data/dashboardAssets.js";
import DashboardArt from "./DashboardArt.jsx";

export default function ChartCard({
  art,
  title,
  subtitle,
  children,
  className = "",
}) {
  return (
    <motion.article
      className={`pro-chart-card ${className}`.trim()}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
    >
      <header>
        <div>
          {art ? <DashboardArt src={art} className="panel-art" /> : null}
          <div>
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </div>
      </header>
      {children}
    </motion.article>
  );
}

export function ChartEmptyState({ label, art = dashboardAssets.chart }) {
  return (
    <div className="pro-chart-empty">
      {art ? <DashboardArt src={art} className="empty-art" /> : null}
      <span>{label}</span>
    </div>
  );
}
