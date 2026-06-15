import Button from '../ui/Button.jsx';
import Modal from '../ui/Modal.jsx';

export default function SubmitConfirmModal({
  open,
  title,
  message,
  onCancel,
  onConfirm,
  confirmLabel = 'Confirm',
  pending = false
}) {
  return (
    <Modal
      open={open}
      title={title}
      actions={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={pending}>
            {pending ? 'Working...' : confirmLabel}
          </Button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}
