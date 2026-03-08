import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  description: string;
  read: boolean;
  createdAt: string;
  category: 'dataset' | 'quality' | 'report' | 'plan' | 'connector' | 'insight' | 'system';
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  filterByCategory: (cat: string) => AppNotification[];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Load from Supabase
  useEffect(() => {
    if (!user || !isSupabaseConfigured || !supabase) return;
    supabase.from('notifications').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => {
        if (data) {
          setNotifications(data.map(n => ({
            id: n.id, type: n.type as any, title: n.title,
            description: n.description, read: n.read,
            createdAt: n.created_at, category: n.category as any,
          })));
        }
      });
  }, [user]);

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => {
    const newN: AppNotification = {
      ...n, id: crypto.randomUUID(), read: false, createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [newN, ...prev].slice(0, 100));

    if (isSupabaseConfigured && supabase && user) {
      supabase.from('notifications').insert({
        id: newN.id, user_id: user.id, type: newN.type, title: newN.title,
        description: newN.description, read: false, category: newN.category,
      }).then();
    }
  }, [user]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (isSupabaseConfigured && supabase) {
      supabase.from('notifications').update({ read: true }).eq('id', id).then();
    }
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (isSupabaseConfigured && supabase && user) {
      supabase.from('notifications').update({ read: true }).eq('user_id', user.id).then();
    }
  }, [user]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    if (isSupabaseConfigured && supabase && user) {
      supabase.from('notifications').delete().eq('user_id', user.id).then();
    }
  }, [user]);

  const filterByCategory = useCallback((cat: string) => {
    if (cat === 'all') return notifications;
    return notifications.filter(n => n.category === cat);
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllRead, clearAll, filterByCategory }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
