import { useMemo, useState } from 'react';
import { BookMarked, CheckCircle2, Layers, Plus, RotateCw, Search, Sparkles, Trash2 } from 'lucide-react';
import AppLayout from '../layouts/AppLayout.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';

function readCustomWords() {
  try {
    return JSON.parse(localStorage.getItem('monoprep-vocab-custom') || '[]');
  } catch (_error) {
    return [];
  }
}

function writeCustomWords(words) {
  localStorage.setItem('monoprep-vocab-custom', JSON.stringify(words));
}

function readMastered() {
  try {
    return new Set(JSON.parse(localStorage.getItem('monoprep-vocab-mastered') || '[]'));
  } catch (_error) {
    return new Set();
  }
}

function writeMastered(mastered) {
  localStorage.setItem('monoprep-vocab-mastered', JSON.stringify([...mastered]));
}

export default function VocabularyPage() {
  const [query, setQuery] = useState('');
  const [customWords, setCustomWords] = useState(readCustomWords);
  const [form, setForm] = useState({ word: '', meaning: '', example: '', tag: '' });
  const [mastered, setMastered] = useState(readMastered);
  const [mode, setMode] = useState('deck');
  const [quizIndex, setQuizIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const words = customWords;
  const filtered = useMemo(
    () => words.filter((item) => `${item.word} ${item.meaning} ${item.example} ${item.tag}`.toLowerCase().includes(query.toLowerCase())),
    [query, words]
  );
  const mastery = words.length ? Math.round((mastered.size / words.length) * 100) : 0;
  const currentStudy = filtered.find((item) => !mastered.has(item.id)) || filtered[0];
  const quizWord = filtered.length ? filtered[quizIndex % filtered.length] : null;

  function toggleWord(wordId) {
    const next = new Set(mastered);
    if (next.has(wordId)) next.delete(wordId);
    else next.add(wordId);
    setMastered(next);
    writeMastered(next);
  }

  function addWord(event) {
    event.preventDefault();
    const word = form.word.trim();
    if (!word) return;
    const exists = customWords.some((item) => item.word.toLowerCase() === word.toLowerCase());
    if (exists) return;
    const entry = {
      id: `custom-${word.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
      word,
      meaning: form.meaning.trim(),
      example: form.example.trim(),
      tag: form.tag.trim(),
      source: 'My words'
    };
    const next = [entry, ...customWords];
    setCustomWords(next);
    writeCustomWords(next);
    setForm({ word: '', meaning: '', example: '', tag: '' });
  }

  function captureSelection() {
    const selection = window.getSelection()?.toString().trim();
    if (!selection) return;
    setForm((value) => ({ ...value, word: selection.replace(/\s+/g, ' ') }));
  }

  function deleteCustomWord(id) {
    const next = customWords.filter((item) => item.id !== id);
    const nextMastered = new Set([...mastered].filter((item) => item !== id));
    setCustomWords(next);
    setMastered(nextMastered);
    writeCustomWords(next);
    writeMastered(nextMastered);
  }

  function nextQuiz() {
    setRevealed(false);
    setQuizIndex((value) => (filtered.length ? (value + 1) % filtered.length : 0));
  }

  return (
    <AppLayout title="Vocabulary" subtitle="Save words from Reading practice, build your own deck, and review them daily.">
      <div className="vocab-top-grid vocab-pro-top">
        <Card className="vocab-progress-card">
          <div>
            <span className="profile-chip"><BookMarked aria-hidden="true" /> Vocabulary deck</span>
            <h2>{mastered.size}/{words.length} mastered</h2>
          </div>
          <ProgressBar value={mastery} tone="green" />
        </Card>
        <Card className="vocab-study-card">
          <span className="profile-chip"><Sparkles aria-hidden="true" /> Study now</span>
          {currentStudy ? (
            <>
              <h2>{currentStudy.word}</h2>
              <p>{currentStudy.meaning || 'Definition not added yet.'}</p>
              {currentStudy.example ? <small>{currentStudy.example}</small> : null}
            </>
          ) : (
            <p>Select text in Reading practice and save it to Vocabulary, or add your first word below.</p>
          )}
        </Card>
      </div>

      <div className="vocab-mode-tabs" role="tablist" aria-label="Vocabulary study modes">
        {[
          ['deck', 'Deck', Layers],
          ['quiz', 'Quiz', RotateCw],
          ['review', 'Review', CheckCircle2]
        ].map(([key, label, Icon]) => (
          <button key={key} type="button" className={mode === key ? 'active' : ''} onClick={() => setMode(key)}>
            <Icon aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <Card title="Add a vocabulary word" className="vocab-add-card vocab-pro-add">
        <form className="vocab-add-form" onSubmit={addWord}>
          <input
            value={form.word}
            onChange={(event) => setForm((value) => ({ ...value, word: event.target.value }))}
            placeholder="Word"
          />
          <input
            value={form.meaning}
            onChange={(event) => setForm((value) => ({ ...value, meaning: event.target.value }))}
            placeholder="Meaning"
          />
          <input
            value={form.example}
            onChange={(event) => setForm((value) => ({ ...value, example: event.target.value }))}
            placeholder="Example sentence"
          />
          <input
            value={form.tag}
            onChange={(event) => setForm((value) => ({ ...value, tag: event.target.value }))}
            placeholder="Tag"
          />
          <Button type="button" variant="ghost" onClick={captureSelection}>
            Capture Selection
          </Button>
          <Button type="submit">
            <Plus aria-hidden="true" />
            Add
          </Button>
        </form>
      </Card>

      <label className="hub-search vocab-search">
        <Search aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vocabulary..." />
      </label>

      {mode === 'quiz' ? (
        <Card className="vocab-quiz-card">
          {quizWord ? (
            <>
              <span className="profile-chip">{quizIndex + 1} / {filtered.length}</span>
              <h2>{quizWord.word}</h2>
              {revealed ? (
                <div>
                  <p>{quizWord.meaning || 'Definition not added yet.'}</p>
                  {quizWord.example ? <small>{quizWord.example}</small> : null}
                </div>
              ) : (
                <p>Think of the meaning, then reveal it.</p>
              )}
              <div className="vocab-quiz-actions">
                <Button variant="ghost" onClick={() => setRevealed((value) => !value)}>
                  {revealed ? 'Hide Meaning' : 'Reveal Meaning'}
                </Button>
                <Button onClick={() => toggleWord(quizWord.id)}>
                  <CheckCircle2 aria-hidden="true" />
                  {mastered.has(quizWord.id) ? 'Unmark' : 'Mastered'}
                </Button>
                <Button variant="secondary" onClick={nextQuiz}>Next</Button>
              </div>
            </>
          ) : (
            <EmptyState icon={BookMarked} title="No words for quiz" message="Add vocabulary words or save words from Reading practice first." />
          )}
        </Card>
      ) : null}

      {mode !== 'quiz' ? (
        filtered.length ? (
          <div className="vocab-grid">
            {filtered.map((item) => {
              const active = mastered.has(item.id);
              return (
                <article key={item.id} className={`vocab-card ${active ? 'mastered' : ''}`.trim()}>
                  <div>
                    <span className="vocab-source">{item.tag || item.source}</span>
                    <h3>{item.word}</h3>
                    <p>{item.meaning || 'Definition not added yet.'}</p>
                    {item.example ? <small>{item.example}</small> : null}
                  </div>
                  <div className="vocab-card-actions">
                    <button type="button" className="icon-only danger" onClick={() => deleteCustomWord(item.id)} aria-label={`Delete ${item.word}`}>
                      <Trash2 aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => toggleWord(item.id)}>
                      <CheckCircle2 aria-hidden="true" />
                      {active ? 'Mastered' : 'Mark'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={BookMarked} title="No vocabulary yet" message="Select text in Reading practice and save it, or add a word manually." />
        )
      ) : null}
    </AppLayout>
  );
}
