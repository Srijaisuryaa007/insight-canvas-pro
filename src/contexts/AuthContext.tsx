import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { SubscriptionPlan, AddonType } from '@/types';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  profilePicture?: string;
  plan: SubscriptionPlan;
  credits: number;
  addons: AddonType[];
  createdAt: string;
}

interface AuthContextType {
  user: AppUser | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updatePlan: (plan: SubscriptionPlan) => void;
  addAddon: (addon: AddonType) => void;
  deductCredits: (amount: number) => boolean;
  addCredits: (amount: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'datavora_user';
const DEFAULT_FREE_CREDITS = 5000;

// ── Supabase profile helper ──
async function upsertProfile(supabaseUser: SupabaseUser): Promise<AppUser> {
  if (!supabase) throw new Error('Supabase not configured');
  const meta = supabaseUser.user_metadata || {};
  const name = meta.full_name || meta.name || meta.display_name || supabaseUser.email?.split('@')[0] || 'User';
  const profilePicture = meta.avatar_url || meta.picture || undefined;

  const { data: existing } = await supabase
    .from('profiles').select('*').eq('id', supabaseUser.id).single();

  if (existing) {
    return {
      id: existing.id, email: existing.email, name: existing.name,
      profilePicture: existing.profile_picture || profilePicture,
      plan: existing.subscription_plan || 'free',
      credits: existing.credits_balance ?? DEFAULT_FREE_CREDITS,
      addons: existing.addons || [], createdAt: existing.created_at,
    };
  }

  const newProfile = {
    id: supabaseUser.id, email: supabaseUser.email!, name,
    profile_picture: profilePicture || null, subscription_plan: 'free',
    credits_balance: DEFAULT_FREE_CREDITS, addons: [], created_at: new Date().toISOString(),
  };

  await supabase.from('profiles').insert(newProfile).select().single();

  return {
    id: newProfile.id, email: newProfile.email, name: newProfile.name,
    profilePicture: profilePicture, plan: 'free',
    credits: DEFAULT_FREE_CREDITS, addons: [], createdAt: newProfile.created_at,
  };
}

// ── localStorage helpers (fallback when Supabase not configured) ──
function loadLocalUser(): AppUser | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}
function saveLocalUser(u: AppUser) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  localStorage.setItem(`datavora_users_${u.email}`, JSON.stringify(u));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      // ── Supabase auth flow ──
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, newSession) => {
          setSession(newSession);
          setSupabaseUser(newSession?.user ?? null);
          if (newSession?.user) {
            setTimeout(async () => {
              try { setUser(await upsertProfile(newSession.user)); } catch (e) { console.error(e); }
              setIsLoading(false);
            }, 0);
          } else { setUser(null); setIsLoading(false); }
        }
      );
      supabase.auth.getSession().then(async ({ data: { session: s } }) => {
        if (s?.user) {
          setSession(s); setSupabaseUser(s.user);
          try { setUser(await upsertProfile(s.user)); } catch (e) { console.error(e); }
        }
        setIsLoading(false);
      });
      return () => subscription.unsubscribe();
    } else {
      // ── localStorage fallback ──
      setUser(loadLocalUser());
      setIsLoading(false);
    }
  }, []);

  // ── Login ──
  const login = async (email: string, password: string): Promise<boolean> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return !error;
    }
    const stored = localStorage.getItem(`datavora_users_${email}`);
    if (stored) { const u = JSON.parse(stored); saveLocalUser(u); setUser(u); return true; }
    return false;
  };

  // ── Signup ──
  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { data: { full_name: name }, emailRedirectTo: window.location.origin },
      });
      if (error) {
        console.error('[Auth] Signup error:', error.message, error);
        throw new Error(error.message);
      }
      console.log('[Auth] Signup success:', data);
      return true;
    }
    const newUser: AppUser = {
      id: crypto.randomUUID(), email, name, plan: 'free',
      credits: DEFAULT_FREE_CREDITS, addons: [], createdAt: new Date().toISOString(),
    };
    saveLocalUser(newUser); setUser(newUser); return true;
  };

  // ── Google OAuth ──
  const loginWithGoogle = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signInWithOAuth({
        provider: 'google', options: { redirectTo: `${window.location.origin}/dashboard` },
      });
    } else {
      console.warn('Google login requires Supabase configuration.');
    }
  };

  // ── Logout ──
  const logout = async () => {
    if (isSupabaseConfigured && supabase) { await supabase.auth.signOut(); }
    localStorage.removeItem(STORAGE_KEY);
    setUser(null); setSession(null); setSupabaseUser(null);
  };

  // ── Plan / Credits / Addons ──
  const persistUpdate = (updated: AppUser) => {
    setUser(updated);
    if (isSupabaseConfigured && supabase) {
      supabase.from('profiles').update({
        subscription_plan: updated.plan, credits_balance: updated.credits, addons: updated.addons,
      }).eq('id', updated.id);
    } else { saveLocalUser(updated); }
  };

  const updatePlan = (plan: SubscriptionPlan) => {
    if (!user) return;
    const credits = plan === 'free' ? 100 : plan === 'pro' ? 1000 : 99999;
    persistUpdate({ ...user, plan, credits });
  };

  const addAddon = (addon: AddonType) => {
    if (!user || user.addons.includes(addon)) return;
    persistUpdate({ ...user, addons: [...user.addons, addon] });
  };

  const deductCredits = (amount: number): boolean => {
    if (!user) return false;
    if (user.plan === 'enterprise') return true;
    if (user.credits < amount) return false;
    persistUpdate({ ...user, credits: user.credits - amount });
    return true;
  };

  const addCredits = (amount: number) => {
    if (!user) return;
    persistUpdate({ ...user, credits: user.credits + amount });
  };

  return (
    <AuthContext.Provider value={{
      user, supabaseUser, session,
      isAuthenticated: isSupabaseConfigured ? !!session : !!user,
      isLoading, login, signup, loginWithGoogle, logout,
      updatePlan, addAddon, deductCredits, addCredits,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
