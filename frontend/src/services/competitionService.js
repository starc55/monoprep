import api from './api.js';

export async function getCompetitionOverview() {
  const { data } = await api.get('/competition');
  return data;
}

export async function startBlitz(payload) {
  const { data } = await api.post('/competition/blitz', payload);
  return data.session;
}

export async function getBlitzSession(id) {
  const { data } = await api.get(`/competition/blitz/${id}`);
  return data.session;
}

export async function submitBlitz(id, answers) {
  const { data } = await api.post(`/competition/blitz/${id}/submit`, { answers });
  return data.session;
}

export async function joinArena(payload) {
  const { data } = await api.post('/competition/arena', payload);
  return data.arena;
}

export async function getArena(id) {
  const { data } = await api.get(`/competition/arena/${id}`);
  return data.arena;
}

export async function submitArena(id, answers) {
  const { data } = await api.post(`/competition/arena/${id}/submit`, { answers });
  return data.arena;
}
