import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qyfkuskztfyrkafmpddm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5Zmt1c2t6dGZ5cmthZm1wZGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzgwMTAsImV4cCI6MjA4ODU1NDAxMH0.dV2TLt73LV5e_1JqxI3b6ktMVnHS_lAYD3XSMc2v-E0';

// Only create a real client if credentials are provided
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export const isSupabaseConfigured = !!supabase;
