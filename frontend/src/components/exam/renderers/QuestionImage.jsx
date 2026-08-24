import { useState } from 'react';
import { resolveAssetUrl } from '../../../utils/assets.js';

export default function QuestionImage({ src, alt = 'Question reference graphic' }) {
  const [expanded, setExpanded] = useState(false);

  if (!src) {
    return null;
  }

  return (
    <figure className={`question-image ${expanded ? 'expanded' : ''}`.trim()}>
      <button
        type="button"
        className="question-image-zoom"
        aria-label={expanded ? 'Return image to normal size' : 'Enlarge image'}
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <img src={resolveAssetUrl(src)} alt={alt} />
      </button>
    </figure>
  );
}
