import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileQuestion,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Star,
  Target,
  XCircle,
} from "lucide-react";
import AppLayout from "../layouts/AppLayout.jsx";
import Loader from "../components/ui/Loader.jsx";
import Button from "../components/ui/Button.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Modal from "../components/ui/Modal.jsx";
import PremiumSelect from "../components/ui/PremiumSelect.jsx";
import QuestionImage from "../components/exam/renderers/QuestionImage.jsx";
import PassageAssetViewer from "../components/exam/PassageAssetViewer.jsx";
import MathJaxContent from "../components/math/MathJaxContent.jsx";
import { getAttempt } from "../services/attemptService.js";
import { generateFeedback } from "../services/aiService.js";
import { getDisplayAnswer } from "../utils/exam.js";
import { formatSeconds } from "../utils/format.js";
import { useAuthStore } from "../store/authStore.js";

const filters = ["ALL", "CORRECT", "INCORRECT", "MARKED", "UNANSWERED"];
const viewCountOptions = [
  { value: "10", label: "10" },
  { value: "30", label: "30" },
  { value: "ALL", label: "All" },
];

const REPORT_DOMAINS = [
  { subject: "Reading & Writing", name: "Information and Ideas", patterns: ["information", "idea", "evidence", "inference", "main"] },
  { subject: "Reading & Writing", name: "Craft and Structure", patterns: ["craft", "structure", "vocabulary", "context", "purpose"] },
  { subject: "Reading & Writing", name: "Expression of Ideas", patterns: ["expression", "transition", "rhetoric", "revision"] },
  { subject: "Reading & Writing", name: "Standard English Conventions", patterns: ["grammar", "punctuation", "convention", "sentence", "boundary"] },
  { subject: "Math", name: "Algebra", patterns: ["algebra", "linear", "equation", "inequality", "system"] },
  { subject: "Math", name: "Advanced Math", patterns: ["advanced", "quadratic", "polynomial", "function", "exponential"] },
  { subject: "Math", name: "Problem-Solving and Data Analysis", patterns: ["data", "statistic", "ratio", "percent", "probability", "problem"] },
  { subject: "Math", name: "Geometry and Trigonometry", patterns: ["geometry", "trigonometry", "circle", "triangle", "angle", "area", "volume"] },
];

function getReportDomain(subject, skill = "") {
  const normalized = String(skill).toLowerCase();
  return REPORT_DOMAINS.find((domain) => domain.subject === subject && domain.patterns.some((pattern) => normalized.includes(pattern)))?.name
    || (subject === "Math" ? "Algebra" : "Information and Ideas");
}

function getCorrectDisplay(question) {
  if (Array.isArray(question?.acceptedAnswers)) {
    return question.acceptedAnswers.join(", ");
  }
  if (question?.correctAnswer?.acceptedAnswers) {
    return question.correctAnswer.acceptedAnswers.join(", ");
  }
  if (question?.correctAnswer?.values) {
    return question.correctAnswer.values.join(", ");
  }
  return question?.correctAnswer?.value || "N/A";
}

function getAnswerStatus(answer) {
  if (!answer || getDisplayAnswer(answer.answer) === "No answer")
    return "UNANSWERED";
  return answer.isCorrect ? "CORRECT" : "INCORRECT";
}

function normalizeAnswerValues(answer) {
  if (!answer) return [];
  if (Array.isArray(answer.values)) return answer.values.map((value) => String(value).toUpperCase());
  if (answer.value !== undefined && answer.value !== null) return [String(answer.value).toUpperCase()];
  return [];
}

function getCorrectValues(question) {
  if (Array.isArray(question?.correctAnswer?.values)) {
    return question.correctAnswer.values.map((value) => String(value).toUpperCase());
  }
  if (question?.correctAnswer?.value !== undefined && question.correctAnswer.value !== null) {
    return [String(question.correctAnswer.value).toUpperCase()];
  }
  return (question?.options || [])
    .filter((option) => option.isCorrect)
    .map((option) => String(option.label).toUpperCase());
}

function ReviewAnswerChoices({ question, answer, answersVisible = true }) {
  if (!question?.options?.length) return null;
  const selectedValues = normalizeAnswerValues(answer?.answer);
  const correctValues = getCorrectValues(question);

  return (
    <div className="review-choice-list">
      {question.options.map((option) => {
        const label = String(option.label).toUpperCase();
        const selected = selectedValues.includes(label);
        const correct = answersVisible && (correctValues.includes(label) || option.isCorrect);
        return (
          <div
            key={option.id || option.label}
            className={`review-choice-detail ${correct ? "correct" : ""} ${selected ? "selected" : ""} ${selected && !correct ? "incorrect" : ""}`.trim()}
          >
            <span className="review-choice-label">{option.label}</span>
            <div className="review-choice-content">
              {option.text ? <MathJaxContent block>{option.text}</MathJaxContent> : null}
              {option.imageUrl ? <QuestionImage src={option.imageUrl} alt={`Option ${option.label} image`} /> : null}
            </div>
            <div className="review-choice-flags">
              {answersVisible && selected ? <span>Your answer</span> : null}
              {answersVisible && correct ? <span>Correct</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function statusLabel(status) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function scoreToSatTotal(value) {
  if (!value) return 400;
  return value > 100 ? value : Math.round(400 + (value / 100) * 1200);
}

function scoreToSatSection(value) {
  if (!value) return 200;
  return value > 100 ? value : Math.round(200 + (value / 100) * 600);
}

export default function ExamReviewPage() {
  const { attemptId } = useParams();
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [viewCount, setViewCount] = useState("10");
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [reviewAnswersVisible, setReviewAnswersVisible] = useState(true);
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [surveyStep, setSurveyStep] = useState(1);

  useEffect(() => {
    async function loadReview() {
      const response = await getAttempt(attemptId);
      setAttempt(response);
      if (response.aiFeedback) {
        setFeedback(response.aiFeedback);
      } else if (response.status !== "IN_PROGRESS") {
        const generated = await generateFeedback(attemptId).catch(() => null);
        if (generated) {
          setFeedback(generated);
        }
      }
      setLoading(false);
    }

    loadReview().catch(() => setLoading(false));
  }, [attemptId]);

  useEffect(() => {
    if (!attempt || attempt.status === "IN_PROGRESS") return;
    const key = `monoprep-exam-survey:${attempt.id}`;
    if (!localStorage.getItem(key)) {
      setSurveyOpen(true);
    }
  }, [attempt]);

  const rows = useMemo(() => {
    if (!attempt) return [];
    const answerMap = Object.fromEntries(
      attempt.answers.map((answer) => [answer.questionId, answer])
    );
    return attempt.exam.sections
      .flatMap((section) =>
        section.questions.map((question, index) => {
          const answer = answerMap[question.id];
          const subject = section.type === "math" ? "Math" : "Reading & Writing";
          return {
            id: question.id,
            number: index + 1,
            section: section.title,
            subject,
            domain: getReportDomain(subject, question.skill),
            question,
            answer,
            status: getAnswerStatus(answer),
          };
        })
      )
      .map((row, index) => ({ ...row, number: index + 1 }));
  }, [attempt]);

  const overview = useMemo(
    () => ({
      total: rows.length,
      correct: rows.filter((row) => row.status === "CORRECT").length,
      incorrect: rows.filter((row) => row.status === "INCORRECT").length,
      unanswered: rows.filter((row) => row.status === "UNANSWERED").length,
      accuracy: rows.length
        ? Math.round(
            (rows.filter((row) => row.status === "CORRECT").length /
              rows.length) *
              100
          )
        : 0,
    }),
    [rows]
  );

  const visibleRows = useMemo(() => {
    const filtered = rows.filter((row) => {
      if (filter === "MARKED") return Boolean(row.answer?.markedForReview);
      return filter === "ALL" || row.status === filter;
    });
    return viewCount === "ALL"
      ? filtered
      : filtered.slice(0, Number(viewCount));
  }, [filter, rows, viewCount]);
  const selectedRowIndex = selectedRow ? rows.findIndex((row) => row.id === selectedRow.id) : -1;

  if (loading) {
    return (
      <AppLayout
        title="Exam Review"
        subtitle="See your results, answer details and AI-supported next steps."
      >
        <Loader label="Loading review..." />
      </AppLayout>
    );
  }

  if (!attempt) {
    return (
      <AppLayout
        title="Exam Review"
        subtitle="The selected attempt could not be loaded."
      >
        <EmptyState
          icon={FileQuestion}
          title="Review unavailable"
          message="This attempt may have been deleted or is no longer available."
          actionLabel="Back to practice"
          actionTo="/practice"
        />
      </AppLayout>
    );
  }

  const aiQuestionFeedback = feedback?.questionAnalysis?.find(
    (item) => item.questionId === selectedRow?.id
  );
  const totalSatScore = scoreToSatTotal(attempt.totalScore);
  const readingSatScore = scoreToSatSection(attempt.readingWritingScore);
  const mathSatScore = scoreToSatSection(attempt.mathScore);

  async function handleDownloadReport() {
    const sectionMap = new Map();
    rows.forEach((row) => {
      const current = sectionMap.get(row.section) || { title: row.section, total: 0, correct: 0 };
      current.total += 1;
      if (row.status === "CORRECT") current.correct += 1;
      sectionMap.set(row.section, current);
    });

    const domains = REPORT_DOMAINS.map((domain) => {
      const domainRows = rows.filter((row) => row.subject === domain.subject && row.domain === domain.name);
      const correct = domainRows.filter((row) => row.status === "CORRECT").length;
      return {
        subject: domain.subject,
        name: domain.name,
        total: domainRows.length,
        correct,
        accuracy: domainRows.length ? Math.round((correct / domainRows.length) * 100) : 0,
      };
    });

    const { downloadExamReviewPdf } = await import("../utils/examReviewPdf.js");
    await downloadExamReviewPdf({
      studentName: user?.fullName || user?.username || user?.email || "MonoPrep student",
      examTitle: attempt.exam.title,
      submittedDate: new Date(attempt.submittedAt || attempt.startedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      totalScore: totalSatScore,
      readingScore: readingSatScore,
      mathScore: mathSatScore,
      readingProgress: Math.max(0, Math.min(100, Math.round((readingSatScore - 200) / 6))),
      mathProgress: Math.max(0, Math.min(100, Math.round((mathSatScore - 200) / 6))),
      timeSpent: formatSeconds(attempt.timeSpent || 0),
      totalQuestions: overview.total,
      correct: overview.correct,
      incorrect: overview.incorrect,
      unanswered: overview.unanswered,
      accuracy: overview.accuracy,
      domains,
      platformUrl: window.location.origin,
      feedback: feedback?.overallFeedback || "",
      sections: Array.from(sectionMap.values()).map((section) => ({
        ...section,
        accuracy: section.total ? Math.round((section.correct / section.total) * 100) : 0,
      })),
      questions: rows.map((row) => ({
        number: row.number,
        section: row.section,
        skill: row.question.skill?.replaceAll("_", " ") || "General",
        studentAnswer: getDisplayAnswer(row.answer?.answer),
        correctAnswer: getCorrectDisplay(row.question),
        status: row.status,
      })),
    });
  }

  function finishSurvey() {
    localStorage.setItem(
      `monoprep-exam-survey:${attempt.id}`,
      JSON.stringify({ rating, submittedAt: new Date().toISOString() })
    );
    setSurveyOpen(false);
  }

  return (
    <AppLayout
      title="Your SAT Results"
      subtitle={`${attempt.exam.title} - performance report and question-level review.`}
      actions={
        <>
          <Button variant="ghost" onClick={handleDownloadReport}>
            <Download aria-hidden="true" /> Download Report
          </Button>
          <Link
            className="button button-primary"
            to={`/attempts/${attempt.id}/ai-feedback`}
          >
            <Sparkles aria-hidden="true" /> Open AI Feedback
          </Link>
        </>
      }
    >
      <nav className="review-page-nav" aria-label="Result sections">
        <a href="#score-summary">Score summary</a>
        <a href="#question-review">Question review</a>
        <Link to={`/attempts/${attempt.id}/ai-feedback`}>AI coaching</Link>
      </nav>

      <section id="score-summary" className="review-results-hero">
        <img src="/monoprep-logo.png" alt="" className="review-hero-watermark" aria-hidden="true" />
        <div className="review-hero-copy">
          <span>{attempt.scoreIsEstimated ? "Estimated SAT score" : "Completed score report"}</span>
          <h2>{attempt.exam.title}</h2>
          <p><Clock3 aria-hidden="true" /> {formatSeconds(attempt.timeSpent || 0)} total testing time</p>
        </div>
        <div className="review-total-score">
          <span>Total score</span>
          <strong>{totalSatScore}</strong>
          <small>out of 1600</small>
        </div>
        <div className="review-section-scores">
          <article>
            <span>Reading &amp; Writing</span>
            <strong>{readingSatScore}<small>/800</small></strong>
            <i><b style={{ width: `${Math.max(0, Math.min(100, (readingSatScore - 200) / 6))}%` }} /></i>
          </article>
          <article>
            <span>Math</span>
            <strong>{mathSatScore}<small>/800</small></strong>
            <i><b style={{ width: `${Math.max(0, Math.min(100, (mathSatScore - 200) / 6))}%` }} /></i>
          </article>
        </div>
      </section>

      <div className="review-metric-row" aria-label="Attempt metrics">
        <article><FileQuestion aria-hidden="true" /><span>Total questions</span><strong>{overview.total}</strong></article>
        <article className="correct"><CheckCircle2 aria-hidden="true" /><span>Correct</span><strong>{overview.correct}</strong></article>
        <article className="incorrect"><XCircle aria-hidden="true" /><span>Incorrect</span><strong>{overview.incorrect}</strong></article>
        <article className="accuracy"><Target aria-hidden="true" /><span>Accuracy</span><strong>{overview.accuracy}%</strong></article>
      </div>

      <section className="review-insight-panel">
        <div><Sparkles aria-hidden="true" /><span>MonoPrep insight</span></div>
        <p>{feedback?.overallFeedback || "Detailed coaching is ready in your AI feedback report."}</p>
        <Link to={`/attempts/${attempt.id}/ai-feedback`}>View complete feedback</Link>
      </section>

      <section id="question-review" className="review-question-workspace">
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
                className={filter === item ? "active" : ""}
                onClick={() => setFilter(item)}
              >
                {statusLabel(item)}
              </button>
            ))}
          </div>
          <div className="view-count">
            View:
            <PremiumSelect
              ariaLabel="Review question count"
              value={viewCount}
              onChange={setViewCount}
              options={viewCountOptions}
              className="view-count-select"
            />
          </div>
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
                    <td>
                      {showCorrectAnswers
                        ? getCorrectDisplay(row.question)
                        : "Hidden"}
                    </td>
                    <td>{getDisplayAnswer(row.answer?.answer)}</td>
                    <td>
                      <span
                        className={`pill ${
                          row.status === "CORRECT"
                            ? "success"
                            : row.status === "INCORRECT"
                            ? "danger"
                            : "warning"
                        }`}
                      >
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="table-action"
                        onClick={() => setSelectedRow(row)}
                      >
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
            title={
              rows.length ? "No questions in this filter" : "No review data yet"
            }
            message={
              rows.length
                ? "Choose another status filter to review your submitted responses."
                : "This result does not include question-level review data yet."
            }
          />
        )}
      </section>

      <Modal
        open={Boolean(selectedRow)}
        title={
          selectedRow
            ? `Question #${selectedRow.number} Review`
            : "Question Review"
        }
        className="review-modal"
        onClose={() => setSelectedRow(null)}
        actions={
          <Button variant="ghost" onClick={() => setSelectedRow(null)}>
            Close
          </Button>
        }
      >
        {selectedRow ? (
          <div className="review-detail">
            <div className="review-modal-toolbar">
              <button type="button" onClick={() => setReviewAnswersVisible((value) => !value)}>
                <Eye aria-hidden="true" /> {reviewAnswersVisible ? "Hide answers" : "Show answers"}
              </button>
              <button type="button" disabled={selectedRowIndex <= 0} onClick={() => setSelectedRow(rows[selectedRowIndex - 1])}>
                <ChevronLeft aria-hidden="true" /> Previous
              </button>
              <span>{selectedRowIndex + 1} of {rows.length}</span>
              <button type="button" disabled={selectedRowIndex >= rows.length - 1} onClick={() => setSelectedRow(rows[selectedRowIndex + 1])}>
                Next <ChevronRight aria-hidden="true" />
              </button>
            </div>
            <div className="review-detail-tags">
              <span className="pill blue">{selectedRow.section}</span>
              <span className="pill">{selectedRow.question.skill}</span>
              <span
                className={`pill ${
                  selectedRow.status === "CORRECT" ? "success" : "danger"
                }`}
              >
                {statusLabel(selectedRow.status)}
              </span>
            </div>
            {selectedRow.question.passage ? (
              <section className="review-passage-material">
                {selectedRow.question.passage.title && !/^untitled passage$/i.test(selectedRow.question.passage.title) ? <h3>{selectedRow.question.passage.title}</h3> : null}
                <PassageAssetViewer passage={selectedRow.question.passage} seamless />
                {selectedRow.question.passage.content ? <MathJaxContent block>{selectedRow.question.passage.content}</MathJaxContent> : null}
              </section>
            ) : null}
            {selectedRow.question.imageUrl && selectedRow.question.imagePlacement !== "BELOW" ? (
              <QuestionImage src={selectedRow.question.imageUrl} alt="Question illustration" />
            ) : null}
            <MathJaxContent block className="review-question-text">
              {selectedRow.question.questionText}
            </MathJaxContent>
            {selectedRow.question.formulaText ? (
              <MathJaxContent block className="review-question-formula">
                {selectedRow.question.formulaText}
              </MathJaxContent>
            ) : null}
            {selectedRow.question.imageUrl && selectedRow.question.imagePlacement === "BELOW" ? (
              <QuestionImage src={selectedRow.question.imageUrl} alt="Question illustration" />
            ) : null}
            <ReviewAnswerChoices question={selectedRow.question} answer={selectedRow.answer} answersVisible={reviewAnswersVisible} />
            {reviewAnswersVisible ? <div className="review-answer-grid">
              <div>
                <span>Your answer</span>
                <strong>{getDisplayAnswer(selectedRow.answer?.answer)}</strong>
              </div>
              <div>
                <span>Correct answer</span>
                <strong>{getCorrectDisplay(selectedRow.question)}</strong>
              </div>
            </div> : null}
            {reviewAnswersVisible ? <div className="review-explanation">
              <h4>Solution &amp; explanation</h4>
              <MathJaxContent block>
                {selectedRow.question.explanation ||
                  "No explanation available for this question."}
              </MathJaxContent>
              {selectedRow.question.explanationImageUrl ? (
                <QuestionImage src={selectedRow.question.explanationImageUrl} alt="Worked solution" />
              ) : null}
            </div> : null}
            {reviewAnswersVisible && aiQuestionFeedback ? (
              <div className="review-explanation ai">
                <h4>
                  <Sparkles aria-hidden="true" /> AI explanation
                </h4>
                <MathJaxContent block>
                  {aiQuestionFeedback.whyCorrectAnswerIsRight ||
                    aiQuestionFeedback.explanation}
                </MathJaxContent>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
      <Modal
        open={surveyOpen}
        title={
          surveyStep === 1
            ? "How challenging was this exam overall?"
            : "Thanks for the feedback"
        }
        className="exam-survey-modal"
        actions={
          surveyStep === 1 ? (
            <Button onClick={() => setSurveyStep(2)} disabled={!rating}>
              Next
            </Button>
          ) : (
            <Button onClick={finishSurvey}>View results</Button>
          )
        }
      >
        {surveyStep === 1 ? (
          <div className="survey-rating">
            <p>Rate from 1 (Very Easy) to 5 (Very Difficult)</p>
            <div className="survey-notice">
              This survey can only be submitted once per test. Your feedback
              helps us improve.
            </div>
            <div className="rating-row">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={rating === value ? "active" : ""}
                  onClick={() => setRating(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="survey-rating">
            <Star aria-hidden="true" />
            <p>Your rating was saved on this device.</p>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
