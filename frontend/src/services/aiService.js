import api from './api.js';

export async function generateFeedback(attemptId) {
  const { data } = await api.post(`/ai/feedback/${attemptId}`);
  return data.feedback;
}

export async function getFeedback(attemptId) {
  const { data } = await api.get(`/ai/feedback/${attemptId}`);
  return data.feedback;
}
