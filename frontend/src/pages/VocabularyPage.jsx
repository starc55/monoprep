import { useMemo, useState } from "react";
import AppLayout from "../layouts/AppLayout.jsx";
import Button from "../components/ui/Button.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import LordIcon from "../components/ui/LordIcon.jsx";
import Modal from "../components/ui/Modal.jsx";
import RowActionMenu from "../components/ui/RowActionMenu.jsx";

const WORDS_KEY = "monoprep-vocab-custom";
const MASTERED_KEY = "monoprep-vocab-mastered";

const SOURCE_OPTIONS = ["Manual", "Exam"];
const DIFFICULTY_OPTIONS = ["Easy", "Medium", "Hard"];
const TAG_OPTIONS = ["Reading", "Writing", "Math", "Academic"];
const FILTERS = ["All", "From Exams", "Manual", "Learning", "Mastered"];

const VOCAB_ICONS = {
  bank: "https://cdn.lordicon.com/wjyqkiew.json",
  add: "https://cdn.lordicon.com/vjgknpfx.json",
  search: "https://cdn.lordicon.com/weqkkuwt.json",
  review: "https://cdn.lordicon.com/snxksidl.json",
  mastered: "https://cdn.lordicon.com/lvrxlmju.json",
  exam: "https://cdn.lordicon.com/fttvwdlw.json",
  delete: "https://cdn.lordicon.com/jzinekkv.json",
  edit: "https://cdn.lordicon.com/exymduqj.json",
};

const emptyForm = {
  word: "",
  meaning: "",
  example: "",
  source: "Manual",
  sourceTitle: "",
  difficulty: "Medium",
  tags: [],
};

function readJson(key, fallback) {
  try {
    const value = JSON.parse(
      localStorage.getItem(key) || JSON.stringify(fallback)
    );
    return Array.isArray(value) ? value : fallback;
  } catch (_error) {
    return fallback;
  }
}

function writeCustomWords(words) {
  localStorage.setItem(WORDS_KEY, JSON.stringify(words));
}

function readMastered() {
  return new Set(readJson(MASTERED_KEY, []));
}

function writeMastered(mastered) {
  localStorage.setItem(MASTERED_KEY, JSON.stringify([...mastered]));
}

function text(value) {
  return typeof value === "string" ? value : "";
}

function normalizeTags(item) {
  if (Array.isArray(item.tags)) return item.tags.filter(Boolean);
  return text(item.tag)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function inferSource(item) {
  const signature = `${text(item.source)} ${text(item.sourceType)} ${text(
    item.meaning
  )} ${text(item.example)} ${text(item.sourceTitle)}`.toLowerCase();
  if (
    text(item.source).toLowerCase() === "exam" ||
    text(item.sourceType).toLowerCase() === "exam" ||
    signature.includes("saved from reading") ||
    signature.includes("saved from a monoprep passage") ||
    signature.includes("from:")
  ) {
    return "Exam";
  }
  return "Manual";
}

function inferSourceTitle(item) {
  if (item.sourceTitle) return text(item.sourceTitle);
  if (item.examName) return text(item.examName);
  if (item.passageTitle) return text(item.passageTitle);
  const example = text(item.example);
  return example.toLowerCase().startsWith("from:")
    ? example.replace(/^from:\s*/i, "")
    : "";
}

function normalizeWord(item) {
  const source = inferSource(item);
  return {
    id: item.id || `custom-${Date.now()}`,
    word: text(item.word),
    meaning: text(item.meaning),
    example: text(item.example),
    source,
    sourceType: source,
    sourceTitle: source === "Exam" ? inferSourceTitle(item) : "",
    difficulty: DIFFICULTY_OPTIONS.includes(item.difficulty)
      ? item.difficulty
      : "Medium",
    tags: normalizeTags(item),
    status: ["New", "Learning", "Mastered"].includes(item.status)
      ? item.status
      : "New",
  };
}

function readCustomWords() {
  return readJson(WORDS_KEY, [])
    .map(normalizeWord)
    .filter((item) => item.word);
}

function wordId(word) {
  return `custom-${word
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
}

export default function VocabularyPage() {
  const [query, setQuery] = useState("");
  const [customWords, setCustomWords] = useState(readCustomWords);
  const [mastered, setMastered] = useState(readMastered);
  const [activeFilter, setActiveFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewRevealed, setReviewRevealed] = useState(false);

  const words = useMemo(() => customWords.map(normalizeWord), [customWords]);

  const getStatus = (item) =>
    mastered.has(item.id) || item.status === "Mastered"
      ? "Mastered"
      : item.status || "New";

  const filteredWords = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return words.filter((item) => {
      const status = getStatus(item);
      const matchesFilter =
        activeFilter === "All" ||
        (activeFilter === "From Exams" && item.source === "Exam") ||
        (activeFilter === "Manual" && item.source !== "Exam") ||
        (activeFilter === "Learning" && status === "Learning") ||
        (activeFilter === "Mastered" && status === "Mastered");

      if (!matchesFilter) return false;
      if (!needle) return true;

      return `${item.word} ${item.meaning} ${item.example} ${
        item.sourceTitle
      } ${item.tags.join(" ")}`
        .toLowerCase()
        .includes(needle);
    });
  }, [activeFilter, mastered, query, words]);

  const masteredCount = words.filter(
    (item) => getStatus(item) === "Mastered"
  ).length;
  const reviewingCount = words.filter(
    (item) => getStatus(item) !== "Mastered"
  ).length;
  const examCount = words.filter((item) => item.source === "Exam").length;
  const reviewPool = filteredWords.length ? filteredWords : words;
  const reviewWord = reviewPool.length
    ? reviewPool[reviewIndex % reviewPool.length]
    : null;

  function persistWords(nextWords) {
    const normalized = nextWords.map(normalizeWord);
    setCustomWords(normalized);
    writeCustomWords(normalized);
  }

  function persistMastered(nextMastered) {
    setMastered(nextMastered);
    writeMastered(nextMastered);
  }

  function openAddModal(seed = {}) {
    setEditingId(null);
    setForm({ ...emptyForm, ...seed });
    setModalOpen(true);
  }

  function openEditModal(item) {
    setEditingId(item.id);
    setForm({
      word: item.word,
      meaning: item.meaning,
      example: item.example,
      source: item.source,
      sourceTitle: item.sourceTitle,
      difficulty: item.difficulty,
      tags: item.tags,
    });
    setModalOpen(true);
  }

  function captureSelection() {
    const selection = window.getSelection()?.toString().trim();
    if (!selection) return;
    openAddModal({ word: selection.replace(/\s+/g, " ") });
  }

  function saveWord(event) {
    event.preventDefault();
    const word = form.word.trim();
    if (!word) return;

    const duplicate = words.find(
      (item) =>
        item.word.toLowerCase() === word.toLowerCase() && item.id !== editingId
    );
    if (duplicate) return;

    const previous = words.find((item) => item.id === editingId);
    const entry = normalizeWord({
      id: editingId || wordId(word),
      word,
      meaning: form.meaning.trim(),
      example: form.example.trim(),
      source: form.source,
      sourceType: form.source,
      sourceTitle: form.source === "Exam" ? form.sourceTitle.trim() : "",
      difficulty: form.difficulty,
      tags: form.tags,
      status: previous?.status || "New",
    });

    const next = editingId
      ? words.map((item) => (item.id === editingId ? entry : item))
      : [entry, ...words];
    persistWords(next);
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function deleteWord(id) {
    const nextWords = words.filter((item) => item.id !== id);
    const nextMastered = new Set(
      [...mastered].filter((itemId) => itemId !== id)
    );
    persistWords(nextWords);
    persistMastered(nextMastered);
  }

  function updateStatus(id, status) {
    const nextWords = words.map((item) =>
      item.id === id ? { ...item, status } : item
    );
    const nextMastered = new Set(mastered);
    if (status === "Mastered") nextMastered.add(id);
    else nextMastered.delete(id);
    persistWords(nextWords);
    persistMastered(nextMastered);
  }

  function toggleTag(tag) {
    setForm((value) => ({
      ...value,
      tags: value.tags.includes(tag)
        ? value.tags.filter((item) => item !== tag)
        : [...value.tags, tag],
    }));
  }

  function openReview(item) {
    const pool = filteredWords.length ? filteredWords : words;
    const index = Math.max(
      0,
      pool.findIndex((word) => word.id === item.id)
    );
    setReviewIndex(index);
    setReviewRevealed(false);
    setReviewOpen(true);
  }

  function nextReviewCard() {
    setReviewRevealed(false);
    setReviewIndex((value) =>
      reviewPool.length ? (value + 1) % reviewPool.length : 0
    );
  }

  function reviewAgain() {
    if (!reviewWord) return;
    updateStatus(reviewWord.id, "Learning");
    nextReviewCard();
  }

  function markKnown() {
    if (!reviewWord) return;
    updateStatus(reviewWord.id, "Mastered");
    nextReviewCard();
  }

  return (
    <AppLayout
      title="Vocabulary"
      subtitle="Build a personal SAT word bank from your exams and daily study."
    >
      <div className="vocab-wordbank-page">
        <section className="vocab-wordbank-hero">
          <div className="vocab-hero-copy">
            <h1>My SAT Word Bank</h1>
            <p>Save, review, and master words from your exams.</p>
            <div className="vocab-hero-actions">
              <Button onClick={() => openAddModal()}>
                <LordIcon src={VOCAB_ICONS.add} size={26} />
                Add word
              </Button>
              <Button variant="ghost" onClick={captureSelection}>
                Capture selection
              </Button>
            </div>
          </div>

          <div className="vocab-stat-grid">
            <div className="vocab-stat-card">
              <span>Total words</span>
              <strong>{words.length}</strong>
            </div>
            <div className="vocab-stat-card">
              <span>Mastered</span>
              <strong>{masteredCount}</strong>
            </div>
            <div className="vocab-stat-card">
              <span>Reviewing</span>
              <strong>{reviewingCount}</strong>
            </div>
            <div className="vocab-stat-card">
              <span>From exams</span>
              <strong>{examCount}</strong>
            </div>
          </div>
        </section>

        <section className="vocab-workbench">
          <div className="vocab-toolbar">
            <label className="vocab-search-box">
              <LordIcon src={VOCAB_ICONS.search} size={34} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search words, meanings, examples"
              />
            </label>
            <Button
              variant="secondary"
              onClick={() => setReviewOpen(true)}
              disabled={!words.length}
            >
              <LordIcon src={VOCAB_ICONS.review} size={26} />
              Review mode
            </Button>
          </div>

          <div
            className="vocab-filter-tabs"
            role="tablist"
            aria-label="Vocabulary filters"
          >
            {FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                className={activeFilter === filter ? "active" : ""}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </section>

        {filteredWords.length ? (
          <div className="vocab-word-grid">
            {filteredWords.map((item) => {
              const status = getStatus(item);
              return (
                <article key={item.id} className="vocab-word-card">
                  <header className="vocab-word-head">
                    <div>
                      <span className="vocab-word-source">
                        {item.source === "Exam"
                          ? "Saved from Exam"
                          : "Manual word"}
                      </span>
                      <h2>{item.word}</h2>
                    </div>
                    <div className="vocab-word-controls">
                      <span className={`vocab-badge status-${status.toLowerCase()}`}>{status}</span>
                      <RowActionMenu
                        label={`Actions for ${item.word}`}
                        items={[
                          { label: "Review", onSelect: () => openReview(item) },
                          { label: "Edit", onSelect: () => openEditModal(item) },
                          { label: "Delete", tone: "danger", onSelect: () => deleteWord(item.id) },
                        ]}
                      />
                    </div>
                  </header>

                  <p className="vocab-meaning">
                    {item.meaning || "Definition not added yet."}
                  </p>
                  {item.example ? (
                    <p className="vocab-example">"{item.example}"</p>
                  ) : null}

                  <div className="vocab-card-badges">
                    <span
                      className={`vocab-badge source-${item.source.toLowerCase()}`}
                    >
                      {item.source}
                    </span>
                    <span
                      className={`vocab-badge difficulty-${item.difficulty.toLowerCase()}`}
                    >
                      {item.difficulty}
                    </span>
                    {item.source === "Exam" ? (
                      <span className="vocab-badge exam-title">
                        {item.sourceTitle || "Exam passage"}
                      </span>
                    ) : null}
                    {item.tags.map((tag) => (
                      <span key={tag} className="vocab-badge tag">
                        {tag}
                      </span>
                    ))}
                  </div>

                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            media={
              <span className="empty-state-icon lordicon-empty">
                <LordIcon src={VOCAB_ICONS.bank} size={58} />
              </span>
            }
            title="Your word bank is empty"
            message="Add your first word or save unknown words while solving Reading questions."
            actionLabel="Add your first word"
            actionOnClick={() => openAddModal()}
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        title={editingId ? "Edit vocabulary word" : "Add vocabulary word"}
        className="vocab-word-modal"
        onClose={() => setModalOpen(false)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="vocab-word-form">
              {editingId ? "Save changes" : "Add word"}
            </Button>
          </>
        }
      >
        <form
          id="vocab-word-form"
          className="vocab-modal-form"
          onSubmit={saveWord}
        >
          <label>
            <span>Word</span>
            <input
              value={form.word}
              onChange={(event) =>
                setForm((value) => ({ ...value, word: event.target.value }))
              }
              placeholder="e.g. ambiguous"
            />
          </label>
          <label>
            <span>Meaning</span>
            <textarea
              value={form.meaning}
              onChange={(event) =>
                setForm((value) => ({ ...value, meaning: event.target.value }))
              }
              placeholder="Short meaning"
              rows={3}
            />
          </label>
          <label>
            <span>Example sentence</span>
            <textarea
              value={form.example}
              onChange={(event) =>
                setForm((value) => ({ ...value, example: event.target.value }))
              }
              placeholder="Use the word in context"
              rows={3}
            />
          </label>

          <div className="vocab-field-group">
            <span>Source</span>
            <div className="vocab-chip-row">
              {SOURCE_OPTIONS.map((source) => (
                <button
                  key={source}
                  type="button"
                  className={form.source === source ? "active" : ""}
                  onClick={() => setForm((value) => ({ ...value, source }))}
                >
                  {source}
                </button>
              ))}
            </div>
          </div>

          {form.source === "Exam" ? (
            <label>
              <span>Exam name or passage title</span>
              <input
                value={form.sourceTitle}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    sourceTitle: event.target.value,
                  }))
                }
                placeholder="Paper #85 or passage title"
              />
            </label>
          ) : null}

          <div className="vocab-field-group">
            <span>Difficulty</span>
            <div className="vocab-chip-row">
              {DIFFICULTY_OPTIONS.map((difficulty) => (
                <button
                  key={difficulty}
                  type="button"
                  className={form.difficulty === difficulty ? "active" : ""}
                  onClick={() => setForm((value) => ({ ...value, difficulty }))}
                >
                  {difficulty}
                </button>
              ))}
            </div>
          </div>

          <div className="vocab-field-group">
            <span>Tags</span>
            <div className="vocab-chip-row">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={form.tags.includes(tag) ? "active" : ""}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={reviewOpen}
        title="Review mode"
        className="vocab-review-modal"
        onClose={() => setReviewOpen(false)}
        actions={
          reviewWord ? (
            <>
              <Button
                variant="ghost"
                onClick={() => setReviewRevealed((value) => !value)}
              >
                {reviewRevealed ? "Show word" : "Show meaning"}
              </Button>
              <Button variant="secondary" onClick={reviewAgain}>
                Review again
              </Button>
              <Button onClick={markKnown}>I know this</Button>
            </>
          ) : null
        }
      >
        {reviewWord ? (
          <div className="vocab-review-content">
            <button
              type="button"
              className={`vocab-flashcard ${
                reviewRevealed ? "is-flipped" : ""
              }`.trim()}
              onClick={() => setReviewRevealed((value) => !value)}
              aria-pressed={reviewRevealed}
            >
              <span className="vocab-flashcard-face vocab-flashcard-front">
                <small>
                  {(reviewIndex % reviewPool.length) + 1} / {reviewPool.length}
                </small>
                <strong>{reviewWord.word}</strong>
                <em>Tap to reveal meaning</em>
              </span>
              <span className="vocab-flashcard-face vocab-flashcard-back">
                <strong>
                  {reviewWord.meaning || "Definition not added yet."}
                </strong>
                {reviewWord.example ? <em>"{reviewWord.example}"</em> : null}
              </span>
            </button>
          </div>
        ) : (
          <p className="vocab-review-empty">
            Add words first, then come back for flashcard review.
          </p>
        )}
      </Modal>
    </AppLayout>
  );
}
