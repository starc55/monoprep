import { useEffect, useState } from 'react';
import AppLayout from '../layouts/AppLayout.jsx';
import Loader from '../components/ui/Loader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import Card from '../components/ui/Card.jsx';
import AnalyticsBars from '../components/analytics/AnalyticsBars.jsx';
import AnalyticsScoreTable from '../components/analytics/AnalyticsScoreTable.jsx';
import { getMyAnalytics } from '../services/analyticsService.js';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    getMyAnalytics()
      .then(setAnalytics)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !analytics) {
    return (
      <AppLayout
        title="Analytics"
        subtitle="Track score history, skill accuracy, pacing, and overall trend over time."
      >
        <Loader label="Loading analytics..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Analytics"
      subtitle="Track score history, skill accuracy, pacing, and overall trend over time."
    >
      <div className="stats-grid">
        <StatCard label="Attempts" value={analytics.overview.attemptsTaken} />
        <StatCard label="Average Score" value={`${analytics.overview.averageScore}%`} />
        <StatCard label="Best Score" value={`${analytics.overview.bestScore}%`} />
        <StatCard label="Improvement Trend" value={`${analytics.improvementTrend}%`} />
      </div>

      <div className="content-grid two-up">
        <Card title="Accuracy by Skill">
          <AnalyticsBars items={analytics.accuracyBySkill} />
        </Card>
        <Card title="Weak Topics">
          <AnalyticsBars items={analytics.weakTopics} />
        </Card>
      </div>

      <Card title="Score History">
        <AnalyticsScoreTable items={analytics.scoreHistory} />
      </Card>

      <Card title="Time Per Section">
        <div className="analytics-bars">
          {analytics.timePerSection.map((item) => (
            <div className="analytics-bar-row" key={item.section}>
              <div className="analytics-bar-label">
                <span>{item.section}</span>
                <strong>{item.seconds}s</strong>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </AppLayout>
  );
}
