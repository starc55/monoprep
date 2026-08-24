import { motion } from "framer-motion";
import DashboardArt from "./DashboardArt.jsx";

export default function DashboardHero({
  title,
  subtitle,
  metrics = [],
  progress,
  actions,
  insight,
  art,
  cornerArt,
  variant = "student",
}) {
  return (
    <motion.section
      className={`pro-dashboard-hero pro-dashboard-hero-${variant} ${
        insight ? "has-insight" : "no-insight"
      }`.trim()}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
    >
      {cornerArt ? (
        <DashboardArt src={cornerArt} className="hero-corner-art" />
      ) : null}
      <div className="pro-dashboard-hero-main">
        {art ? <DashboardArt src={art} className="hero-art" /> : null}
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? (
          <div className="pro-dashboard-hero-actions">{actions}</div>
        ) : null}
      </div>

      {metrics.length ? (
        <div className="pro-dashboard-hero-metrics">
          {metrics.map((metric) => (
            <article key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </div>
      ) : null}

      {progress ? (
        <div className="pro-dashboard-progress">
          <div>
            <span>{progress.label}</span>
            <b>{progress.value}%</b>
          </div>
          <i>
            <span
              style={{
                width: `${Math.max(0, Math.min(100, progress.value))}%`,
              }}
            />
          </i>
        </div>
      ) : null}

      {insight ? (
        <aside className="pro-dashboard-insight">
          {insight.art ? (
            <DashboardArt src={insight.art} className="insight-art" />
          ) : null}
          <div>
            <span>{insight.label}</span>
            <strong>{insight.title}</strong>
            {insight.description ? <p>{insight.description}</p> : null}
          </div>
        </aside>
      ) : null}
    </motion.section>
  );
}
