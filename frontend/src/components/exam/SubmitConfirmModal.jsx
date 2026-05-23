import Button from '../ui/Button.jsx';
import Modal from '../ui/Modal.jsx';

export default function SubmitConfirmModal({
  open,
  title,
  message,
  onCancel,
  onConfirm,
  confirmLabel = 'Confirm'
}) {
  return (
    <Modal
      open={open}
      title={title}
      actions={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}
