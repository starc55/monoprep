import { useEffect, useMemo, useRef, useState } from 'react';
import PassageAssetViewer from './PassageAssetViewer.jsx';

const colors = [
  { id: 'yellow', label: 'Yellow', value: '#fff3a3' },
  { id: 'green', label: 'Green', value: '#c9f7d4' },
  { id: 'blue', label: 'Blue', value: '#cfe3ff' },
  { id: 'pink', label: 'Pink', value: '#ffd6e7' }
];

function getStorageKey(attemptId, passageId) {
  return `monoprep-highlights:${attemptId || 'preview'}:${passageId || 'passage'}`;
}

function readHighlights(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch (_error) {
    return [];
  }
}

function writeHighlights(key, highlights) {
  localStorage.setItem(key, JSON.stringify(highlights));
}

function tokenize(content) {
  let wordIndex = 0;
  let italic = false;
  let underline = false;
  let tokenIndex = 0;
  const output = [];

  String(content || '').split(/(<\/?(?:em|i|u|ul|ol|li)>)/gi).filter(Boolean).forEach((part) => {
    const tag = part.toLowerCase();
    if (tag === '<em>' || tag === '<i>') {
      italic = true;
      return;
    }
    if (tag === '</em>' || tag === '</i>') {
      italic = false;
      return;
    }
    if (tag === '<u>') {
      underline = true;
      return;
    }
    if (tag === '</u>') {
      underline = false;
      return;
    }
    if (tag === '<li>') {
      output.push({ token: '\n- ', key: `${tokenIndex++}-list-start`, wordIndex: null, isSpace: true, italic, underline });
      return;
    }
    if (tag === '</li>') {
      output.push({ token: '\n', key: `${tokenIndex++}-list-end`, wordIndex: null, isSpace: true, italic, underline });
      return;
    }
    if (['<ul>', '</ul>', '<ol>', '</ol>'].includes(tag)) return;

    part.split(/(\s+)/).filter(Boolean).forEach((token) => {
      const isSpace = /^\s+$/.test(token);
      output.push({
        token,
        key: `${tokenIndex++}-${token}`,
        wordIndex: isSpace ? null : wordIndex++,
        isSpace,
        italic,
        underline
      });
    });
  });

  return output;
}

function findHighlight(highlights, wordIndex) {
  return highlights.find((item) => wordIndex >= item.start && wordIndex <= item.end);
}

export default function PassagePanel({ question, attemptId, sectionType }) {
  const [collapsed, setCollapsed] = useState(false);
  const panelRef = useRef(null);
  const storageKey = getStorageKey(attemptId, question?.passage?.id);
  const [highlights, setHighlights] = useState(() => readHighlights(storageKey));
  const [selectionRange, setSelectionRange] = useState(null);
  const tokens = useMemo(() => tokenize(question?.passage?.content || ''), [question?.passage?.content]);
  const passageTitle = String(question?.passage?.title || '').trim();
  const showPassageTitle = passageTitle && !/^untitled passage$/i.test(passageTitle);

  useEffect(() => {
    setHighlights(readHighlights(storageKey));
    setSelectionRange(null);
  }, [storageKey]);

  function updateHighlights(nextHighlights) {
    setHighlights(nextHighlights);
    writeHighlights(storageKey, nextHighlights);
  }

  function handleMouseUp() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !panelRef.current) {
      setSelectionRange(null);
      return;
    }

    const anchor = selection.anchorNode?.parentElement?.closest?.('[data-word-index]');
    const focus = selection.focusNode?.parentElement?.closest?.('[data-word-index]');
    if (!anchor || !focus || !panelRef.current.contains(anchor) || !panelRef.current.contains(focus)) {
      setSelectionRange(null);
      return;
    }

    const start = Number(anchor.dataset.wordIndex);
    const end = Number(focus.dataset.wordIndex);
    setSelectionRange({
      start: Math.min(start, end),
      end: Math.max(start, end),
      text: selection.toString().trim()
    });
  }

  function applyHighlight(color) {
    if (!selectionRange) return;
    const next = highlights
      .filter((item) => item.end < selectionRange.start || item.start > selectionRange.end)
      .concat({ ...selectionRange, color })
      .sort((a, b) => a.start - b.start);
    updateHighlights(next);
    window.getSelection()?.removeAllRanges();
    setSelectionRange(null);
  }

  function clearHighlight() {
    if (!selectionRange) return;
    updateHighlights(highlights.filter((item) => item.end < selectionRange.start || item.start > selectionRange.end));
    window.getSelection()?.removeAllRanges();
    setSelectionRange(null);
  }

  function saveSelectionToVocabulary() {
    const word = selectionRange?.text?.replace(/\s+/g, ' ').trim();
    if (!word) return;

    let customWords = [];
    try {
      customWords = JSON.parse(localStorage.getItem('monoprep-vocab-custom') || '[]');
    } catch (_error) {
      customWords = [];
    }

    const exists = customWords.some((item) => item.word.toLowerCase() === word.toLowerCase());
    if (!exists) {
      customWords.unshift({
        id: `custom-${word.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
        word,
        meaning: 'Saved from Reading practice. Add your own definition in Vocabulary.',
        example: question?.passage?.title ? `From: ${question.passage.title}` : 'Saved from a MonoPrep passage.',
        source: 'My words'
      });
      localStorage.setItem('monoprep-vocab-custom', JSON.stringify(customWords));
    }

    window.getSelection()?.removeAllRanges();
    setSelectionRange(null);
  }

  if (!question?.passage) {
    if (sectionType === 'math') {
      return (
        <aside className="passage-panel math-directions-panel" aria-label="Student-produced response directions">
          <h2>Student-produced response directions</h2>
          <ul>
            <li>If you find <strong>more than one correct answer</strong>, enter only one answer.</li>
            <li>You can enter up to 5 characters for a <strong>positive</strong> answer and up to 6 characters (including the negative sign) for a <strong>negative</strong> answer.</li>
            <li>If your answer is a <strong>fraction</strong> that does not fit in the provided space, enter the decimal equivalent.</li>
            <li>If your answer is a <strong>decimal</strong> that does not fit in the provided space, enter it by truncating or rounding at the fourth digit.</li>
            <li>If your answer is a <strong>mixed number</strong> (such as 3 1/2), enter it as an improper fraction (7/2) or its decimal equivalent (3.5).</li>
            <li>Do not enter symbols such as a percent sign, comma, or dollar sign.</li>
          </ul>
          <div className="response-examples">
            <strong className="response-examples-title">Examples</strong>
            <table>
              <thead>
                <tr>
                  <th>Answer</th>
                  <th>Acceptable ways to enter answer</th>
                  <th>Unacceptable: will NOT receive credit</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">3.5</th>
                  <td><code>3.5</code><code>3.50</code><code>7/2</code></td>
                  <td><code>31/2</code><code>3 1/2</code></td>
                </tr>
                <tr>
                  <th scope="row">2/3</th>
                  <td><code>2/3</code><code>.6666</code><code>.6667</code><code>0.666</code><code>0.667</code></td>
                  <td><code>0.66</code><code>.66</code><code>0.67</code><code>.67</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </aside>
      );
    }
    return (
      <div className="passage-panel empty">
        <h2>Stimulus</h2>
        <p>This item does not include a separate passage. Use the prompt and choices on the right.</p>
      </div>
    );
  }

  return (
    <div className={`passage-panel ${collapsed ? 'collapsed' : ''}`.trim()}>
      <div className="passage-mobile-head">
        <div>
          <span className="passage-category">{question.passage.category}</span>
          {showPassageTitle ? <h2>{passageTitle}</h2> : null}
        </div>
        <button type="button" onClick={() => setCollapsed((value) => !value)}>
          {collapsed ? 'Show' : 'Hide'}
        </button>
      </div>
      <div className="passage-content highlightable-passage" ref={panelRef} onMouseUp={handleMouseUp}>
        <PassageAssetViewer passage={question.passage} seamless />
        {question.passage.content ? (
          <p>
            {tokens.map(({ token, key, wordIndex, isSpace, italic, underline }) => {
              if (isSpace) return token;
              const highlight = findHighlight(highlights, wordIndex);
              let formattedToken = token;
              if (underline) formattedToken = <u>{formattedToken}</u>;
              if (italic) formattedToken = <em>{formattedToken}</em>;
              return (
                <span
                  key={key}
                  data-word-index={wordIndex}
                  className={highlight ? 'highlighted-token' : ''}
                  style={highlight ? { backgroundColor: highlight.color } : undefined}
                >
                  {formattedToken}
                </span>
              );
            })}
          </p>
        ) : null}
      </div>
      {selectionRange ? (
        <div className="highlight-toolbar">
          {colors.map((color) => (
            <button
              key={color.id}
              type="button"
              title={color.label}
              aria-label={`Highlight ${color.label}`}
              style={{ backgroundColor: color.value }}
              onClick={() => applyHighlight(color.value)}
            />
          ))}
          <button type="button" className="highlight-clear" onClick={clearHighlight}>Clear</button>
          <button type="button" className="highlight-vocab" onClick={saveSelectionToVocabulary}>+ Vocabulary</button>
        </div>
      ) : null}
    </div>
  );
}
