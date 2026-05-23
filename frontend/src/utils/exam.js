export function getCurrentQuestion(section, questionIndex) {
  return section?.questions?.[questionIndex] || null;
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
