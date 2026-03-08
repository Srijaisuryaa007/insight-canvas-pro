import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
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

const DEFAULT_FREE_CREDITS = 100;

async function upsertProfile(supabaseUser: SupabaseUser): Promise<AppUser> {
  const meta = supabaseUser.user_metadata || {};
  const name = meta.full_name || meta.name || meta.display_name || supabaseUser.email?.split('@')[0] || 'User';
  const profilePicture = meta.avatar_url || meta.picture || undefined;

  // Try to fetch existing profile
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', supabaseUser.id)
    .single();

  if (existing) {
    return {
      id: existing.id,
      email: existing.email,
      name: existing.name,
      profilePicture: existing.profile_picture || profilePicture,
      plan: existing.subscription_plan || 'free',
      credits: existing.credits_balance ?? DEFAULT_FREE_CREDITS,
      addons: existing.addons || [],
      createdAt: existing.created_at,
    };
  }

  // Create new profile
  const newProfile = {
    id: supabaseUser.id,
    email: supabaseUser.email!,
    name,
    profile_picture: profilePicture || null,
    subscription_plan: 'free',
    credits_balance: DEFAULT_FREE_CREDITS,
    addons: [],
    created_at: new Date().toISOString(),
  };

  const { data: created, error } = await supabase
    .from('profiles')
    .insert(newProfile)
    .select()
    .single();

  if (error) {
    console.error('Error creating profile:', error);
  }

  const profile = created || newProfile;

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    profilePicture: profile.profile_picture || profilePicture,
    plan: profile.subscription_plan || 'free',
    credits: profile.credits_balance ?? DEFAULT_FREE_CREDITS,
    addons: profile.addons || [],
    createdAt: profile.created_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set up auth listener BEFORE getSession
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setSupabaseUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Defer profile fetch to avoid Supabase deadlock
          setTimeout(async () => {
            try {
              const appUser = await upsertProfile(newSession.user);
              setUser(appUser);
            } catch (err) {
              console.error('Profile sync error:', err);
            }
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // Then check existing session
    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      if (existingSession?.user) {
        setSession(existingSession);
        setSupabaseUser(existingSession.user);
        try {
          const appUser = await upsertProfile(existingSession.user);
          setUser(appUser);
        } catch (err) {
          console.error('Profile sync error:', err);
        }
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  };

  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: window.location.origin,
      },
    });
    return !error;
  };

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setSupabaseUser(null);
  };

  const updatePlan = async (plan: SubscriptionPlan) => {
    if (!user) return;
    const credits = plan === 'free' ? 100 : plan === 'pro' ? 1000 : 99999;
    const updated = { ...user, plan, credits };
    setUser(updated);

    await supabase.from('profiles').update({
      subscription_plan: plan,
      credits_balance: credits,
    }).eq('id', user.id);
  };

  const addAddon = async (addon: AddonType) => {
    if (!user || user.addons.includes(addon)) return;
    const updatedAddons = [...user.addons, addon];
    const updated = { ...user, addons: updatedAddons };
    setUser(updated);

    await supabase.from('profiles').update({
      addons: updatedAddons,
    }).eq('id', user.id);
  };

  const deductCredits = (amount: number): boolean => {
    if (!user) return false;
    if (user.plan === 'enterprise') return true;
    if (user.credits < amount) return false;
    const newCredits = user.credits - amount;
    const updated = { ...user, credits: newCredits };
    setUser(updated);

    supabase.from('profiles').update({
      credits_balance: newCredits,
    }).eq('id', user.id);

    return true;
  };

  const addCredits = (amount: number) => {
    if (!user) return;
    const newCredits = user.credits + amount;
    const updated = { ...user, credits: newCredits };
    setUser(updated);

    supabase.from('profiles').update({
      credits_balance: newCredits,
    }).eq('id', user.id);
  };

  return (
    <AuthContext.Provider value={{
      user,
      supabaseUser,
      session,
      isAuthenticated: !!session,
      isLoading,
      login,
      signup,
      loginWithGoogle,
      logout,
      updatePlan,
      addAddon,
      deductCredits,
      addCredits,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
