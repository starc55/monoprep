import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Loader from '../components/ui/Loader.jsx';
import { getExam } from '../services/examService.js';
import { startAttempt } from '../services/attemptService.js';
import { useExamStore } from '../store/examStore.js';

export default function ExamInstructionsPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const initializeSession = useExamStore((state) => state.initializeSession);
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');

  useEffect(() => {
    getExam(examId)
      .then(setExam)
      .catch(() => setExam(null))
      .finally(() => setLoading(false));
  }, [examId]);

  async function handleStart() {
    setStarting(true);
    setStartError('');
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => null);
      }

      const attempt = await startAttempt(examId);
      initializeSession(attempt.id);
      navigate(`/attempts/${attempt.id}/exam`);
    } catch {
      setStartError('This attempt could not be started. Please return to Practice Exams and try again.');
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
        <Card title="Unavailable">
          <p>Please return to the practice library and choose another exam.</p>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={exam.title}
      subtitle="Review the exam format, timing, and rules before entering the testing environment."
      actions={<Button onClick={handleStart}>{starting ? 'Starting...' : 'Start exam'}</Button>}
    >
      {startError ? (
        <p className="support-status error"><AlertCircle aria-hidden="true" /> {startError}</p>
      ) : null}
      <div className="content-grid two-up">
        <Card title="Exam Rules">
          <ul className="clean-list">
            <li>Fullscreen mode is requested when the exam starts.</li>
            <li>Section timers run independently and can auto-advance when time expires.</li>
            <li>Answers auto-save as you work and remain available when you move between questions.</li>
            <li>Copy, paste, and accidental page refresh are blocked inside exam mode.</li>
            <li>Correct answers remain hidden until after final submission.</li>
          </ul>
        </Card>
        <Card title="Sections">
          <ul className="clean-list">
            {exam.sections.map((section) => (
              <li key={section.id}>
                {section.title} - {section.duration} min - {section.questionsCount} questions
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppLayout>
  );
}
