import api from './api.js';

export async function getMentors(params = {}) {
  const { data } = await api.get('/mentors', { params });
  return data.mentors;
}

export async function createMentor(payload) {
  const { data } = await api.post('/mentors', payload);
  return data.mentor;
}

export async function updateMentor(id, payload) {
  const { data } = await api.put(`/mentors/${id}`, payload);
  return data.mentor;
}

export async function deleteMentor(id) {
  const { data } = await api.delete(`/mentors/${id}`);
  return data;
}
