import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, CheckCircle2, ChevronDown, Clock3, Crown, Gauge, Radio, Swords, Trophy, UsersRound } from 'lucide-react';
import AppLayout from '../layouts/AppLayout.jsx';
import Button from '../components/ui/Button.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Loader from '../components/ui/Loader.jsx';
import Modal from '../components/ui/Modal.jsx';
import PremiumSelect from '../components/ui/PremiumSelect.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import {
  getCompetitionOverview,
  getArena,
  joinArena,
  startBlitz,
  submitArena,
  submitBlitz
} from '../services/competitionService.js';
import '../styles/pages/competition-hub.css';

const subjectOptions = [
  { value: 'Mixed', label: 'Mixed SAT' },
  { value: 'Math', label: 'Math' },
  { value: 'Reading & Writing', label: 'Reading & Writing' }
];

const kindLabels = {
  FULL: 'Monthly Full Exam',
  MATH: 'Biweekly Math',
  ENGLISH: 'Biweekly English'
};

function formatDate(value) {
  if (!value) return 'Admin scheduling pending';
  return new Date(value).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function getEventStatus(event) {
  const now = Date.now();
  const startsAt = event.startsAt ? new Date(event.startsAt).getTime() : null;
  const endsAt = event.endsAt ? new Date(event.endsAt).getTime() : null;
  if (startsAt && startsAt > now) return 'UPCOMING';
  if (!endsAt || endsAt >= now) return 'LIVE';
  return 'ENDED';
}

export default function CompetitionPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [arenaSubject, setArenaSubject] = useState('Mixed');
  const [blitzSubject, setBlitzSubject] = useState('Mixed');
  const [startingArenaSize, setStartingArenaSize] = useState(0);
  const [startingBlitzSize, setStartingBlitzSize] = useState(0);
  const [blitzExpanded, setBlitzExpanded] = useState(false);
  const [session, setSession] = useState(null);
  const [sessionMode, setSessionMode] = useState('blitz');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const data = await getCompetitionOverview();
    setOverview(data);
  }

  useEffect(() => {
    load().catch(() => setOverview(null)).finally(() => setLoading(false));
  }, []);

  async function beginBlitz(size) {
    setStartingBlitzSize(size);
    setError('');
    try {
      const created = await startBlitz({ size, subject: blitzSubject });
      setSessionMode('blitz');
      setSession(created);
      setAnswers({});
      setQuestionIndex(0);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Blitz could not be started.');
    } finally {
      setStartingBlitzSize(0);
    }
  }

  async function beginArena(size) {
    setStartingArenaSize(size);
    setError('');
    try {
      const created = await joinArena({ size, subject: arenaSubject });
      setSessionMode('arena');
      setSession(created);
      setAnswers({});
      setQuestionIndex(0);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Arena matchmaking could not be started.');
    } finally {
      setStartingArenaSize(0);
    }
  }

  async function finishBlitz() {
    setSubmitting(true);
    setError('');
    try {
      const result = await (sessionMode === 'arena' ? submitArena : submitBlitz)(
        session.id,
        session.questions.map((question) => ({
          questionId: question.questionId,
          answer: answers[question.questionId] ?? null
        }))
      );
      setSession(result);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Blitz could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (sessionMode !== 'arena' || !session?.id || (session.status !== 'WAITING' && !(session.status === 'ACTIVE' && session.submitted))) {
      return undefined;
    }
    const interval = window.setInterval(() => {
      getArena(session.id)
        .then((next) => setSession(next))
        .catch(() => {});
    }, 3000);
    return () => window.clearInterval(interval);
  }, [session?.id, session?.status, session?.submitted, sessionMode]);

  const progress = overview?.progress || {};
  const activeQuestion = session?.questions?.[questionIndex] || null;
  const answeredCount = useMemo(
    () => Object.values(answers).filter((value) => value !== '' && value !== null).length,
    [answers]
  );

  if (loading) {
    return <AppLayout title="Competition" subtitle="Scheduled SAT challenges and live blitz rounds."><Loader label="Loading competition..." /></AppLayout>;
  }

  return (
    <AppLayout title="Competition" subtitle="Monthly exams, biweekly section battles, and fast blitz rounds powered by real results.">
      <div className="competition-hub-page">
        <section className="competition-command-grid">
          <article className="competition-rank-panel">
            <div className="competition-rank-copy">
              <span><Crown aria-hidden="true" /> Current league</span>
              <h2>{progress.league || 'Bronze'}</h2>
              <p>Exam and blitz submissions both build your rank.</p>
            </div>
            <div className="competition-level-ring"><b>{progress.level || 1}</b><span>Level</span></div>
            <div className="competition-xp-row"><span>{progress.xp || 0} XP</span><span>League score {progress.leagueScore || 0}</span></div>
            <ProgressBar value={Math.min(100, (progress.xp || 0) % 100)} tone="blue" />
          </article>
          <article className="competition-arena-panel">
            <div className="competition-arena-copy">
              <span><Radio aria-hidden="true" /> Live matchmaking</span>
              <h2>1v1 Arena</h2>
              <p>Enter a shared question race. Both players receive the same set, and the higher accuracy wins.</p>
            </div>
            <PremiumSelect ariaLabel="Arena subject" value={arenaSubject} options={subjectOptions} onChange={setArenaSubject} />
            <div className="arena-size-row">
              {[5, 10, 15].map((size) => (
                <button key={size} type="button" disabled={Boolean(startingArenaSize)} onClick={() => beginArena(size)}>
                  <UsersRound aria-hidden="true" /><b>{size}</b><span>questions</span>
                </button>
              ))}
            </div>
            {startingArenaSize ? <p className="support-status">Finding a real opponent for {startingArenaSize} questions...</p> : null}
            <small>Matchmaking pairs you with the next student using the same subject and round size.</small>
          </article>
        </section>

        <section className="competition-section">
          <header className="competition-section-head"><div><span>Official cadence</span><h2>Scheduled competitions</h2></div><CalendarDays aria-hidden="true" /></header>
          <div className="competition-cadence-row">
            <span><b>1</b> full exam / month</span>
            <span><b>1</b> math challenge / 2 weeks</span>
            <span><b>1</b> English challenge / 2 weeks</span>
          </div>
          {overview?.events?.length ? (
            <div className="competition-event-grid">
              {overview.events.map((event, index) => {
                const status = getEventStatus(event);
                return (
                  <motion.article key={event.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
                    <div className="competition-event-top"><span className={`competition-status ${status.toLowerCase()}`}>{status}</span><b>{kindLabels[event.kind] || event.kind}</b></div>
                    <h3>{event.title}</h3>
                    <p>{event.description}</p>
                    <div className="competition-event-meta"><span><Clock3 aria-hidden="true" /> {event.totalDuration} min</span><span>{formatDate(event.startsAt)}</span></div>
                    {status === 'LIVE' ? <Link className="button button-primary" to={`/exams/${event.id}/instructions`}>Enter competition</Link> : <Button variant="ghost" disabled>Opens {formatDate(event.startsAt)}</Button>}
                  </motion.article>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={CalendarDays} title="No competition is scheduled" message="Published competition exams configured by an admin or teacher will appear here." />
          )}
        </section>

        <section className="competition-section blitz-section">
          <header className="blitz-section-heading">
            <div><span>Solo speed practice</span><h2>Blitz Arena</h2><p>Fast SAT rounds that add real XP to your league progress.</p></div>
            <button type="button" className={`blitz-toggle-button ${blitzExpanded ? 'active' : ''}`.trim()} onClick={() => setBlitzExpanded((value) => !value)} aria-expanded={blitzExpanded} aria-controls="blitz-round-picker">
              <Swords aria-hidden="true" /><span>{blitzExpanded ? 'Close rounds' : 'Start Blitz'}</span><ChevronDown aria-hidden="true" />
            </button>
          </header>
          <AnimatePresence initial={false}>
            {blitzExpanded ? (
              <motion.div id="blitz-round-picker" className="blitz-controls" initial={{ opacity: 0, height: 0, y: -8 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -8 }} transition={{ duration: 0.24, ease: 'easeOut' }}>
                <div className="blitz-subject-control"><span>Round subject</span><PremiumSelect ariaLabel="Blitz subject" value={blitzSubject} options={subjectOptions} onChange={setBlitzSubject} /></div>
                <div className="blitz-size-grid">
                  {[5, 10, 15].map((size) => (
                    <button key={size} type="button" disabled={Boolean(startingBlitzSize)} onClick={() => beginBlitz(size)}>
                      <Gauge aria-hidden="true" /><b>{size}</b><span>questions</span><small>{size * 20} base XP</small>
                    </button>
                  ))}
                </div>
                {startingBlitzSize ? <p className="support-status">Preparing {startingBlitzSize}-question solo blitz...</p> : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
          {error && !session ? <p className="form-error">{error}</p> : null}
        </section>
      </div>

      <Modal
        open={Boolean(session)}
        title={
          sessionMode === 'arena'
            ? session?.status === 'WAITING'
              ? 'Finding an arena opponent'
              : session?.status === 'COMPLETED'
                ? 'Arena complete'
                : `${session?.size || ''}-question 1v1 arena`
            : session?.status === 'SUBMITTED' ? 'Blitz complete' : `${session?.size || ''}-question blitz`
        }
        className="blitz-modal"
        onClose={() => setSession(null)}
        actions={session?.status === 'SUBMITTED' || session?.status === 'COMPLETED' ? <Button onClick={() => setSession(null)}>Done</Button> : null}
      >
        {sessionMode === 'arena' && session?.status === 'WAITING' ? (
          <div className="arena-waiting-state">
            <Radio aria-hidden="true" />
            <h3>Looking for a student</h3>
            <p>Keep this window open. Your shared round starts automatically when a matching student joins.</p>
          </div>
        ) : sessionMode === 'arena' && session?.status === 'ACTIVE' && session?.submitted ? (
          <div className="arena-waiting-state submitted">
            <CheckCircle2 aria-hidden="true" />
            <h3>Your answers are locked</h3>
            <p>Waiting for {session.opponent?.fullName || 'your opponent'} to submit the same round.</p>
            <strong>Your score: {session.ownScore}%</strong>
          </div>
        ) : session?.status === 'SUBMITTED' || session?.status === 'COMPLETED' ? (
          <div className="blitz-result">
            <Trophy aria-hidden="true" />
            <h3>{sessionMode === 'arena' ? `${session.ownScore}%` : `${session.score}%`}</h3>
            {sessionMode === 'arena' ? (
              <>
                <p>{session.isDraw ? 'Draw' : session.isWinner ? 'You won the arena' : `${session.opponent?.fullName || 'Opponent'} won`} · Opponent {session.opponentScore}%</p>
                <strong>The round has been added to your league XP.</strong>
              </>
            ) : (
              <><p>{session.correctCount} of {session.size} correct</p><strong>+{session.xpEarned} XP</strong></>
            )}
          </div>
        ) : activeQuestion ? (
          <div className="blitz-question-shell">
            <div className="blitz-question-progress"><span>Question {questionIndex + 1} of {session.questions.length}</span><span>{answeredCount} answered</span></div>
            <ProgressBar value={((questionIndex + 1) / session.questions.length) * 100} tone="blue" />
            <div className="blitz-question-meta"><span>{activeQuestion.subject}</span><span>{activeQuestion.difficulty}</span></div>
            <h3>{activeQuestion.prompt}</h3>
            {activeQuestion.choices?.length ? (
              <div className="blitz-choice-list">
                {activeQuestion.choices.map((choice) => (
                  <button key={choice.label} type="button" className={answers[activeQuestion.questionId] === choice.label ? 'selected' : ''} onClick={() => setAnswers((current) => ({ ...current, [activeQuestion.questionId]: choice.label }))}>
                    <b>{choice.label}</b><span>{choice.text}</span>{answers[activeQuestion.questionId] === choice.label ? <CheckCircle2 aria-hidden="true" /> : null}
                  </button>
                ))}
              </div>
            ) : (
              <input className="blitz-text-answer" value={answers[activeQuestion.questionId] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [activeQuestion.questionId]: event.target.value }))} placeholder="Enter your answer" />
            )}
            {error ? <p className="form-error">{error}</p> : null}
            <div className="blitz-navigation">
              <Button variant="ghost" disabled={questionIndex === 0} onClick={() => setQuestionIndex((index) => index - 1)}>Previous</Button>
              {questionIndex < session.questions.length - 1 ? <Button onClick={() => setQuestionIndex((index) => index + 1)}>Next</Button> : <Button disabled={submitting} onClick={finishBlitz}>{submitting ? 'Submitting...' : sessionMode === 'arena' ? 'Submit arena round' : 'Submit blitz'}</Button>}
            </div>
          </div>
        ) : null}
      </Modal>
    </AppLayout>
  );
}
