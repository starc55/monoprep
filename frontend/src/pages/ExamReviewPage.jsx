import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Eye,
  FileQuestion,
  Sparkles,
  Target,
  XCircle
} from 'lucide-react';
import AppLayout from '../layouts/AppLayout.jsx';
import Loader from '../components/ui/Loader.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Modal from '../components/ui/Modal.jsx';
import { getAttempt } from '../services/attemptService.js';
import { generateFeedback } from '../services/aiService.js';
import { getDisplayAnswer } from '../utils/exam.js';
import { formatSeconds } from '../utils/format.js';

const filters = ['ALL', 'CORRECT', 'INCORRECT', 'MARKED', 'UNANSWERED'];

function getCorrectDisplay(question) {
  if (Array.isArray(question?.acceptedAnswers)) {
    return question.acceptedAnswers.join(', ');
  }
  if (question?.correctAnswer?.acceptedAnswers) {
    return question.correctAnswer.acceptedAnswers.join(', ');
  }
  if (question?.correctAnswer?.values) {
    return question.correctAnswer.values.join(', ');
  }
  return question?.correctAnswer?.value || 'N/A';
}

function getAnswerStatus(answer) {
  if (!answer || getDisplayAnswer(answer.answer) === 'No answer') return 'UNANSWERED';
  return answer.isCorrect ? 'CORRECT' : 'INCORRECT';
}

function statusLabel(status) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function ExamReviewPage() {
  const { attemptId } = useParams();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [viewCount, setViewCount] = useState('10');
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

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

  const rows = useMemo(() => {
    if (!attempt) return [];
    const answerMap = Object.fromEntries(attempt.answers.map((answer) => [answer.questionId, answer]));
    return attempt.exam.sections.flatMap((section) =>
      section.questions.map((question, index) => {
        const answer = answerMap[question.id];
        return {
          id: question.id,
          number: index + 1,
          section: section.title,
          question,
          answer,
          status: getAnswerStatus(answer)
        };
      })
    ).map((row, index) => ({ ...row, number: index + 1 }));
  }, [attempt]);

  const overview = useMemo(() => ({
    total: rows.length,
    correct: rows.filter((row) => row.status === 'CORRECT').length,
    incorrect: rows.filter((row) => row.status === 'INCORRECT').length,
    unanswered: rows.filter((row) => row.status === 'UNANSWERED').length,
    accuracy: rows.length ? Math.round((rows.filter((row) => row.status === 'CORRECT').length / rows.length) * 100) : 0
  }), [rows]);

  const visibleRows = useMemo(() => {
    const filtered = rows.filter((row) => {
      if (filter === 'MARKED') return Boolean(row.answer?.markedForReview);
      return filter === 'ALL' || row.status === filter;
    });
    return viewCount === 'ALL' ? filtered : filtered.slice(0, Number(viewCount));
  }, [filter, rows, viewCount]);

  if (loading || !attempt) {
    return (
      <AppLayout title="Exam Review" subtitle="See your results, answer details and AI-supported next steps.">
        <Loader label="Loading review..." />
      </AppLayout>
    );
  }

  const aiQuestionFeedback = feedback?.questionAnalysis?.find((item) => item.questionId === selectedRow?.id);

  return (
    <AppLayout
      title="Exam Review"
      subtitle={`${attempt.exam.title} - performance report and question-level review.`}
      actions={
        <Link className="button button-primary" to={`/attempts/${attempt.id}/ai-feedback`}>
          <Sparkles aria-hidden="true" /> Open AI Feedback
        </Link>
      }
    >
      <section className="review-scoreboard">
        <Card className="review-final-score">
          <span>Final score</span>
          <strong>{attempt.totalScore || 0}%</strong>
          <ProgressBar value={attempt.totalScore || 0} />
          <p><Clock3 aria-hidden="true" /> Time spent: {formatSeconds(attempt.timeSpent || 0)}</p>
        </Card>
        <Card className="review-section-score">
          <span>Reading and Writing</span>
          <strong>{attempt.readingWritingScore || 0}%</strong>
          <ProgressBar value={attempt.readingWritingScore || 0} tone="violet" />
        </Card>
        <Card className="review-section-score">
          <span>Math</span>
          <strong>{attempt.mathScore || 0}%</strong>
          <ProgressBar value={attempt.mathScore || 0} tone="cyan" />
        </Card>
        <Card className="ai-summary-card">
          <span><Sparkles aria-hidden="true" /> AI Feedback Summary</span>
          <p>{feedback?.overallFeedback || 'Detailed AI coaching is available from your feedback report.'}</p>
        </Card>
      </section>

      <div className="analytics-metric-strip review-metrics">
        <StatCard icon={FileQuestion} label="Total Questions" value={overview.total} />
        <StatCard icon={CheckCircle2} tone="green" label="Correct Answers" value={overview.correct} />
        <StatCard icon={XCircle} tone="red" label="Incorrect Answers" value={overview.incorrect} />
        <StatCard icon={FileQuestion} tone="amber" label="Unanswered" value={overview.unanswered} />
        <StatCard icon={Target} tone="violet" label="Accuracy" value={`${overview.accuracy}%`} />
      </div>

      <Card className="questions-overview">
        <div className="questions-head">
          <div>
            <h2>Questions Overview</h2>
            <p>Review results for each question from this practice test.</p>
          </div>
          <label className="answer-toggle">
            <input
              type="checkbox"
              checked={showCorrectAnswers}
              onChange={(event) => setShowCorrectAnswers(event.target.checked)}
            />
            <span />
            Show Correct Answers
          </label>
        </div>
        <div className="review-toolbar">
          <div className="review-filters">
            {filters.map((item) => (
              <button
                key={item}
                type="button"
                className={filter === item ? 'active' : ''}
                onClick={() => setFilter(item)}
              >
                {statusLabel(item)}
              </button>
            ))}
          </div>
          <label className="view-count">
            View:
            <select value={viewCount} onChange={(event) => setViewCount(event.target.value)}>
              <option value="10">10</option>
              <option value="30">30</option>
              <option value="ALL">All</option>
            </select>
          </label>
        </div>

        {visibleRows.length ? (
          <div className="table-wrap">
            <table className="data-table review-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Section</th>
                  <th>Skill</th>
                  <th>Correct Answer</th>
                  <th>Your Answer</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.id}>
                    <td>#{row.number}</td>
                    <td>{row.section}</td>
                    <td>{row.question.skill}</td>
                    <td>{showCorrectAnswers ? getCorrectDisplay(row.question) : 'Hidden'}</td>
                    <td>{getDisplayAnswer(row.answer?.answer)}</td>
                    <td>
                      <span className={`pill ${row.status === 'CORRECT' ? 'success' : row.status === 'INCORRECT' ? 'danger' : 'warning'}`}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="table-action" onClick={() => setSelectedRow(row)}>
                        <Eye aria-hidden="true" /> Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={FileQuestion}
            title={rows.length ? 'No questions in this filter' : 'No review data yet'}
            message={rows.length
              ? 'Choose another status filter to review your submitted responses.'
              : 'This result does not include question-level review data yet.'}
          />
        )}
      </Card>

      <Modal
        open={Boolean(selectedRow)}
        title={selectedRow ? `Question #${selectedRow.number} Review` : 'Question Review'}
        className="review-modal"
        onClose={() => setSelectedRow(null)}
        actions={<Button variant="ghost" onClick={() => setSelectedRow(null)}>Close</Button>}
      >
        {selectedRow ? (
          <div className="review-detail">
            <div className="review-detail-tags">
              <span className="pill blue">{selectedRow.section}</span>
              <span className="pill">{selectedRow.question.skill}</span>
              <span className={`pill ${selectedRow.status === 'CORRECT' ? 'success' : 'danger'}`}>
                {statusLabel(selectedRow.status)}
              </span>
            </div>
            <p className="review-question-text">{selectedRow.question.questionText}</p>
            <div className="review-answer-grid">
              <div><span>Your answer</span><strong>{getDisplayAnswer(selectedRow.answer?.answer)}</strong></div>
              <div><span>Correct answer</span><strong>{getCorrectDisplay(selectedRow.question)}</strong></div>
            </div>
            <div className="review-explanation">
              <h4>Explanation</h4>
              <p>{selectedRow.question.explanation || 'No explanation available for this question.'}</p>
            </div>
            {aiQuestionFeedback ? (
              <div className="review-explanation ai">
                <h4><Sparkles aria-hidden="true" /> AI explanation</h4>
                <p>{aiQuestionFeedback.whyCorrectAnswerIsRight || aiQuestionFeedback.explanation}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </AppLayout>
  );
}
