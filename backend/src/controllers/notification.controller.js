import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from '../services/notification.service.js';

export async function getNotifications(req, res) {
  const notifications = await listNotifications(req.user.id);
  res.json({ notifications });
}

export async function readNotification(req, res) {
  const notification = await markNotificationRead(req.user.id, req.params.id);
  res.json({ notification });
}

export async function readAllNotifications(req, res) {
  const notifications = await markAllNotificationsRead(req.user.id);
  res.json({ notifications });
}
