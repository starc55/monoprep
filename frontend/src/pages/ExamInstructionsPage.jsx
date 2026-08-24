import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, MonitorUp, Save, ShieldCheck } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "../layouts/AppLayout.jsx";
import Button from "../components/ui/Button.jsx";
import Loader from "../components/ui/Loader.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { getExam } from "../services/examService.js";
import { startAttempt } from "../services/attemptService.js";
import { useExamStore } from "../store/examStore.js";

export default function ExamInstructionsPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const initializeSession = useExamStore((state) => state.initializeSession);
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    getExam(examId)
      .then(setExam)
      .catch(() => setExam(null))
      .finally(() => setLoading(false));
  }, [examId]);

  async function handleStart() {
    setStarting(true);
    setStartError("");
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => null);
      }

      const attempt = await startAttempt(examId);
      initializeSession(attempt.id);
      navigate(`/attempts/${attempt.id}/exam`);
    } catch (error) {
      const previousAttemptId = error.response?.data?.details?.attemptId;
      if (error.response?.status === 409 && previousAttemptId) {
        navigate(`/attempts/${previousAttemptId}/review`, { replace: true });
        return;
      }
      setStartError(
        error.response?.data?.message ||
          "This attempt could not be started. Please return to Practice Exams and try again."
      );
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <AppLayout
        title="Exam Instructions"
        subtitle="Review the exam format, timing, and rules before entering the testing environment."
      >
        <Loader label="Loading exam instructions..." />
      </AppLayout>
    );
  }

  if (!exam) {
    return (
      <AppLayout
        title="Exam Instructions"
        subtitle="The selected exam could not be loaded."
      >
        <EmptyState title="Exam unavailable" message="Please return to the practice library and choose another exam." actionLabel="Back to practice" actionTo="/practice" />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Exam Instructions"
      subtitle="Review the official testing flow before the timer starts."
    >
      <main className="exam-instructions-page">
        <section className="exam-instructions-summary">
          <div><span className="instruction-eyebrow">{exam.source === "OFFICIAL" ? "Official SAT" : "MonoPrep SAT"}</span><h1>{exam.title}</h1><p>{exam.description}</p></div>
          <dl>
            <div><dt>Total time</dt><dd>{exam.totalDuration} min</dd></div>
            <div><dt>Sections</dt><dd>{exam.sections.length}</dd></div>
            <div><dt>Questions</dt><dd>{exam.sections.reduce((total, section) => total + (section.questionsCount || 0), 0)}</dd></div>
          </dl>
        </section>

        <nav className="instruction-flow" aria-label="Exam start checklist">
          <div className="complete"><span>1</span><b>Review format</b><small>Timing and modules</small></div>
          <i aria-hidden="true" />
          <div className="active"><span>2</span><b>Confirm readiness</b><small>Rules and workspace</small></div>
          <i aria-hidden="true" />
          <div><span>3</span><b>Begin exam</b><small>Timer starts immediately</small></div>
        </nav>

        {startError ? <p className="support-status error"><AlertCircle aria-hidden="true" /> {startError}</p> : null}

        <div className="exam-instructions-grid">
          <section className="instruction-rules-panel">
            <header><span>Before you begin</span><h2>Testing rules</h2></header>
            <ul>
              <li><MonitorUp aria-hidden="true" /><span><b>Stay in the exam window</b><small>Fullscreen is requested at launch and focus changes are recorded.</small></span></li>
              <li><Clock3 aria-hidden="true" /><span><b>Watch each module timer</b><small>When time reaches zero, MonoPrep advances or submits automatically.</small></span></li>
              <li><Save aria-hidden="true" /><span><b>Answers save automatically</b><small>You can move between questions without pressing a separate save button.</small></span></li>
              <li><ShieldCheck aria-hidden="true" /><span><b>Results stay protected</b><small>Correct answers and explanations appear only after final submission.</small></span></li>
            </ul>
          </section>

          <section className="instruction-modules-panel">
            <header><span>Exam structure</span><h2>Modules</h2></header>
            <ol>
              {exam.sections.map((section, index) => (
                <li key={section.id}><span>{index + 1}</span><div><b>{section.title}</b><small>{section.type.replaceAll("_", " ")}</small></div><strong>{section.duration} min</strong><em>{section.questionsCount} questions</em></li>
              ))}
            </ol>
            {exam.type === "FULL_LENGTH" ? <p className="instruction-policy"><AlertCircle aria-hidden="true" /> This full-length exam can be submitted once. Practice exams may be retaken.</p> : null}
          </section>
        </div>

        <section className="exam-readiness-bar">
          <label><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /><span><CheckCircle2 aria-hidden="true" /><b>I am ready to begin</b><small>The timer starts immediately after entering the exam room.</small></span></label>
          <Button onClick={handleStart} disabled={starting || !acknowledged}>{starting ? "Starting exam..." : <>Start exam <ArrowRight aria-hidden="true" /></>}</Button>
        </section>
      </main>
    </AppLayout>
  );
}
