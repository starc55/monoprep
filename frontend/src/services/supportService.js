import api from './api.js';

export async function sendSupportRequest(payload) {
  const { data } = await api.post('/support', payload);
  return data;
}

export async function sendQuestionReport(payload) {
  const { data } = await api.post('/support/question-report', payload);
  return data;
}
