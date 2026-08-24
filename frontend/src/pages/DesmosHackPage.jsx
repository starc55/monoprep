import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, ChevronDown, FunctionSquare } from 'lucide-react';
import AppLayout from '../layouts/AppLayout.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Loader from '../components/ui/Loader.jsx';
import CalculatorModal from '../components/exam/renderers/CalculatorModal.jsx';
import { getDesmosLessons } from '../services/desmosService.js';
import { resolveAssetUrl } from '../utils/assets.js';
import '../styles/pages/desmos-hack.css';

function lessonImages(lesson) {
  if (Array.isArray(lesson?.imageUrls) && lesson.imageUrls.length) return lesson.imageUrls;
  return lesson?.imageUrl ? [lesson.imageUrl] : [];
}

export default function DesmosHackPage() {
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState([]);
  const [expandedId, setExpandedId] = useState('');
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  useEffect(() => {
    getDesmosLessons()
      .then(setLessons)
      .catch(() => setLessons([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout title="Desmos Hack" subtitle="Learn a strategy, inspect the visual, and test it in the official Desmos calculator.">
      <div className="desmos-hack-page">
        <section className="desmos-lessons-toolbar">
          <div>
            <span>Lesson library</span>
            <strong>{lessons.length} published {lessons.length === 1 ? 'lesson' : 'lessons'}</strong>
          </div>
          <p>Open a lesson image for the full theory. The calculator stays available beside your work.</p>
        </section>

        {loading ? <Loader label="Loading Desmos lessons..." /> : null}
        {!loading && !lessons.length ? (
          <EmptyState
            icon={FunctionSquare}
            title="Desmos lessons are being prepared"
            message="Published visual lessons from your admin will appear here."
          />
        ) : null}

        <div className="desmos-lesson-grid">
          {lessons.map((lesson, index) => {
            const expanded = expandedId === lesson.id;
            const images = lessonImages(lesson);
            return (
              <motion.article
                key={lesson.id}
                className={`desmos-lesson ${expanded ? 'expanded' : ''}`.trim()}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                {images[0] ? (
                  <button type="button" className="desmos-lesson-media" onClick={() => setExpandedId(expanded ? '' : lesson.id)}>
                    <img src={resolveAssetUrl(images[0])} alt={lesson.title} />
                    {images.length > 1 ? <span className="desmos-image-count">{images.length} visuals</span> : null}
                  </button>
                ) : (
                  <div className="desmos-lesson-media placeholder"><FunctionSquare aria-hidden="true" /></div>
                )}
                <div className="desmos-lesson-copy">
                  <span>Lesson {index + 1}</span>
                  <h3>{lesson.title}</h3>
                  <p>{lesson.summary}</p>
                  <button type="button" className="desmos-expand-button" onClick={() => setExpandedId(expanded ? '' : lesson.id)}>
                    {expanded ? 'Hide theory' : 'Read full theory'}
                    <ChevronDown aria-hidden="true" />
                  </button>
                </div>
                {expanded && images.length > 1 ? (
                  <div className="desmos-lesson-gallery">
                    {images.map((imageUrl, imageIndex) => (
                      <img key={`${imageUrl}-${imageIndex}`} src={resolveAssetUrl(imageUrl)} alt={`${lesson.title}, visual ${imageIndex + 1}`} loading="lazy" />
                    ))}
                  </div>
                ) : null}
                {expanded ? <div className="desmos-theory">{lesson.theory}</div> : null}
              </motion.article>
            );
          })}
        </div>
      </div>
      {!calculatorOpen ? (
        <button type="button" className="desmos-dock-trigger" onClick={() => setCalculatorOpen(true)} aria-label="Open Desmos calculator" title="Open Desmos calculator">
          <Calculator aria-hidden="true" />
        </button>
      ) : null}
      <CalculatorModal open={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
    </AppLayout>
  );
}
