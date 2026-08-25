import { useCallback, useEffect, useRef } from 'react';
import { Italic, Underline } from 'lucide-react';
import { MathfieldElement } from 'mathlive';
import MathJaxContent from './MathJaxContent.jsx';

MathfieldElement.fontsDirectory = '/vendor/mathlive/fonts';
MathfieldElement.soundsDirectory = null;

const MATH_TEMPLATES = [
  { label: 'Inline', latex: 'x' },
  { label: 'Fraction', latex: '\\frac{x}{y}' },
  { label: 'Power', latex: 'x^{2}' },
  { label: 'Root', latex: '\\sqrt{x}' },
  { label: 'Subscript', latex: 'x_{1}' },
  { label: 'Degree', latex: 'x^{\\circ}' },
  { label: 'Plus/minus', latex: '\\pm x' },
  { label: 'Equation', latex: 'x=y' },
  { label: 'System', latex: '\\begin{cases}x+y=1\\\\x-y=3\\end{cases}' }
];

const SOURCE_TOKEN_PATTERN = /(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|<\/?(?:em|i|u)>)/gi;

function templateSource(template) {
  return template.display ? `\\[${template.latex}\\]` : `\\(${template.latex}\\)`;
}

function isEmptyMathValue(value) {
  const compactValue = String(value || '').replace(/\s/g, '');
  return !compactValue || /^\\placeholder(?:\[[^\]]*\])?\{\}$/.test(compactValue);
}

function removeMathField(mathField) {
  const parent = mathField.parentNode;
  if (!parent) return;

  const nextSibling = mathField.nextSibling;
  const insertionIndex = Array.from(parent.childNodes).indexOf(mathField);
  mathField.remove();
  if (nextSibling?.nodeType === 3 && nextSibling.nodeValue === ' ') {
    nextSibling.remove();
  }

  parent.focus();
  const range = document.createRange();
  range.setStart(parent, Math.min(insertionIndex, parent.childNodes.length));
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function createMathField(latex, display, onInput) {
  const mathField = document.createElement('math-field');
  mathField.className = 'rich-math-token';
  mathField.dataset.display = display ? 'block' : 'inline';
  mathField.value = latex;
  mathField.smartMode = true;
  mathField.mathVirtualKeyboardPolicy = 'auto';
  mathField.setAttribute('aria-label', 'Editable math formula');
  mathField.addEventListener('input', () => {
    if (isEmptyMathValue(mathField.value)) removeMathField(mathField);
    onInput();
  });
  return mathField;
}

function hydrateEditor(editor, source, onInput) {
  const fragment = document.createDocumentFragment();
  const parentStack = [fragment];
  const tokens = String(source || '').split(SOURCE_TOKEN_PATTERN).filter(Boolean);

  tokens.forEach((token) => {
    const parent = parentStack[parentStack.length - 1];
    const normalized = token.toLowerCase();

    if (normalized === '<em>' || normalized === '<i>' || normalized === '<u>') {
      const element = document.createElement(normalized === '<u>' ? 'u' : 'em');
      parent.append(element);
      parentStack.push(element);
      return;
    }

    if (normalized === '</em>' || normalized === '</i>' || normalized === '</u>') {
      if (parentStack.length > 1) parentStack.pop();
      return;
    }

    const isInlineMath = token.startsWith('\\(') && token.endsWith('\\)');
    const isDisplayMath = token.startsWith('\\[') && token.endsWith('\\]');
    if (isInlineMath || isDisplayMath) {
      parent.append(createMathField(token.slice(2, -2), isDisplayMath, onInput));
      return;
    }

    parent.append(document.createTextNode(token));
  });

  editor.replaceChildren(fragment);
}

function serializeNode(node) {
  if (node.nodeType === 3) {
    return (node.nodeValue || '').replaceAll('\u00a0', ' ');
  }

  if (node.nodeType !== 1) return '';

  const element = node;
  if (element.tagName === 'MATH-FIELD') {
    const latex = element.value || '';
    return element.dataset.display === 'block' ? `\\[${latex}\\]` : `\\(${latex}\\)`;
  }

  if (element.tagName === 'BR') return '\n';

  const content = Array.from(element.childNodes).map(serializeNode).join('');
  if (element.tagName === 'EM' || element.tagName === 'I') return `<em>${content}</em>`;
  if (element.tagName === 'U') return `<u>${content}</u>`;
  if (element.tagName === 'DIV' || element.tagName === 'P') return `${content}\n`;
  return content;
}

function serializeEditor(editor) {
  return Array.from(editor.childNodes).map(serializeNode).join('').replace(/\n$/, '');
}

function rangeBelongsToEditor(range, editor) {
  if (!range || !editor) return false;
  const container = range.commonAncestorContainer;
  return container === editor || editor.contains(container);
}

export default function RichMathEditor({
  form,
  name,
  label,
  placeholder = '',
  className = '',
  rules,
  showMathTemplates = true
}) {
  const editorRef = useRef(null);
  const selectionRef = useRef(null);
  const lastEmittedValueRef = useRef(null);
  form.register(name, rules);
  const value = form.watch(name) || '';

  const syncEditor = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextValue = serializeEditor(editor);
    lastEmittedValueRef.current = nextValue;
    form.setValue(name, nextValue, { shouldDirty: true, shouldValidate: true });
  }, [form, name]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || value === lastEmittedValueRef.current) return;
    hydrateEditor(editor, value, syncEditor);
    lastEmittedValueRef.current = value;
  }, [syncEditor, value]);

  function rememberSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (rangeBelongsToEditor(range, editor)) selectionRef.current = range.cloneRange();
  }

  function getInsertionRange() {
    const editor = editorRef.current;
    if (!editor) return null;
    if (rangeBelongsToEditor(selectionRef.current, editor)) return selectionRef.current.cloneRange();

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    return range;
  }

  function restoreSelection(range) {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    selectionRef.current = range.cloneRange();
  }

  function insertTemplate(template) {
    const editor = editorRef.current;
    if (!editor) return;

    const activeElement = document.activeElement;
    if (activeElement?.tagName === 'MATH-FIELD' && editor.contains(activeElement)) {
      activeElement.insert(template.latex, {
        insertionMode: 'replaceSelection',
        selectionMode: 'placeholder',
        focus: true
      });
      syncEditor();
      return;
    }

    const range = getInsertionRange();
    if (!range) return;

    range.deleteContents();
    const mathField = createMathField(template.latex, template.display, syncEditor);
    const spacer = document.createTextNode(' ');
    range.insertNode(spacer);
    range.insertNode(mathField);
    range.setStartAfter(spacer);
    range.collapse(true);
    restoreSelection(range);
    syncEditor();

    requestAnimationFrame(() => {
      mathField.focus();
      mathField.executeCommand('move-to-mathfield-start');
    });
  }

  function handleEditorKeyDown(event) {
    if (event.key !== 'Backspace' && event.key !== 'Delete') return;
    if (event.nativeEvent.composedPath().some((node) => node?.tagName === 'MATH-FIELD')) return;

    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!range.collapsed || !rangeBelongsToEditor(range, editor)) return;

    const backwards = event.key === 'Backspace';
    const container = range.startContainer;
    const offset = range.startOffset;
    let candidate = null;
    let whitespaceNode = null;

    if (container.nodeType === 3) {
      const valueBeforeCaret = container.nodeValue.slice(0, offset);
      const valueAfterCaret = container.nodeValue.slice(offset);
      const atFormulaBoundary = backwards
        ? valueBeforeCaret.trim() === ''
        : valueAfterCaret.trim() === '';
      if (!atFormulaBoundary) return;
      whitespaceNode = container;
      candidate = backwards ? container.previousSibling : container.nextSibling;
    } else {
      candidate = backwards
        ? container.childNodes[offset - 1]
        : container.childNodes[offset];
    }

    if (candidate?.nodeType === 3 && candidate.nodeValue.trim() === '') {
      whitespaceNode = candidate;
      candidate = backwards ? candidate.previousSibling : candidate.nextSibling;
    }

    if (candidate?.tagName !== 'MATH-FIELD') return;
    event.preventDefault();
    whitespaceNode?.remove();
    removeMathField(candidate);
    syncEditor();
  }

  function applyFormat(tag) {
    const editor = editorRef.current;
    const range = getInsertionRange();
    if (!editor || !range) return;

    const wrapper = document.createElement(tag);
    if (range.collapsed) {
      wrapper.append(document.createTextNode('text'));
    } else {
      wrapper.append(range.extractContents());
    }
    range.insertNode(wrapper);
    range.selectNodeContents(wrapper);
    restoreSelection(range);
    syncEditor();
    editor.focus();
  }

  function handlePaste(event) {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    const range = getInsertionRange();
    if (!range) return;
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    restoreSelection(range);
    syncEditor();
  }

  return (
    <div className="form-field math-author-field">
      <span>{label}</span>
      <div className="rich-math-toolbar" aria-label={`${label} formatting tools`}>
        <div className="rich-format-actions">
          <button type="button" title="Italic" aria-label="Italic" onPointerDown={(event) => event.preventDefault()} onClick={() => applyFormat('em')}>
            <Italic aria-hidden="true" />
          </button>
          <button type="button" title="Underline" aria-label="Underline" onPointerDown={(event) => event.preventDefault()} onClick={() => applyFormat('u')}>
            <Underline aria-hidden="true" />
          </button>
        </div>
        {showMathTemplates ? (
          <div className="math-template-keyboard" aria-label={`${label} formula templates`}>
            {MATH_TEMPLATES.map((template) => (
              <button key={template.label} type="button" title={template.label} onPointerDown={(event) => event.preventDefault()} onClick={() => insertTemplate(template)}>
                <code className="math-template-source">{templateSource(template)}</code>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div
        ref={editorRef}
        className={`rich-math-editor ${className}`.trim()}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label={label}
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={syncEditor}
        onKeyDown={handleEditorKeyDown}
        onKeyUp={rememberSelection}
        onMouseUp={rememberSelection}
        onFocus={rememberSelection}
        onPaste={handlePaste}
      />
      <div className="math-author-preview" aria-label={`${label} preview`}>
        <small>Preview is shown here</small>
        <MathJaxContent block>{value || 'Preview'}</MathJaxContent>
      </div>
    </div>
  );
}
