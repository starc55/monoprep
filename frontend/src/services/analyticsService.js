import api from './api.js';

export async function getMyAnalytics() {
  const { data } = await api.get('/analytics/me');
  return data.analytics;
}

export async function getAdminAnalytics() {
  const { data } = await api.get('/analytics/admin');
  return data.analytics;
}
