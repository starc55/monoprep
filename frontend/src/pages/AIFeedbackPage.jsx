import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import AppLayout from '../layouts/AppLayout.jsx';
import Loader from '../components/ui/Loader.jsx';
import Card from '../components/ui/Card.jsx';
import FeedbackSummary from '../components/ai/FeedbackSummary.jsx';
import StudyRoadmap from '../components/ai/StudyRoadmap.jsx';
import AnalyticsBars from '../components/analytics/AnalyticsBars.jsx';
import { generateFeedback, getFeedback } from '../services/aiService.js';

export default function AIFeedbackPage() {
  const { attemptId } = useParams();
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    async function loadFeedback() {
      const existing = await getFeedback(attemptId).catch(() => null);
      if (existing) {
        setFeedback(existing);
        setLoading(false);
        return;
      }

      const generated = await generateFeedback(attemptId).catch(() => null);
      setFeedback(generated);
      setLoading(false);
    }

    loadFeedback().catch(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return (
      <AppLayout
        title="AI Feedback"
        subtitle="Detailed coaching, weakness analysis, pacing notes, and a study roadmap based on your exam."
      >
        <Loader label="Generating AI feedback..." />
      </AppLayout>
    );
  }

  if (!feedback) {
    return (
      <AppLayout title="AI Feedback" subtitle="The exam score is available, but AI feedback could not be generated right now.">
        <Card title="Fallback">
          <p>You can still review your objective score and explanations on the review page.</p>
        </Card>
      </AppLayout>
    );
  }

  const estimatedScore = feedback.estimatedScore || {};
  const skillBreakdown = feedback.skillBreakdown || [];
  const recommendedPractice = feedback.recommendedPractice || [];
  const questionAnalysis = feedback.questionAnalysis || [];
  const studyRoadmap = feedback.studyRoadmap || [];

  return (
    <AppLayout
      title="AI Feedback"
      subtitle="Detailed coaching, weakness analysis, pacing notes, and a study roadmap based on your exam."
    >
      <FeedbackSummary feedback={feedback} />

      <div className="stats-grid">
        <Card title="Estimated Composite">
          <strong className="big-score">{estimatedScore.total || 0}</strong>
        </Card>
        <Card title="Reading/Writing Estimate">
          <strong className="big-score">{estimatedScore.readingWriting || 0}</strong>
        </Card>
        <Card title="Math Estimate">
          <strong className="big-score">{estimatedScore.math || 0}</strong>
        </Card>
      </div>

      <Card title="Skill Breakdown">
        <AnalyticsBars items={skillBreakdown} />
      </Card>

      <Card title="Recommended Practice">
        <ul className="clean-list">
          {recommendedPractice.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>

      <Card title="Question Analysis">
        <div className="review-list">
          {questionAnalysis.map((item) => (
            <article key={item.questionId} className="review-item">
              <div className="review-item-head">
                <strong>{item.questionId}</strong>
                <span className={item.isCorrect ? 'pill success' : 'pill danger'}>
                  {item.isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>
              <ReactMarkdown>{item.explanation}</ReactMarkdown>
              <p><strong>Why the correct answer works:</strong> {item.whyCorrectAnswerIsRight}</p>
              <p><strong>Why your answer missed:</strong> {item.whyStudentAnswerIsWrong}</p>
              <p><strong>Related skill:</strong> {item.relatedSkill}</p>
            </article>
          ))}
        </div>
      </Card>

      <Card title="Study Roadmap">
        <StudyRoadmap roadmap={studyRoadmap} />
      </Card>
    </AppLayout>
  );
}
