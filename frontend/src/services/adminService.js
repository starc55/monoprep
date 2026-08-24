import api from './api.js';

export async function getUsers() {
  const { data } = await api.get('/admin/users');
  return data.users;
}

export async function updateUserPremiumAccess(userId, premiumUntil) {
  const { data } = await api.patch(`/admin/users/${userId}/premium`, { premiumUntil });
  return data.user;
}

export async function getStats() {
  const { data } = await api.get('/admin/stats');
  return data.stats;
}
