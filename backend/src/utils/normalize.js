export function normalizeTextAnswer(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeOptionValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).sort();
  }

  return String(value ?? '').trim();
}

export function percentage(part, total) {
  if (!total) {
    return 0;
  }

  return Math.round((part / total) * 100);
}
