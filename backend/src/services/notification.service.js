import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';

export async function createNotification({ userId, type, title, message, metadata = null }) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      metadata
    }
  });
}

export async function listNotifications(userId) {
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30
    }),
    prisma.notification.count({
      where: { userId, isRead: false }
    })
  ]);

  return { items, unreadCount };
}

export async function markNotificationRead(userId, id) {
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== userId) {
    throw new ApiError(404, 'Notification not found.');
  }

  return prisma.notification.update({
    where: { id },
    data: { isRead: true }
  });
}

export async function markAllNotificationsRead(userId) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true }
  });

  return listNotifications(userId);
}
