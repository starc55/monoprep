import api from './api.js';

export async function getNotifications() {
  const { data } = await api.get('/notifications');
  return data.notifications;
}

export async function markNotificationRead(id) {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data.notification;
}

export async function markAllNotificationsRead() {
  const { data } = await api.patch('/notifications/read-all');
  return data.notifications;
}
