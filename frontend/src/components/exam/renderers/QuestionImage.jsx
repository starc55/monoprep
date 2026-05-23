import { resolveAssetUrl } from '../../../utils/assets.js';

export default function QuestionImage({ src, alt = 'Question reference graphic' }) {
  if (!src) {
    return null;
  }

  return (
    <figure className="question-image">
      <img src={resolveAssetUrl(src)} alt={alt} />
    </figure>
  );
}
