import api from './api.js';

export async function sendSupportRequest(payload) {
  const { data } = await api.post('/support', payload);
  return data;
}
