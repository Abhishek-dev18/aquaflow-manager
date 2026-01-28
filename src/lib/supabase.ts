/**
 * Supabase Client Configuration
 * Centralized Supabase initialization for admin-only authentication
 * 
 * SECURITY: Never expose service role key on frontend.
 * Only use anon key with Row Level Security (RLS) enabled.
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables via Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
  );
}

// Initialize Supabase client
// This client is safe for browser use - it uses the anon key and respects RLS
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/**
 * Admin login - email and password only
 * Assumes admin users are pre-created in Supabase Auth
 */
export const loginAdmin = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    alert('Login failed: ' + error.message);
    throw new Error(error.message);
  }
  
  return data;
};

/**
 * Logout user
 */
export const logoutUser = async () => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    alert('Logout failed: ' + error.message);
    throw new Error(error.message);
  }
};

/**
 * Get current session
 */
export const getCurrentSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    alert('Failed to get session: ' + error.message);
    return null;
  }
  
  return data.session;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async () => {
  const session = await getCurrentSession();
  return !!session;
};

/**
 * Listen to auth state changes
 * Use this to sync authentication state across the app
 */
export const onAuthStateChange = (
  callback: (isLoggedIn: boolean, session: any) => void
) => {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(!!session, session);
  });
  
  // Return unsubscribe function
  return () => {
    data?.subscription?.unsubscribe();
  };
};
