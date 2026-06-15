import axios from 'axios';

export const tokenKey = 'monoprep-token';

function getDefaultApiUrl() {
  if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return 'http://localhost:5000/api';
  }

  return 'https://monoprep.onrender.com/api';
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || getDefaultApiUrl(),
  timeout: 20000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(tokenKey);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
