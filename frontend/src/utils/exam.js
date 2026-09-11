export function getCurrentQuestion(section, questionIndex) {
  return section?.questions?.[questionIndex] || null;
}

export function hasAnswer(answer) {
  if (answer === null || answer === undefined) return false;
  if (Array.isArray(answer)) return answer.length > 0;
  if (typeof answer !== 'object') return String(answer).trim().length > 0;
  if (Array.isArray(answer.values)) return answer.values.length > 0;
  if (!Object.prototype.hasOwnProperty.call(answer, 'value')) return false;
  return answer.value !== null
    && answer.value !== undefined
    && String(answer.value).trim().length > 0;
}

export function getDisplayAnswer(answer) {
  if (Array.isArray(answer)) {
    return answer.join(', ');
  }

  if (answer && typeof answer === 'object') {
    if (Array.isArray(answer.values)) {
      return answer.values.join(', ');
    }
    if ('value' in answer) {
      return String(answer.value);
    }
  }

  return answer ? String(answer) : 'No answer';
}
