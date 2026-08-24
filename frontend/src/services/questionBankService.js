import api from './api.js';

export async function getQuestionBankItems(params = {}) {
  const { data } = await api.get('/question-bank', { params });
  return data.items;
}

export async function createQuestionBankItem(payload) {
  const { data } = await api.post('/question-bank', payload);
  return data.item;
}

export async function getQuestionHubProgress() {
  const { data } = await api.get('/question-bank/progress');
  return data.progress;
}

export async function saveQuestionHubProgress(progress) {
  const { data } = await api.put('/question-bank/progress', progress);
  return data.progress;
}
