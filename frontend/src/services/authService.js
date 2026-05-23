import api, { tokenKey } from './api.js';

export async function registerUser(payload) {
  const { data } = await api.post('/auth/register', payload);
  localStorage.setItem(tokenKey, data.token);
  return data;
}

export async function loginUser(payload) {
  const { data } = await api.post('/auth/login', payload);
  localStorage.setItem(tokenKey, data.token);
  return data;
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data.user;
}

export async function updateCurrentUser(payload) {
  const { data } = await api.put('/auth/me', payload);
  return data.user;
}

export function getStoredToken() {
  return localStorage.getItem(tokenKey);
}

export function logoutUser() {
  localStorage.removeItem(tokenKey);
}
