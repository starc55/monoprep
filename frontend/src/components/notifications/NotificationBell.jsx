import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck, Sparkles } from 'lucide-react';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../services/notificationService.js';

function formatType(type = '') {
  return type.toLowerCase().replaceAll('_', ' ');
}

export default function NotificationBell() {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function loadNotifications({ silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const response = await getNotifications();
      setItems(response.items || []);
      setUnreadCount(response.unreadCount || 0);
    } catch (_error) {
      if (!silent) {
        setItems([]);
        setUnreadCount(0);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    function closeOnOutsideClick(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function readOne(id) {
    const notification = items.find((item) => item.id === id);
    if (!notification || notification.isRead) return;

    setItems((current) => current.map((item) => (
      item.id === id ? { ...item, isRead: true } : item
    )));
    setUnreadCount((current) => Math.max(0, current - 1));
    void markNotificationRead(id).catch(() => loadNotifications({ silent: true }));
  }

  function readAll() {
    if (!unreadCount) return;

    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    void markAllNotificationsRead().catch(() => loadNotifications({ silent: true }));
  }

  return (
    <div className="notification-bell" ref={rootRef}>
      <button
        type="button"
        className="notification-trigger"
        aria-label={unreadCount ? `Open notifications, ${unreadCount} unread` : 'Open notifications'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell aria-hidden="true" />
        {unreadCount ? <span className="notification-dot" aria-hidden="true" /> : null}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="notification-popover"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            <div className="notification-popover-head">
              <div>
                <strong>Notifications</strong>
                <span>{unreadCount} unread</span>
              </div>
              <button type="button" onClick={readAll} disabled={!unreadCount} aria-label="Mark all notifications as read" title="Mark all as read">
                <CheckCheck aria-hidden="true" />
              </button>
            </div>
            <div className="notification-list">
              {loading ? <p className="helper-copy">Loading notifications...</p> : null}
              {!loading && !items.length ? (
                <div className="notification-empty">
                  <Sparkles aria-hidden="true" />
                  <span>No notifications yet.</span>
                </div>
              ) : null}
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.isRead ? 'read' : ''}
                  onClick={() => readOne(item.id)}
                >
                  <span>{formatType(item.type)}</span>
                  <strong>{item.title}</strong>
                  <small>{item.message}</small>
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
