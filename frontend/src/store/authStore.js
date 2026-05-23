import { create } from 'zustand';
import {
  fetchCurrentUser,
  getStoredToken,
  loginUser,
  logoutUser,
  registerUser,
  updateCurrentUser
} from '../services/authService.js';

export const useAuthStore = create((set) => ({
  token: getStoredToken(),
  user: null,
  loading: false,
  initialized: false,
  error: '',
  hydrate: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ token: null, user: null, initialized: true });
      return;
    }

    try {
      const user = await fetchCurrentUser();
      set({ token, user, initialized: true });
    } catch (error) {
      logoutUser();
      set({ token: null, user: null, initialized: true });
    }
  },
  subscribeToAuth: () => ({
    unsubscribe: () => {}
  }),
  login: async (payload) => {
    set({ loading: true, error: '' });
    try {
      const data = await loginUser(payload);
      set({ token: data.token, user: data.user, loading: false });
      return data.user;
    } catch (error) {
      set({
        loading: false,
        error: error.response?.data?.message || error.message || 'Unable to log in.'
      });
      throw error;
    }
  },
  register: async (payload) => {
    set({ loading: true, error: '' });
    try {
      const data = await registerUser(payload);
      set({ token: data.token, user: data.user, loading: false });
      return data.user;
    } catch (error) {
      set({
        loading: false,
        error: error.response?.data?.message || error.message || 'Unable to register.'
      });
      throw error;
    }
  },
  updateProfile: async (payload) => {
    const user = await updateCurrentUser(payload);
    set({ user });
    return user;
  },
  logout: () => {
    logoutUser();
    set({ token: null, user: null, error: '' });
  }
}));
