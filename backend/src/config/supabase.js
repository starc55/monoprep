import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

const serverAuthOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
};

export const supabaseAuth = createClient(
  env.supabaseUrl,
  env.supabasePublishableKey,
  serverAuthOptions
);

export const supabaseAdmin = env.supabaseServiceRoleKey
  ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey, serverAuthOptions)
  : null;

export function requireSupabaseAdminClient() {
  if (!supabaseAdmin) {
    const error = new Error('Supabase service-role access is not configured.');
    error.statusCode = 503;
    throw error;
  }

  return supabaseAdmin;
}

export function createUserSupabaseClient(accessToken) {
  return createClient(env.supabaseUrl, env.supabasePublishableKey, {
    ...serverAuthOptions,
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}
