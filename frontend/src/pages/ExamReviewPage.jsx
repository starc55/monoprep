import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout.jsx';
import Loader from '../components/ui/Loader.jsx';
import Card from '../components/ui/Card.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import FeedbackSummary from '../components/ai/FeedbackSummary.jsx';
import { getAttempt } from '../services/attemptService.js';
import { generateFeedback } from '../services/aiService.js';
import { getDisplayAnswer } from '../utils/exam.js';

function getCorrectDisplay(correctAnswer) {
  if (correctAnswer?.acceptedAnswers) {
    return correctAnswer.acceptedAnswers.join(', ');
  }
  if (correctAnswer?.values) {
    return correctAnswer.values.join(', ');
  }
  return correctAnswer?.value || 'N/A';
}

export default function ExamReviewPage() {
  const { attemptId } = useParams();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    async function loadReview() {
      const response = await getAttempt(attemptId);
      setAttempt(response);
      if (response.aiFeedback) {
        setFeedback(response.aiFeedback);
      } else if (response.status !== 'IN_PROGRESS') {
        const generated = await generateFeedback(attemptId).catch(() => null);
        if (generated) {
          setFeedback(generated);
        }
      }
      setLoading(false);
    }

    loadReview().catch(() => setLoading(false));
  }, [attemptId]);

  if (loading || !attempt) {
    return (
      <AppLayout
        title="Exam Review"
        subtitle="See your results, compare your answers with the key, and review feedback section by section."
      >
        <Loader label="Loading review..." />
      </AppLayout>
    );
  }

  const answerMap = Object.fromEntries(attempt.answers.map((answer) => [answer.questionId, answer]));

  return (
    <AppLayout
      title="Exam Review"
      subtitle="See your results, compare your answers with the key, and review feedback section by section."
      actions={
        <Link className="button button-primary" to={`/attempts/${attempt.id}/ai-feedback`}>
          Open AI Feedback
        </Link>
      }
    >
      <div className="stats-grid">
        <StatCard label="Total Score" value={`${attempt.totalScore || 0}%`} />
        <StatCard label="Reading/Writing" value={`${attempt.readingWritingScore || 0}%`} />
        <StatCard label="Math" value={`${attempt.mathScore || 0}%`} />
        <StatCard label="Listening" value={`${attempt.listeningScore || 0}%`} />
      </div>

      {feedback ? <FeedbackSummary feedback={feedback} /> : null}

      {attempt.exam.sections.map((section) => (
        <Card key={section.id} title={section.title} eyebrow={section.type}>
          <div className="review-list">
            {section.questions.map((question) => {
              const answer = answerMap[question.id];
              return (
                <article key={question.id} className="review-item">
                  <div className="review-item-head">
                    <strong>{question.questionText}</strong>
                    <span className={answer?.isCorrect ? 'pill success' : 'pill danger'}>
                      {answer?.isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>
                  <p><strong>Your answer:</strong> {getDisplayAnswer(answer?.answer)}</p>
                  <p><strong>Correct answer:</strong> {getCorrectDisplay(question.correctAnswer)}</p>
                  <p><strong>Explanation:</strong> {question.explanation}</p>
                </article>
              );
            })}
          </div>
        </Card>
      ))}
    </AppLayout>
  );
}
