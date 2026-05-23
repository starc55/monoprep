import { useEffect, useState } from 'react';
import Button from '../ui/Button.jsx';
import Modal from '../ui/Modal.jsx';
import PassagePanel from '../exam/PassagePanel.jsx';
import QuestionRenderer from '../question/QuestionRenderer.jsx';

export default function AdminExamPreviewModal({ open, section, question, onClose }) {
  const [answer, setAnswer] = useState({});
  const [eliminated, setEliminated] = useState([]);
  const showPassage = section?.type === 'reading_writing';

  useEffect(() => {
    if (open) {
      setAnswer({});
      setEliminated([]);
    }
  }, [open, question?.questionText, section?.id]);

  function toggleEliminated(label) {
    setEliminated((current) => current.includes(label)
      ? current.filter((entry) => entry !== label)
      : [...current, label]);
  }

  return (
    <Modal
      open={open}
      title="Student Preview"
      className="modal-card-preview"
      onClose={onClose}
      actions={<Button variant="ghost" onClick={onClose}>Close preview</Button>}
    >
      <div className={`admin-exam-preview ${showPassage ? '' : 'single-panel'}`.trim()}>
        {showPassage ? <PassagePanel question={question} /> : null}
        <QuestionRenderer
          section={section}
          question={question}
          value={answer}
          onChange={setAnswer}
          questionNumber={1}
          eliminatedValues={eliminated}
          onToggleEliminated={toggleEliminated}
          preview
        />
      </div>
    </Modal>
  );
}
