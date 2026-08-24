import api from './api.js';

export async function getDesmosLessons() {
  const { data } = await api.get('/desmos-lessons');
  return data.lessons;
}

export async function createDesmosLesson(payload) {
  const { data } = await api.post('/desmos-lessons', payload);
  return data.lesson;
}

export async function updateDesmosLesson(id, payload) {
  const { data } = await api.patch(`/desmos-lessons/${id}`, payload);
  return data.lesson;
}

export async function deleteDesmosLesson(id) {
  const { data } = await api.delete(`/desmos-lessons/${id}`);
  return data;
}
