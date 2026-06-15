import api from './api.js';

export async function getQuestionBankItems(params = {}) {
  const { data } = await api.get('/question-bank', { params });
  return data.items;
}

export async function createQuestionBankItem(payload) {
  const { data } = await api.post('/question-bank', payload);
  return data.item;
}

export async function updateQuestionBankItem(id, payload) {
  const { data } = await api.put(`/question-bank/${id}`, payload);
  return data.item;
}

export async function deleteQuestionBankItem(id) {
  const { data } = await api.delete(`/question-bank/${id}`);
  return data;
}
