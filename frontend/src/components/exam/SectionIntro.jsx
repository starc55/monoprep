import Button from '../ui/Button.jsx';

export default function SectionIntro({ section, onContinue, isFinal = false }) {
  return (
    <div className="section-transition">
      <div className="transition-card">
        <span className="card-eyebrow">{isFinal ? 'Final step' : 'Section transition'}</span>
        <h2>{section.title}</h2>
        <p>
          {isFinal
            ? 'You have reached the end of the exam. Review your pacing and submit when ready.'
            : `This section is timed for ${section.duration} minutes. Once you continue, focus on this module only.`}
        </p>
        <Button onClick={onContinue}>{isFinal ? 'Review and Submit' : 'Begin Section'}</Button>
      </div>
    </div>
  );
}
