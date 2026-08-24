import { create } from 'zustand';
import {
  fetchCurrentUser,
  loginWithGoogle,
  loginUser,
  logoutUser,
  registerUser,
  updateCurrentUser
} from '../services/authService.js';
import { supabase } from '../config/supabase.js';

export const useAuthStore = create((set) => ({
  user: null,
  loading: false,
  initialized: false,
  error: '',
  verificationRequired: false,
  hydrate: async () => {
    localStorage.removeItem('monoprep-token');
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) {
      set({ user: null, initialized: true });
      return null;
    }

    try {
      const user = await fetchCurrentUser();
      set({ user, initialized: true });
      return user;
    } catch (error) {
      if ([401, 403].includes(error?.response?.status)) {
        await supabase.auth.signOut({ scope: 'local' });
      }
      set({ user: null, initialized: true });
      return null;
    }
  },
  subscribeToAuth: () => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        set({ user: null, initialized: true });
        return;
      }

      window.setTimeout(async () => {
        try {
          const user = await fetchCurrentUser();
          set({ user, initialized: true, error: '' });
        } catch (error) {
          if ([401, 403].includes(error?.response?.status)) {
            await supabase.auth.signOut({ scope: 'local' });
          }
          set({ user: null, initialized: true });
        }
      }, 0);
    });

    return data.subscription;
  },
  login: async (payload) => {
    set({ loading: true, error: '' });
    try {
      const data = await loginUser(payload);
      set({ user: data.user, loading: false, verificationRequired: false });
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
      set({
        user: data.user,
        loading: false,
        verificationRequired: data.needsEmailVerification
      });
      return data;
    } catch (error) {
      set({
        loading: false,
        error: error.response?.data?.message || error.message || 'Unable to register.'
      });
      throw error;
    }
  },
  loginWithGoogle: async () => {
    set({ loading: true, error: '' });
    try {
      await loginWithGoogle();
    } catch (error) {
      set({ loading: false, error: error.message || 'Google sign-in could not start.' });
      throw error;
    }
  },
  updateProfile: async (payload) => {
    const user = await updateCurrentUser(payload);
    set({ user });
    return user;
  },
  logout: async () => {
    try {
      await logoutUser();
    } finally {
      localStorage.removeItem('monoprep-token');
      set({ user: null, error: '', verificationRequired: false });
    }
  }
}));
