import { useMemo } from 'react';
import { convertLatexToMarkup } from 'mathlive';
import 'mathlive/static.css';

const RICH_TEXT_TAG_PATTERN = /<\/?(?:em|i|u)>/gi;
const CONTENT_TOKEN_PATTERN = /(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|<\/?(?:em|i|u)>)/gi;

export function stripRichTextMarkup(value = '') {
  return String(value).replace(RICH_TEXT_TAG_PATTERN, '');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
    .replaceAll('\n', '<br>');
}

function richTagMarkup(token) {
  const normalized = token.toLowerCase();
  if (normalized === '<i>') return '<em>';
  if (normalized === '</i>') return '</em>';
  return normalized;
}

function toRenderedHtml(value) {
  const source = String(value || '');
  let html = '';
  let cursor = 0;

  for (const match of source.matchAll(CONTENT_TOKEN_PATTERN)) {
    html += escapeHtml(source.slice(cursor, match.index));
    const token = match[0];
    const isInlineMath = token.startsWith('\\(') && token.endsWith('\\)');
    const isDisplayMath = token.startsWith('\\[') && token.endsWith('\\]');

    if (isInlineMath || isDisplayMath) {
      const latex = token.slice(2, -2);
      try {
        html += `<span class="mathlive-rendered ${isDisplayMath ? 'block' : 'inline'}">${convertLatexToMarkup(latex)}</span>`;
      } catch {
        html += escapeHtml(token);
      }
    } else {
      html += richTagMarkup(token);
    }

    cursor = match.index + token.length;
  }

  html += escapeHtml(source.slice(cursor));
  return html;
}

export default function MathJaxContent({ children, block = false, className = '' }) {
  const content = String(children || '');
  const renderedHtml = useMemo(() => toRenderedHtml(content), [content]);
  const Component = block ? 'div' : 'span';

  return (
    <Component
      className={`mathjax-content ${block ? 'block' : 'inline'} ready ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
