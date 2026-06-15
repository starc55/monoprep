import { AlertTriangle } from 'lucide-react';
import Button from './Button.jsx';
import Modal from './Modal.jsx';

export default function ConfirmActionModal({
  open,
  title = 'Confirm action',
  message,
  confirmLabel = 'Confirm',
  pending = false,
  tone = 'danger',
  onCancel,
  onConfirm
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={pending ? undefined : onCancel}
      className="confirm-modal"
      actions={(
        <>
          <Button variant="ghost" onClick={onCancel} disabled={pending}>Cancel</Button>
          <Button className={tone === 'danger' ? 'button-danger-action' : ''} onClick={onConfirm} disabled={pending}>
            {pending ? 'Working...' : confirmLabel}
          </Button>
        </>
      )}
    >
      <div className="confirm-modal-body">
        <span><AlertTriangle aria-hidden="true" /></span>
        <p>{message}</p>
      </div>
    </Modal>
  );
}
