import api from './api.js';

export async function getUsers() {
  const { data } = await api.get('/admin/users');
  return data.users;
}

export async function getStats() {
  const { data } = await api.get('/admin/stats');
  return data.stats;
}

export async function getAttempts() {
  const { data } = await api.get('/admin/attempts');
  return data.attempts;
}
