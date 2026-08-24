import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button.jsx';
import LordIcon from '../ui/LordIcon.jsx';
import Modal from '../ui/Modal.jsx';
import { sendSupportRequest } from '../../services/supportService.js';

const SUPPORT_ICON = 'https://cdn.lordicon.com/fttvwdlw.json';
const SEND_ICON = 'https://cdn.lordicon.com/hmpomorl.json';
const POSITION_KEY = 'monoprep-support-button-position';
const EDGE_GAP = 14;

function clampPosition(position, element) {
  if (!position || !element) return position;
  const width = element.offsetWidth || 64;
  const height = element.offsetHeight || 64;
  const maxX = Math.max(EDGE_GAP, window.innerWidth - width - EDGE_GAP);
  const maxY = Math.max(EDGE_GAP, window.innerHeight - height - EDGE_GAP);
  return {
    x: Math.min(Math.max(position.x, EDGE_GAP), maxX),
    y: Math.min(Math.max(position.y, EDGE_GAP), maxY)
  };
}

function readSavedPosition() {
  try {
    const value = JSON.parse(localStorage.getItem(POSITION_KEY) || 'null');
    return typeof value?.x === 'number' && typeof value?.y === 'number' ? value : null;
  } catch (_error) {
    return null;
  }
}

export default function SupportWidget() {
  const form = useForm({
    defaultValues: {
      subject: '',
      message: ''
    }
  });
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [position, setPosition] = useState(readSavedPosition);
  const [dragging, setDragging] = useState(false);
  const buttonRef = useRef(null);
  const dragRef = useRef(null);
  const draggedClickRef = useRef(false);

  useEffect(() => {
    function handleResize() {
      setPosition((current) => {
        const next = clampPosition(current, buttonRef.current);
        if (next) localStorage.setItem(POSITION_KEY, JSON.stringify(next));
        return next;
      });
    }

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  async function handleSubmit(values) {
    setSending(true);
    setStatus({ type: '', message: '' });

    try {
      await sendSupportRequest({
        ...values,
        pageUrl: window.location.href
      });
      form.reset();
      setStatus({
        type: 'success',
        message: 'Support request sent. We received it in Telegram.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.response?.data?.message || 'Support request could not be sent right now.'
      });
    } finally {
      setSending(false);
    }
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
      lastPosition: position,
      moved: false
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);
  }

  function handlePointerMove(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (distance > 4) drag.moved = true;

    const next = clampPosition(
      {
        x: event.clientX - drag.offsetX,
        y: event.clientY - drag.offsetY
      },
      buttonRef.current
    );
    if (next) {
      drag.lastPosition = next;
      setPosition(next);
    }
  }

  function finishDrag(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setDragging(false);
    dragRef.current = null;

    if (drag.lastPosition) localStorage.setItem(POSITION_KEY, JSON.stringify(drag.lastPosition));
    if (drag.moved) {
      draggedClickRef.current = true;
      window.setTimeout(() => {
        draggedClickRef.current = false;
      }, 0);
    }
  }

  function handleButtonClick(event) {
    if (draggedClickRef.current) {
      event.preventDefault();
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`support-floating-button ${dragging ? 'is-dragging' : ''}`.trim()}
        aria-label="Open support"
        style={position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined}
        onClick={handleButtonClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <LordIcon src={SUPPORT_ICON} size={34} colors="primary:#ffffff,secondary:#93c5fd" />
        <span>Support</span>
      </button>

      <Modal
        open={open}
        title="Support"
        className="support-widget-modal"
        onClose={() => setOpen(false)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button type="submit" form="support-widget-form" disabled={sending}>
              {sending ? 'Sending...' : 'Send to support'}
            </Button>
          </>
        }
      >
        <div className="support-widget-head">
          <span>
            <LordIcon src={SEND_ICON} size={44} />
          </span>
          <p>Tell us what is not working. Your message is sent directly to the MonoPrep Telegram support channel.</p>
        </div>
        <form id="support-widget-form" className="support-widget-form" onSubmit={form.handleSubmit(handleSubmit)}>
          <label>
            Subject
            <input
              placeholder="Example: Exam timer issue"
              {...form.register('subject', { required: true })}
            />
          </label>
          <label>
            Problem
            <textarea
              placeholder="Describe what happened, which page you were on, and what you expected."
              {...form.register('message', { required: true })}
            />
          </label>
          {status.message ? (
            <p className={`support-status ${status.type}`.trim()}>{status.message}</p>
          ) : null}
        </form>
      </Modal>
    </>
  );
}
