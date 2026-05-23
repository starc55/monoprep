import { useId } from 'react';
import AnimatedModal from '../motion/AnimatedModal.jsx';

export default function Modal({ open, title, children, actions, className = '', onClose }) {
  const titleId = useId();

  return (
    <AnimatedModal
      open={open}
      labelledBy={titleId}
      onClose={onClose}
      className={`modal-card ${className}`.trim()}
    >
        <h3 id={titleId}>{title}</h3>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">{actions}</div>
    </AnimatedModal>
  );
}
