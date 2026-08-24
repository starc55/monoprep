import api from './api.js';
import { supabase } from '../config/supabase.js';

function authRedirect(path) {
  return `${window.location.origin}${path}`;
}

function createAuthError(error, fallback) {
  const rawMessage = error?.response?.data?.message || error?.message || fallback;
  const normalized = rawMessage.toLowerCase();
  let message = rawMessage;

  if (normalized.includes('invalid login credentials')) {
    message = 'Email or password is incorrect.';
  } else if (normalized.includes('email not confirmed')) {
    message = 'Verify your email before signing in.';
  } else if (normalized.includes('user already registered')) {
    message = 'Email is already registered.';
  } else if (normalized.includes('legacy monoprep account')) {
    message = 'This existing account needs a password migration. Use Forgot password.';
  } else if (normalized.includes('network')) {
    message = 'Network error. Check your connection and try again.';
  }

  const authError = new Error(message);
  authError.code = error?.code || error?.response?.data?.code || '';
  authError.status = error?.status || error?.response?.status;
  return authError;
}

export async function registerUser(payload) {
  const { fullName, email, password } = payload;
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { full_name: fullName.trim() },
      emailRedirectTo: authRedirect('/auth/callback')
    }
  });

  if (error) {
    throw createAuthError(error, 'Unable to create your account.');
  }

  const user = data.session ? await fetchCurrentUser() : null;
  return {
    user,
    needsEmailVerification: !data.session
  };
}

export async function loginUser(payload) {
  const { error } = await supabase.auth.signInWithPassword({
    email: payload.email.trim().toLowerCase(),
    password: payload.password
  });

  if (error) {
    throw createAuthError(error, 'Unable to sign in.');
  }

  try {
    return { user: await fetchCurrentUser() };
  } catch (error) {
    await supabase.auth.signOut();
    throw createAuthError(error, 'MonoPrep could not load your account.');
  }
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data.user;
}

export async function updateCurrentUser(payload) {
  const { data } = await api.put('/auth/me', payload);
  return data.user;
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw createAuthError(error, 'Unable to sign out.');
  }
}

export async function loginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: authRedirect('/auth/callback')
    }
  });
  if (error) {
    throw createAuthError(error, 'Google sign-in could not start.');
  }
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: authRedirect('/reset-password') }
  );
  if (error) {
    throw createAuthError(error, 'Password reset email could not be sent.');
  }
}

export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    throw createAuthError(error, 'Password could not be updated.');
  }
}

export async function uploadAvatar(file) {
  const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
  if (!allowedTypes.has(file.type)) {
    throw new Error('Choose a PNG, JPG, WEBP, or GIF image.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Avatar image must be 5 MB or smaller.');
  }

  const body = new FormData();
  body.append('image', file);
  try {
    const { data } = await api.post('/uploads/avatar', body);
    return data.url;
  } catch (error) {
    throw createAuthError(error, 'Avatar could not be uploaded.');
  }
}
