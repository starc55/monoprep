import { ExternalLink, FileText } from 'lucide-react';
import { resolveAssetUrl } from '../../utils/assets.js';

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const WORD_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

function inferMimeType(name = '', url = '') {
  const value = `${name} ${url}`.toLowerCase().split('?')[0];
  if (value.endsWith('.pdf')) return 'application/pdf';
  if (value.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (value.endsWith('.doc')) return 'application/msword';
  if (value.endsWith('.png')) return 'image/png';
  if (value.endsWith('.webp')) return 'image/webp';
  if (value.endsWith('.gif')) return 'image/gif';
  if (value.endsWith('.jpg') || value.endsWith('.jpeg')) return 'image/jpeg';
  return '';
}

export default function PassageAssetViewer({ passage, compact = false }) {
  if (!passage?.attachmentUrl) return null;

  const source = resolveAssetUrl(passage.attachmentUrl);
  const mimeType = passage.attachmentMimeType || inferMimeType(passage.attachmentName, source);
  const title = passage.attachmentName || 'Passage document';
  const isImage = IMAGE_TYPES.has(mimeType);
  const isPdf = mimeType === 'application/pdf';
  const isWord = WORD_TYPES.has(mimeType);
  const viewerSource = isWord
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(source)}`
    : source;

  return (
    <section className={`passage-asset-viewer ${compact ? 'compact' : ''}`.trim()} aria-label={`Attached material: ${title}`}>
      <header>
        <span><FileText aria-hidden="true" /><b>{title}</b></span>
        <a href={source} target="_blank" rel="noreferrer" title="Open source file">
          <ExternalLink aria-hidden="true" />
          <span>Open</span>
        </a>
      </header>
      {isImage ? (
        <img src={source} alt={title} loading="lazy" />
      ) : isPdf || isWord ? (
        <iframe
          src={isPdf ? `${viewerSource}#toolbar=1&navpanes=0&view=FitH` : viewerSource}
          title={title}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="passage-asset-fallback">
          <FileText aria-hidden="true" />
          <p>This material opens in a separate viewer.</p>
        </div>
      )}
    </section>
  );
}
