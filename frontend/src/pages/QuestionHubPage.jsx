import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Ban,
  BookOpen,
  Calculator,
  Check,
  ChevronDown,
  ClipboardCheck,
  FileText,
  Filter,
  Flag,
  Info,
  ListChecks,
  Play,
  RefreshCw,
  Search,
  Share2,
  Sigma,
  TimerReset,
  X
} from 'lucide-react';
import AppLayout from '../layouts/AppLayout.jsx';
import Button from '../components/ui/Button.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Loader from '../components/ui/Loader.jsx';
import FormulaReferenceDialog from '../components/exam/FormulaReferenceDialog.jsx';
import CalculatorModal from '../components/exam/renderers/CalculatorModal.jsx';
import { getQuestionBankItems } from '../services/questionBankService.js';

function readResults() {
  try {
    return JSON.parse(localStorage.getItem('monoprep-qhub-results') || '{}');
  } catch (_error) {
    return {};
  }
}

function writeResults(results) {
  localStorage.setItem('monoprep-qhub-results', JSON.stringify(results));
}

function formatDifficulty(value = '') {
  return value ? value.charAt(0) + value.slice(1).toLowerCase() : 'Medium';
}

function getChoices(item) {
  return Array.isArray(item.choices) ? item.choices.filter(Boolean) : [];
}

function getCorrectAnswer(item) {
  const answer = item.correctAnswer;
  if (Array.isArray(answer)) return answer[0];
  if (answer && typeof answer === 'object') {
    return answer.label || answer.value || answer.answer || answer.values?.[0] || Object.values(answer)[0];
  }
  return answer;
}

function getAcceptedAnswers(item) {
  const accepted = item.acceptedAnswers || item.correctAnswer?.acceptedAnswers || item.correctAnswer?.values;
  if (Array.isArray(accepted)) return accepted;
  const single = getCorrectAnswer(item);
  return single === undefined || single === null ? [] : [single];
}

function normalizeAnswer(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function isCorrect(item, answer) {
  if (!answer) return false;
  const choices = getChoices(item);
  if (choices.length) {
    return normalizeAnswer(getCorrectAnswer(item)) === normalizeAnswer(answer);
  }
  return getAcceptedAnswers(item).some((entry) => normalizeAnswer(entry) === normalizeAnswer(answer));
}

function subjectIcon(subject) {
  return subject === 'Math' ? Sigma : BookOpen;
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, seconds || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function groupBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || 'General';
    if (!acc[value]) acc[value] = [];
    acc[value].push(item);
    return acc;
  }, {});
}

export default function QuestionHubPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [stage, setStage] = useState('filters');
  const [sourceMode, setSourceMode] = useState('COLLEGE_BOARD');
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('Math');
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [difficulty, setDifficulty] = useState('ALL');
  const [answeredStatus, setAnsweredStatus] = useState('ALL');
  const [markedFilter, setMarkedFilter] = useState('ALL');
  const [bluebookFilter, setBluebookFilter] = useState('INCLUDED');
  const [expanded, setExpanded] = useState(() => new Set(['Math', 'Reading & Writing']));
  const [results, setResults] = useState(readResults);
  const [activeSession, setActiveSession] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [eliminateMode, setEliminateMode] = useState(false);
  const [eliminated, setEliminated] = useState({});
  const [attemptCounts, setAttemptCounts] = useState({});
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    getQuestionBankItems()
      .then((rows) => setItems(rows))
      .catch((error) => {
        setLoadError(error?.response?.data?.message || 'Question Hub could not be loaded.');
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeSession) return undefined;
    setElapsed(Math.floor((Date.now() - activeSession.startedAt) / 1000));
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - activeSession.startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeSession]);

  const availableDomains = useMemo(() => {
    const sourceItems = sourceMode === 'PRACTICE_TESTS'
      ? items.filter((item) => item.source === 'practice_exam')
      : items;
    const subjects = subject === 'ALL' ? sourceItems : sourceItems.filter((item) => item.subject === subject);
    return groupBy(subjects, 'domain');
  }, [items, sourceMode, subject]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const saved = results[item.id];
      const haystack = `${item.subject} ${item.domain} ${item.skill} ${item.prompt}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesSource = sourceMode === 'COLLEGE_BOARD' || item.source === 'practice_exam';
      const matchesSubject = subject === 'ALL' || item.subject === subject;
      const matchesDomain = !selectedDomains.length || selectedDomains.includes(item.domain);
      const matchesDifficulty = difficulty === 'ALL' || item.difficulty === difficulty;
      const matchesMarked =
        markedFilter === 'ALL' ||
        (markedFilter === 'YES' ? saved?.marked : !saved?.marked);
      const matchesBluebook =
        bluebookFilter === 'ALL' ||
        (bluebookFilter === 'INCLUDED' ? item.isBluebook !== false : item.isBluebook === false);
      const matchesAnswered =
        answeredStatus === 'ALL' ||
        (answeredStatus === 'CORRECT' && saved?.correct) ||
        (answeredStatus === 'INCORRECT' && saved?.answered && !saved?.correct) ||
        (answeredStatus === 'NOT_ANSWERED' && !saved?.answered);

      return matchesSource && matchesQuery && matchesSubject && matchesDomain && matchesDifficulty && matchesMarked && matchesBluebook && matchesAnswered;
    });
  }, [answeredStatus, bluebookFilter, difficulty, items, markedFilter, query, results, selectedDomains, sourceMode, subject]);

  const grouped = useMemo(() => groupBy(filteredItems, 'subject'), [filteredItems]);
  const domainBreakdown = useMemo(() => Object.entries(groupBy(filteredItems, 'domain')).map(([domain, rows]) => ({
    domain,
    count: rows.length,
    answered: rows.filter((item) => results[item.id]?.answered).length,
    correct: rows.filter((item) => results[item.id]?.correct).length
  })), [filteredItems, results]);

  const progress = useMemo(() => {
    const answered = items.filter((item) => results[item.id]?.answered).length;
    const correct = items.filter((item) => results[item.id]?.correct).length;
    return {
      answered,
      correct,
      total: items.length,
      percentage: items.length ? Math.round((answered / items.length) * 100) : 0
    };
  }, [items, results]);

  const activeItem = activeSession?.items?.[activeSession.index] || null;
  const activeChoices = activeItem ? getChoices(activeItem) : [];
  const currentEliminated = activeItem ? eliminated[activeItem.id] || [] : [];
  const questionNumber = activeSession ? activeSession.index + 1 : 0;

  function resetFilters() {
    setQuery('');
    setSubject('Math');
    setSelectedDomains([]);
    setDifficulty('ALL');
    setAnsweredStatus('ALL');
    setMarkedFilter('ALL');
    setBluebookFilter('INCLUDED');
  }

  function toggleSubject(name) {
    const next = new Set(expanded);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setExpanded(next);
  }

  function toggleDomain(domain) {
    setSelectedDomains((current) => (
      current.includes(domain)
        ? current.filter((item) => item !== domain)
        : [...current, domain]
    ));
  }

  function showSummary() {
    setStage('summary');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function beginExamSession(sessionItems = filteredItems, title = 'Question Bank Session') {
    if (!sessionItems.length) return;
    setActiveSession({ title, items: sessionItems, index: 0, startedAt: Date.now() });
    setStage('exam');
    setSelectedAnswer(results[sessionItems[0].id]?.answer || '');
    setFeedback(null);
    setMetadataOpen(false);
    setEliminateMode(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function commitResult(item, answer) {
    const correct = isCorrect(item, answer);
    const nextAttempts = {
      ...attemptCounts,
      [item.id]: (attemptCounts[item.id] || 0) + 1
    };
    const next = {
      ...results,
      [item.id]: {
        ...results[item.id],
        answered: true,
        answer,
        correct,
        attempts: nextAttempts[item.id],
        updatedAt: new Date().toISOString()
      }
    };
    setAttemptCounts(nextAttempts);
    setResults(next);
    writeResults(next);
    setFeedback(correct ? 'correct' : 'incorrect');
  }

  function toggleMarked(item) {
    const next = {
      ...results,
      [item.id]: {
        ...results[item.id],
        marked: !results[item.id]?.marked
      }
    };
    setResults(next);
    writeResults(next);
  }

  function toggleEliminated(label) {
    if (!activeItem) return;
    setEliminated((current) => {
      const row = current[activeItem.id] || [];
      return {
        ...current,
        [activeItem.id]: row.includes(label)
          ? row.filter((item) => item !== label)
          : [...row, label]
      };
    });
  }

  function goToQuestion(index) {
    if (!activeSession || !activeSession.items[index]) return;
    const nextItem = activeSession.items[index];
    setActiveSession({ ...activeSession, index });
    setSelectedAnswer(results[nextItem.id]?.answer || '');
    setFeedback(null);
    setEliminateMode(false);
  }

  function goNext() {
    if (!activeSession) return;
    const nextIndex = activeSession.index + 1;
    if (nextIndex >= activeSession.items.length) {
      setActiveSession(null);
      setStage('summary');
      setSelectedAnswer('');
      setFeedback(null);
      return;
    }
    goToQuestion(nextIndex);
  }

  function shareSession() {
    const payload = `MonoPrep Question Hub: ${activeSession?.title || 'practice'} (${questionNumber}/${activeSession?.items?.length || 0})`;
    if (navigator.share) {
      navigator.share({ title: 'MonoPrep Question Hub', text: payload }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(payload);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Question Hub" subtitle="Build focused practice sessions from SAT domains and skills.">
        <Loader label="Loading question hub..." />
      </AppLayout>
    );
  }

  if (stage === 'exam' && activeItem) {
    return (
      <AppLayout title="Question Hub" subtitle="Mini SAT exam workspace with reference, calculator and review controls.">
        <section className="qhub-exam-shell" aria-live="polite">
          <div className="qhub-exam-toolbar">
            <div className="qhub-exam-left-tools">
              <button type="button" onClick={() => setStage('summary')}>
                <ArrowLeft aria-hidden="true" />
                Session
              </button>
              <button type="button" className={feedback ? '' : 'muted'} disabled={!feedback} onClick={() => setFeedback((value) => value || 'show')}>
                <Info aria-hidden="true" />
                Explanation
              </button>
              <button type="button" className={metadataOpen ? 'active' : ''} onClick={() => setMetadataOpen((value) => !value)}>
                <ListChecks aria-hidden="true" />
                Metadata
              </button>
            </div>
            <span className="qhub-exam-timer"><TimerReset aria-hidden="true" /> {formatTime(elapsed)}</span>
            <div className="qhub-exam-right-tools">
              <button type="button" onClick={() => setReferenceOpen(true)}>
                <BookOpen aria-hidden="true" />
                Reference
              </button>
              <button type="button" onClick={() => setCalculatorOpen(true)}>
                <Calculator aria-hidden="true" />
                Calculator
              </button>
              <button type="button" className="share" onClick={shareSession}>
                <Share2 aria-hidden="true" />
                Share
              </button>
            </div>
          </div>

          {metadataOpen ? (
            <div className="qhub-exam-metadata">
              <span>{activeItem.subject}</span>
              <span>{activeItem.domain}</span>
              <span>{activeItem.skill}</span>
              <span>{formatDifficulty(activeItem.difficulty)}</span>
              {activeItem.examTitle ? <span>{activeItem.examTitle}</span> : null}
            </div>
          ) : null}

          <div className={activeItem.passage ? 'qhub-exam-body split' : 'qhub-exam-body'}>
            {activeItem.passage ? (
              <aside className="qhub-passage-panel">
                {activeItem.passageTitle ? <h2>{activeItem.passageTitle}</h2> : null}
                <p>{activeItem.passage}</p>
              </aside>
            ) : null}

            <article className="qhub-exam-question">
              <div className="qhub-question-strip">
                <span>{questionNumber}</span>
                <button type="button" className={results[activeItem.id]?.marked ? 'active' : ''} onClick={() => toggleMarked(activeItem)}>
                  <Flag aria-hidden="true" />
                  Mark for Review
                </button>
                <button type="button" className={eliminateMode ? 'active' : ''} onClick={() => setEliminateMode((value) => !value)}>
                  <Ban aria-hidden="true" />
                  Eliminate
                </button>
                <b>Attempts <small>{attemptCounts[activeItem.id] || results[activeItem.id]?.attempts || 0}</small></b>
              </div>

              {activeItem.formulaText ? <p className="qhub-formula">{activeItem.formulaText}</p> : null}
              <h2>{activeItem.prompt}</h2>
              {activeItem.imageUrl ? <img className="qhub-question-image" src={activeItem.imageUrl} alt="" /> : null}

              {activeChoices.length ? (
                <div className="qhub-exam-choices">
                  {activeChoices.map((choice) => {
                    const isEliminated = currentEliminated.includes(choice.label);
                    return (
                      <button
                        key={choice.label}
                        type="button"
                        className={`${selectedAnswer === choice.label ? 'selected' : ''} ${isEliminated ? 'eliminated' : ''}`.trim()}
                        onClick={() => {
                          if (eliminateMode) {
                            toggleEliminated(choice.label);
                            return;
                          }
                          if (!isEliminated) {
                            setSelectedAnswer(choice.label);
                            setFeedback(null);
                          }
                        }}
                      >
                        <b>{choice.label}</b>
                        <span>{choice.text}</span>
                        {choice.imageUrl ? <img src={choice.imageUrl} alt="" /> : null}
                        {isEliminated ? <X aria-hidden="true" /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <label className="qhub-free-answer">
                  <span>Enter your answer:</span>
                  <input
                    value={selectedAnswer}
                    onChange={(event) => {
                      setSelectedAnswer(event.target.value);
                      setFeedback(null);
                    }}
                    placeholder="Your answer..."
                  />
                </label>
              )}

              {feedback ? (
                <div className={`qhub-feedback ${feedback === 'correct' ? 'correct' : 'incorrect'}`}>
                  <strong>{feedback === 'correct' ? 'Correct' : `Correct answer: ${getCorrectAnswer(activeItem) || getAcceptedAnswers(activeItem).join(', ')}`}</strong>
                  {activeItem.explanation ? <p>{activeItem.explanation}</p> : null}
                </div>
              ) : null}
            </article>
          </div>

          <footer className="qhub-exam-footer">
            <Button variant="ghost" disabled={!activeSession.index} onClick={() => goToQuestion(activeSession.index - 1)}>
              <ArrowLeft aria-hidden="true" />
              Previous
            </Button>
            <div className="qhub-progress-pill">
              <Check aria-hidden="true" />
              Progress: {activeSession.items.filter((item) => results[item.id]?.answered).length} of {activeSession.items.length} questions checked
            </div>
            <select value={activeSession.index} onChange={(event) => goToQuestion(Number(event.target.value))}>
              {activeSession.items.map((item, index) => (
                <option key={item.id} value={index}>Question {index + 1} of {activeSession.items.length}</option>
              ))}
            </select>
            <Button disabled={!selectedAnswer} onClick={() => commitResult(activeItem, selectedAnswer)}>
              <Check aria-hidden="true" />
              Check
            </Button>
            <Button variant="secondary" onClick={goNext}>
              {questionNumber >= activeSession.items.length ? 'Finish' : 'Next'}
            </Button>
          </footer>
        </section>
        <FormulaReferenceDialog open={referenceOpen} text={activeItem.formulaText} onClose={() => setReferenceOpen(false)} />
        <CalculatorModal open={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
      </AppLayout>
    );
  }

  if (stage === 'summary') {
    return (
      <AppLayout title="Question Hub" subtitle="Review your filtered session before starting the mini exam.">
        <section className="qhub-summary-card">
          <div className="qhub-summary-head">
            <button type="button" onClick={() => setStage('filters')}><ArrowLeft aria-hidden="true" /> Edit Configuration</button>
            <div>
              <h2>Your Practice Test Question Bank Session</h2>
              <p>Ready to begin your personalized practice session</p>
            </div>
          </div>

          <div className="qhub-summary-stats">
            <article>
              <span>Total Questions</span>
              <strong>{filteredItems.length.toLocaleString()}</strong>
            </article>
            <article>
              <span>Questions Answered</span>
              <strong>{filteredItems.filter((item) => results[item.id]?.answered).length}</strong>
            </article>
            <article>
              <span>Time Elapsed</span>
              <strong>00:00</strong>
            </article>
            <article className="compact">
              <span>Session Progress</span>
              <b>{filteredItems.length ? Math.round((filteredItems.filter((item) => results[item.id]?.answered).length / filteredItems.length) * 100) : 0}%</b>
              <i />
            </article>
          </div>

          <div className="qhub-domain-breakdown">
            <h3>Domain Breakdown</h3>
            {domainBreakdown.length ? domainBreakdown.map((row) => (
              <article key={row.domain}>
                <strong>{row.domain}</strong>
                <span>{row.count} questions - {row.answered} answered - {row.correct} correct</span>
              </article>
            )) : (
              <p>No questions match these filters.</p>
            )}
          </div>

          <div className="qhub-summary-actions">
            <Button variant="ghost" onClick={() => setStage('filters')}>
              <ArrowLeft aria-hidden="true" />
              Edit Configuration
            </Button>
            <Button disabled={!filteredItems.length} onClick={() => beginExamSession(filteredItems, 'Filtered Question Bank Session')}>
              <Play aria-hidden="true" />
              Begin Test Session
            </Button>
          </div>
        </section>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Question Hub" subtitle="Build focused practice sessions from SAT domains and skills.">
      <section className="qhub-board qhub-filter-workspace">
        <div className="qhub-board-head">
          <div>
            <h2>Create Your Session</h2>
            <p>Select filters to build a personalized practice test from available question bank and practice exam questions.</p>
          </div>
          <div className="qhub-tabs" role="tablist" aria-label="Question source">
            <button type="button" className={sourceMode === 'COLLEGE_BOARD' ? 'active' : ''} onClick={() => setSourceMode('COLLEGE_BOARD')}>
              <BookOpen aria-hidden="true" /> College Board
            </button>
            <button type="button" className={sourceMode === 'PRACTICE_TESTS' ? 'active' : ''} onClick={() => setSourceMode('PRACTICE_TESTS')}>
              <FileText aria-hidden="true" /> Practice Tests
            </button>
          </div>
        </div>

        {loadError ? <p className="form-error">{loadError}</p> : null}

        <div className="qhub-progress-grid">
          <article>
            <span>Progress</span>
            <strong>{progress.percentage}<small>%</small></strong>
            <p>{progress.answered} of {progress.total} answered</p>
          </article>
          <article>
            <span>Total Time Spent</span>
            <strong>{formatTime(Object.values(results).reduce((sum, row) => sum + (row.timeSpent || 0), 0))}</strong>
            <p>Across questions saved in your practice history</p>
          </article>
        </div>

        <label className="hub-search qhub-main-search">
          <Search aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search skill, domain, or prompt..." />
        </label>

        <div className="qhub-filter-section">
          <h3><BookOpen aria-hidden="true" /> Subject</h3>
          <div className="qhub-chip-row">
            {['Math', 'Reading & Writing', 'ALL'].map((value) => (
              <button
                key={value}
                type="button"
                className={subject === value ? 'active' : ''}
                onClick={() => {
                  setSubject(value);
                  setSelectedDomains([]);
                }}
              >
                {value === 'ALL' ? 'All Subjects' : value}
              </button>
            ))}
          </div>
        </div>

        <div className="qhub-filter-section">
          <h3><Filter aria-hidden="true" /> Domains</h3>
          {Object.keys(availableDomains).length ? (
            <div className="qhub-domain-selector">
              {Object.entries(availableDomains).map(([domain, rows]) => (
                <button
                  key={domain}
                  type="button"
                  className={selectedDomains.includes(domain) ? 'active' : ''}
                  onClick={() => toggleDomain(domain)}
                >
                  <strong>{domain}</strong>
                  <span>{rows.length} questions</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="helper-copy">No domains are available for the selected source yet.</p>
          )}
        </div>

        <div className="qhub-filter-grid">
          <fieldset>
            <legend><TimerReset aria-hidden="true" /> Difficulty</legend>
            {['EASY', 'MEDIUM', 'HARD', 'ALL'].map((value) => (
              <button key={value} type="button" className={difficulty === value ? 'active' : ''} onClick={() => setDifficulty(value)}>
                {value === 'ALL' ? 'All' : formatDifficulty(value)}
              </button>
            ))}
          </fieldset>
          <fieldset>
            <legend><Flag aria-hidden="true" /> Marked for Review</legend>
            {[
              ['YES', 'Yes'],
              ['NO', 'No'],
              ['ALL', 'All']
            ].map(([value, label]) => (
              <button key={value} type="button" className={markedFilter === value ? 'active' : ''} onClick={() => setMarkedFilter(value)}>
                {label}
              </button>
            ))}
          </fieldset>
          <fieldset>
            <legend><ClipboardCheck aria-hidden="true" /> Answered Status</legend>
            {[
              ['CORRECT', 'Correct'],
              ['INCORRECT', 'Incorrect'],
              ['NOT_ANSWERED', 'Not Answered'],
              ['ALL', 'All']
            ].map(([value, label]) => (
              <button key={value} type="button" className={answeredStatus === value ? 'active' : ''} onClick={() => setAnsweredStatus(value)}>
                {label}
              </button>
            ))}
          </fieldset>
          <fieldset>
            <legend><FileText aria-hidden="true" /> Bluebook Questions</legend>
            {[
              ['INCLUDED', 'Included'],
              ['EXCLUDED', 'Excluded'],
              ['ALL', 'All']
            ].map(([value, label]) => (
              <button key={value} type="button" className={bluebookFilter === value ? 'active' : ''} onClick={() => setBluebookFilter(value)}>
                {label}
              </button>
            ))}
          </fieldset>
        </div>

        <div className="qhub-filter-actions">
          <Button variant="ghost" onClick={resetFilters}>
            <RefreshCw aria-hidden="true" />
            Reset Filters
          </Button>
          <Button onClick={showSummary} disabled={!filteredItems.length}>
            <Filter aria-hidden="true" />
            Apply Filters
          </Button>
        </div>

        <div className="qhub-subject-head">
          <div>
            <h3>Browse by Subject</h3>
            <p>Expand a subject, choose a domain or skill, and start a quick practice session.</p>
          </div>
          <span className="profile-chip"><ClipboardCheck aria-hidden="true" /> {filteredItems.length} questions</span>
        </div>

        {filteredItems.length ? (
          <div className="qhub-subject-list">
            {Object.entries(grouped).map(([name, rows]) => {
              const Icon = subjectIcon(name);
              const isExpanded = expanded.has(name);
              const bySkill = rows.reduce((acc, item) => {
                const key = `${item.domain}::${item.skill}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(item);
                return acc;
              }, {});

              return (
                <article key={name} className="qhub-subject-card">
                  <div className="qhub-subject-row">
                    <span className="settings-card-icon blue"><Icon aria-hidden="true" /></span>
                    <button type="button" onClick={() => setSubject(subject === name ? 'ALL' : name)}>
                      <strong>{name}</strong>
                      <small>{rows.length} questions</small>
                    </button>
                    <button type="button" className="icon-button" onClick={() => toggleSubject(name)} aria-label={`Toggle ${name}`}>
                      <ChevronDown aria-hidden="true" />
                    </button>
                    <button type="button" className="qhub-play" onClick={() => beginExamSession(rows, `${name} practice`)}>
                      <Play aria-hidden="true" />
                    </button>
                  </div>
                  {isExpanded ? (
                    <div className="qhub-skill-list">
                      {Object.entries(bySkill).map(([key, skillRows]) => {
                        const [domainName, skillName] = key.split('::');
                        return (
                          <button key={key} type="button" onClick={() => beginExamSession(skillRows, skillName)}>
                            <span>
                              <strong>{skillName}</strong>
                              <small>{domainName} - {skillRows.length} questions</small>
                            </span>
                            <Play aria-hidden="true" />
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Calculator}
            title="No questions found"
            message="Admin-added items or published practice exam questions will appear here when they match your filters."
          />
        )}
      </section>
    </AppLayout>
  );
}
