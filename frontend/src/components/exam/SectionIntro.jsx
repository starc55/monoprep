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
  onReviewQuestion,
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
    const master = context.createGain();
    const rainFilter = context.createBiquadFilter();
    const rainGain = context.createGain();
    const swell = context.createOscillator();
    const swellDepth = context.createGain();
    const noiseBuffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const noise = noiseBuffer.getChannelData(0);
    for (let index = 0; index < noise.length; index += 1) {
      noise[index] = (Math.random() * 2 - 1) * (0.68 + Math.random() * 0.32);
    }
    const rain = context.createBufferSource();
    rain.buffer = noiseBuffer;
    rain.loop = true;
    rainFilter.type = 'lowpass';
    rainFilter.frequency.value = 1450;
    rainFilter.Q.value = 0.4;
    rainGain.gain.value = 0.055;
    master.gain.value = 0.72;
    swell.type = 'sine';
    swell.frequency.value = 0.09;
    swellDepth.gain.value = 0.018;
    swell.connect(swellDepth);
    swellDepth.connect(rainGain.gain);
    rain.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(master);
    master.connect(context.destination);
    rain.start();
    swell.start();
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
            <span>Nature Soundscape</span>
            <small>{musicOn ? 'Soft rain is playing' : 'Rain and distant wind'}</small>
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
            <span>Review answered, flagged, and unanswered items before moving forward.</span>
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
                <button
                  type="button"
                  key={question.id}
                  className={`${hasAnswer(answers[question.id]) ? 'answered' : ''} ${reviewFlags[question.id] ? 'flagged' : ''}`.trim()}
                  onClick={() => onReviewQuestion?.(index)}
                  aria-label={`Review question ${index + 1}`}
                >
                  {index + 1}
                </button>
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
