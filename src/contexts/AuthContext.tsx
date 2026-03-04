import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, SubscriptionPlan, AddonType } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  updatePlan: (plan: SubscriptionPlan) => void;
  addAddon: (addon: AddonType) => void;
  deductCredits: (amount: number) => boolean;
  addCredits: (amount: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'datapulse_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch { /* ignore corrupt data */ }
    }
    setIsLoading(false);
  }, []);

  const persistUser = (userData: User) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    const stored = localStorage.getItem(`datapulse_users_${email}`);
    if (stored) {
      const userData = JSON.parse(stored);
      persistUser(userData);
      return true;
    }
    return false;
  };

  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    const newUser: User = {
      id: crypto.randomUUID(),
      email,
      name,
      plan: 'free',
      credits: 100,
      addons: [],
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(`datapulse_users_${email}`, JSON.stringify(newUser));
    persistUser(newUser);
    return true;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const updatePlan = (plan: SubscriptionPlan) => {
    if (user) {
      const credits = plan === 'free' ? 100 : plan === 'pro' ? 1000 : 99999;
      const updated = { ...user, plan, credits };
      persistUser(updated);
      localStorage.setItem(`datapulse_users_${user.email}`, JSON.stringify(updated));
    }
  };

  const addAddon = (addon: AddonType) => {
    if (user && !user.addons.includes(addon)) {
      const updated = { ...user, addons: [...user.addons, addon] };
      persistUser(updated);
      localStorage.setItem(`datapulse_users_${user.email}`, JSON.stringify(updated));
    }
  };

  const deductCredits = (amount: number): boolean => {
    if (!user) return false;
    if (user.plan === 'enterprise') return true;
    if (user.credits < amount) return false;
    const updated = { ...user, credits: user.credits - amount };
    persistUser(updated);
    localStorage.setItem(`datapulse_users_${user.email}`, JSON.stringify(updated));
    return true;
  };

  const addCredits = (amount: number) => {
    if (user) {
      const updated = { ...user, credits: user.credits + amount };
      persistUser(updated);
      localStorage.setItem(`datapulse_users_${user.email}`, JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      signup,
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
