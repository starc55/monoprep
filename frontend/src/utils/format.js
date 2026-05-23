export function formatSeconds(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function formatDate(value) {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleString();
}

export function formatPercent(value) {
  return `${Math.round(value || 0)}%`;
}
