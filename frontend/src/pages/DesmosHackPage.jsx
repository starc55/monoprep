import { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, BookOpen, Calculator, ChevronLeft, ChevronRight, FunctionSquare, Images, X } from 'lucide-react';
import AppLayout from '../layouts/AppLayout.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Loader from '../components/ui/Loader.jsx';
import AnimatedModal from '../components/motion/AnimatedModal.jsx';
import CalculatorModal from '../components/exam/renderers/CalculatorModal.jsx';
import MathJaxContent from '../components/math/MathJaxContent.jsx';
import { getDesmosLessons } from '../services/desmosService.js';
import { resolveAssetUrl } from '../utils/assets.js';
import '../styles/pages/desmos-hack.css';

function lessonImages(lesson) {
  if (Array.isArray(lesson?.imageUrls) && lesson.imageUrls.length) return lesson.imageUrls;
  return lesson?.imageUrl ? [lesson.imageUrl] : [];
}

function LessonViewer({ lesson, lessonNumber, totalLessons, onClose, onPrevious, onNext, onOpenCalculator }) {
  const titleId = useId();
  const images = lessonImages(lesson);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => setActiveImage(0), [lesson?.id]);

  return (
    <AnimatedModal
      open={Boolean(lesson)}
      onClose={onClose}
      labelledBy={titleId}
      backdropClassName="desmos-viewer-backdrop"
      className="desmos-lesson-viewer"
    >
      <header className="desmos-viewer-header">
        <div>
          <span><BookOpen aria-hidden="true" /> Lesson {lessonNumber} of {totalLessons}</span>
          <h2 id={titleId}>{lesson?.title}</h2>
          {lesson?.summary ? <p>{lesson.summary}</p> : null}
        </div>
        <button type="button" className="desmos-viewer-icon-button" onClick={onClose} aria-label="Close lesson" title="Close lesson">
          <X aria-hidden="true" />
        </button>
      </header>

      <div className={`desmos-viewer-content ${images.length ? '' : 'without-media'}`.trim()}>
        {images.length ? (
          <aside className="desmos-viewer-media" aria-label="Lesson visuals">
            <div className="desmos-viewer-stage">
              <AnimatePresence mode="wait" initial={false}>
                <motion.img
                  key={`${lesson.id}-${activeImage}`}
                  src={resolveAssetUrl(images[activeImage])}
                  alt={`${lesson.title}, visual ${activeImage + 1}`}
                  initial={{ opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.01 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                />
              </AnimatePresence>
              {images.length > 1 ? <span><Images aria-hidden="true" /> {activeImage + 1} / {images.length}</span> : null}
            </div>
            {images.length > 1 ? (
              <div className="desmos-viewer-thumbnails">
                {images.map((imageUrl, index) => (
                  <button
                    key={`${imageUrl}-${index}`}
                    type="button"
                    className={activeImage === index ? 'active' : ''}
                    onClick={() => setActiveImage(index)}
                    aria-label={`Show visual ${index + 1}`}
                    aria-pressed={activeImage === index}
                  >
                    <img src={resolveAssetUrl(imageUrl)} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            ) : null}
          </aside>
        ) : null}

        <main className="desmos-viewer-theory">
          <div className="desmos-viewer-theory-label">Theory</div>
          <MathJaxContent block className="desmos-theory">{lesson?.theory}</MathJaxContent>
        </main>
      </div>

      <footer className="desmos-viewer-footer">
        <div className="desmos-viewer-navigation">
          <button type="button" onClick={onPrevious} disabled={!onPrevious} aria-label="Previous lesson" title="Previous lesson">
            <ChevronLeft aria-hidden="true" />
          </button>
          <span>{lessonNumber} / {totalLessons}</span>
          <button type="button" onClick={onNext} disabled={!onNext} aria-label="Next lesson" title="Next lesson">
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
        <button type="button" className="desmos-viewer-calculator" onClick={onOpenCalculator}>
          <Calculator aria-hidden="true" /> Open calculator
        </button>
      </footer>
    </AnimatedModal>
  );
}

export default function DesmosHackPage() {
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState([]);
  const [activeLessonIndex, setActiveLessonIndex] = useState(-1);
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
          <p>Select a lesson to study its visual guide, formulas, and worked strategy in one focused view.</p>
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
            const images = lessonImages(lesson);
            return (
              <motion.article
                key={lesson.id}
                className="desmos-lesson"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                whileHover={{ y: -3 }}
              >
                {images[0] ? (
                  <button type="button" className="desmos-lesson-media" onClick={() => setActiveLessonIndex(index)} aria-label={`Open ${lesson.title}`}>
                    <img src={resolveAssetUrl(images[0])} alt={lesson.title} />
                    {images.length > 1 ? <span className="desmos-image-count">{images.length} visuals</span> : null}
                  </button>
                ) : (
                  <button type="button" className="desmos-lesson-media placeholder" onClick={() => setActiveLessonIndex(index)} aria-label={`Open ${lesson.title}`}>
                    <FunctionSquare aria-hidden="true" />
                  </button>
                )}
                <div className="desmos-lesson-copy">
                  <span>Lesson {index + 1}</span>
                  <h3>{lesson.title}</h3>
                  <p>{lesson.summary}</p>
                  <button type="button" className="desmos-expand-button" onClick={() => setActiveLessonIndex(index)}>
                    Study lesson
                    <ArrowUpRight aria-hidden="true" />
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
      <LessonViewer
        lesson={activeLessonIndex >= 0 ? lessons[activeLessonIndex] : null}
        lessonNumber={activeLessonIndex + 1}
        totalLessons={lessons.length}
        onClose={() => setActiveLessonIndex(-1)}
        onPrevious={activeLessonIndex > 0 ? () => setActiveLessonIndex((index) => index - 1) : null}
        onNext={activeLessonIndex >= 0 && activeLessonIndex < lessons.length - 1 ? () => setActiveLessonIndex((index) => index + 1) : null}
        onOpenCalculator={() => setCalculatorOpen(true)}
      />
      {!calculatorOpen && activeLessonIndex < 0 ? (
        <button type="button" className="desmos-dock-trigger" onClick={() => setCalculatorOpen(true)} aria-label="Open Desmos calculator" title="Open Desmos calculator">
          <Calculator aria-hidden="true" />
        </button>
      ) : null}
      <CalculatorModal open={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
    </AppLayout>
  );
}
