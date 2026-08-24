import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck, Sparkles } from 'lucide-react';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../services/notificationService.js';

function formatType(type = '') {
  return type.toLowerCase().replaceAll('_', ' ');
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function loadNotifications() {
    setLoading(true);
    try {
      const response = await getNotifications();
      setItems(response.items || []);
      setUnreadCount(response.unreadCount || 0);
    } catch (_error) {
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function readOne(id) {
    await markNotificationRead(id);
    await loadNotifications();
  }

  async function readAll() {
    await markAllNotificationsRead();
    await loadNotifications();
  }

  return (
    <div className="notification-bell">
      <button
        type="button"
        className="notification-trigger"
        aria-label="Open notifications"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell aria-hidden="true" />
        {unreadCount ? <span>{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="notification-popover"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
          >
            <div className="notification-popover-head">
              <div>
                <strong>Notifications</strong>
                <span>{unreadCount} unread</span>
              </div>
              <button type="button" onClick={readAll} disabled={!unreadCount}>
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
