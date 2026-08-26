import axios from 'axios';
import { supabase } from '../config/supabase.js';

function getDefaultApiUrl() {
  if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return 'http://localhost:5000/api';
  }

  return 'https://monoprep.onrender.com/api';
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || getDefaultApiUrl(),
  timeout: 20000,
  withCredentials: false
});

api.interceptors.request.use(async (config) => {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    if (error.response?.status !== 401 || !request || request._authRetry) {
      return Promise.reject(error);
    }

    request._authRetry = true;
    const { data, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !data.session?.access_token) {
      return Promise.reject(error);
    }

    request.headers = request.headers || {};
    request.headers.Authorization = `Bearer ${data.session.access_token}`;
    return api(request);
  }
);

export default api;
