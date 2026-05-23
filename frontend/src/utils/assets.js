export function resolveAssetUrl(url) {
  if (!url) {
    return '';
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return `${apiBase.replace('/api', '')}${url}`;
}
