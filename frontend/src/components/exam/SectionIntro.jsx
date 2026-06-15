import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Flag, HelpCircle, Play, VolumeX } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { formatSeconds } from '../../utils/format.js';

function hasAnswer(answer) {
  return Boolean(answer?.value || answer?.values?.length);
}

export default function SectionIntro({
  section,
  completedSection,
  answers = {},
  reviewFlags = {},
  onContinue,
  isFinal = false
}) {
  const [mode, setMode] = useState(completedSection ? 'summary' : 'intro');
  const [secondsLeft, setSecondsLeft] = useState(600);
  const [musicOn, setMusicOn] = useState(false);
  const audioRef = useRef(null);

  const stats = useMemo(() => {
    const questions = completedSection?.questions || [];
    const answered = questions.filter((question) => hasAnswer(answers[question.id])).length;
    const flagged = questions.filter((question) => reviewFlags[question.id]).length;
    return {
      total: questions.length,
      answered,
      flagged,
      unanswered: Math.max(0, questions.length - answered)
    };
  }, [answers, completedSection?.questions, reviewFlags]);

  useEffect(() => {
    if (mode !== 'break') return undefined;
    const intervalId = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [mode]);

  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.close().catch(() => null);
    }
  }, []);

  function toggleMusic() {
    if (audioRef.current) {
      audioRef.current.close().catch(() => null);
      audioRef.current = null;
      setMusicOn(false);
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const gain = context.createGain();
    const low = context.createOscillator();
    const high = context.createOscillator();
    low.type = 'sine';
    high.type = 'triangle';
    low.frequency.value = 196;
    high.frequency.value = 392;
    gain.gain.value = 0.018;
    low.connect(gain);
    high.connect(gain);
    gain.connect(context.destination);
    low.start();
    high.start();
    audioRef.current = context;
    setMusicOn(true);
  }

  if (mode === 'break') {
    return (
      <div className="scheduled-break-screen">
        <div className="break-stars" aria-hidden="true" />
        <section className="break-panel">
          <p>Take a moment to relax</p>
          <strong>{formatSeconds(secondsLeft)}</strong>
          <Button onClick={onContinue}>Resume Exam</Button>
          <button type="button" className="relaxing-music-button" onClick={toggleMusic}>
            {musicOn ? <VolumeX aria-hidden="true" /> : <Play aria-hidden="true" />}
            <span>Relaxing Music</span>
            <small>{musicOn ? 'Playing soft focus tone' : 'Lo-fi Chill'}</small>
          </button>
          <span>You can resume the test at any point. Use this time to rest your eyes and mind.</span>
        </section>
      </div>
    );
  }

  if (mode === 'summary' && completedSection) {
    return (
      <div className="module-complete-screen">
        <header className="module-complete-hero">
          <div>
            <h1>Module Complete!</h1>
            <p>{completedSection.title}</p>
            <span>Review your answers before moving forward.</span>
          </div>
          <div className="questions-answered-badge">
            <strong>{stats.answered}/{stats.total}</strong>
            <span>Questions Answered</span>
          </div>
        </header>

        <main className="module-complete-body">
          <div className="module-stat-row">
            <article className="module-stat answered"><span>Answered</span><strong>{stats.answered}</strong><Check aria-hidden="true" /></article>
            <article className="module-stat flagged"><span>Flagged for Review</span><strong>{stats.flagged}</strong><Flag aria-hidden="true" /></article>
            <article className="module-stat unanswered"><span>Unanswered</span><strong>{stats.unanswered}</strong><HelpCircle aria-hidden="true" /></article>
          </div>

          <section className="module-question-nav">
            <div>
              <h2>Question Navigator</h2>
              <p>Click any question number from the bottom selector in the exam to revisit it before submission.</p>
            </div>
            <div className="module-question-grid">
              {completedSection.questions.map((question, index) => (
                <span
                  key={question.id}
                  className={`${hasAnswer(answers[question.id]) ? 'answered' : ''} ${reviewFlags[question.id] ? 'flagged' : ''}`.trim()}
                >
                  {index + 1}
                </span>
              ))}
            </div>
            <div className="module-legend">
              <span><i className="answered" /> Answered ({stats.answered})</span>
              <span><i className="flagged" /> Flagged ({stats.flagged})</span>
              <span><i /> Unanswered ({stats.unanswered})</span>
            </div>
            <Button onClick={() => setMode('break')}>Continue to next section</Button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="section-transition">
      <div className="transition-card">
        <span className="card-eyebrow">{isFinal ? 'Final step' : 'Section transition'}</span>
        <h2>{section.title}</h2>
        <p>
          {isFinal
            ? 'You have reached the end of the exam. Review your pacing and submit when ready.'
            : `This section is timed for ${section.duration} minutes. Once you continue, focus on this module only.`}
        </p>
        <Button onClick={onContinue}>{isFinal ? 'Review and Submit' : 'Begin Section'}</Button>
      </div>
    </div>
  );
}
