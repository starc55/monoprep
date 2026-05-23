import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout.jsx';
import Card from '../components/ui/Card.jsx';
import Loader from '../components/ui/Loader.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import AnalyticsBars from '../components/analytics/AnalyticsBars.jsx';
import AnalyticsScoreTable from '../components/analytics/AnalyticsScoreTable.jsx';
import { getExams } from '../services/examService.js';
import { getMyAttempts } from '../services/attemptService.js';
import { getMyAnalytics } from '../services/analyticsService.js';
import { formatDate } from '../utils/format.js';

export default function PracticePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    exams: [],
    attempts: [],
    analytics: null
  });

  useEffect(() => {
    async function loadPracticeWorkspace() {
      const [exams, attempts, analytics] = await Promise.all([
        getExams(),
        getMyAttempts(),
        getMyAnalytics().catch(() => null)
      ]);

      setData({ exams, attempts, analytics });
      setLoading(false);
    }

    loadPracticeWorkspace().catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppLayout
        title="Practice Library"
        subtitle="Practice exams, attempts, score history, and analytics now live in one focused workspace."
      >
        <Loader label="Loading practice catalog..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Practice Library"
      subtitle="Practice exams, attempts, score history, and analytics now live in one focused workspace."
    >
      <div className="stats-grid">
        <StatCard label="Available Exams" value={data.exams.length} />
        <StatCard label="Attempts" value={data.attempts.length} />
        <StatCard label="Average Score" value={`${data.analytics?.overview?.averageScore || 0}%`} />
        <StatCard label="Best Score" value={`${data.analytics?.overview?.bestScore || 0}%`} />
      </div>

      <div className="practice-section-head">
        <div>
          <h2>Practice Exams</h2>
          <p>Start a new simulation or resume from the attempt history below.</p>
        </div>
      </div>

      <div className="content-grid exam-grid">
        {data.exams.map((exam) => (
          <Card key={exam.id} title={exam.title} eyebrow={exam.type}>
            <p>{exam.description}</p>
            <div className="card-metadata">
              <span>{exam.totalDuration} minutes</span>
              <span>{exam.sections.length} sections</span>
            </div>
            <Link className="button button-primary" to={`/exams/${exam.id}/instructions`}>
              View instructions
            </Link>
          </Card>
        ))}
      </div>

      <Card title="Attempt History" className="practice-history-card">
        {data.attempts.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Started</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.attempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td>{attempt.examTitle}</td>
                    <td>{attempt.status}</td>
                    <td>{attempt.totalScore ?? '--'}%</td>
                    <td>{formatDate(attempt.startedAt)}</td>
                    <td>
                      <Link to={attempt.status === 'IN_PROGRESS' ? `/attempts/${attempt.id}/exam` : `/attempts/${attempt.id}/review`}>
                        {attempt.status === 'IN_PROGRESS' ? 'Resume' : 'Review'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No attempts yet. Start a practice exam to build your history.</p>
        )}
      </Card>

      <div className="content-grid two-up practice-analytics-grid">
        <Card title="Accuracy by Skill">
          {data.analytics?.accuracyBySkill?.length ? (
            <AnalyticsBars items={data.analytics.accuracyBySkill} />
          ) : (
            <p>Complete an exam to see skill-level accuracy.</p>
          )}
        </Card>

        <Card title="Weak Topics">
          {data.analytics?.weakTopics?.length ? (
            <AnalyticsBars items={data.analytics.weakTopics} />
          ) : (
            <p>Weak topics will appear after your scored attempts.</p>
          )}
        </Card>
      </div>

      <div className="content-grid two-up">
        <Card title="Score History">
          {data.analytics?.scoreHistory?.length ? (
            <AnalyticsScoreTable items={data.analytics.scoreHistory} />
          ) : (
            <p>Your score history will build here as you submit exams.</p>
          )}
        </Card>

        <Card title="Time Per Section">
          {data.analytics?.timePerSection?.length ? (
            <div className="analytics-bars">
              {data.analytics.timePerSection.map((item) => (
                <div className="analytics-bar-row" key={item.section}>
                  <div className="analytics-bar-label">
                    <span>{item.section}</span>
                    <strong>{item.seconds}s</strong>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>Timing details will appear after submitted attempts.</p>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
