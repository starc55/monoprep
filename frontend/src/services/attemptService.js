import api from './api.js';

export async function startAttempt(examId) {
  const { data } = await api.post('/attempts/start', { examId });
  return data.attempt;
}

export async function saveAnswer(attemptId, payload) {
  const { data } = await api.post(`/attempts/${attemptId}/answer`, payload);
  return data.answer;
}

export async function completeAttemptSection(attemptId, sectionId) {
  const { data } = await api.post(`/attempts/${attemptId}/sections/${sectionId}/complete`);
  return data.attempt;
}

export async function submitAttempt(attemptId) {
  const { data } = await api.post(`/attempts/${attemptId}/submit`);
  return data.attempt;
}

export async function getAttempt(attemptId) {
  const { data } = await api.get(`/attempts/${attemptId}`);
  return data.attempt;
}

export async function getMyAttempts() {
  const { data } = await api.get('/attempts/me');
  return data.attempts;
}
