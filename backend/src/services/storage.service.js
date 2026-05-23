import path from 'path';

export function buildLocalAssetUrl(relativePath) {
  if (!relativePath) {
    return null;
  }

  if (relativePath.startsWith('http')) {
    return relativePath;
  }

  return relativePath.startsWith('/') ? relativePath : `/uploads/${relativePath}`;
}

export function getLocalStoragePath(...segments) {
  return path.join(process.cwd(), 'uploads', ...segments);
}
