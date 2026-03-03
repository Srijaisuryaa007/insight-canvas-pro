import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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

const STORAGE_KEY = 'datapulse_notifications';

function loadNotifications(): AppNotification[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(loadNotifications());

  const persist = useCallback((items: AppNotification[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, []);

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => {
    const newN: AppNotification = {
      ...n,
      id: crypto.randomUUID(),
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => {
      const updated = [newN, ...prev].slice(0, 100);
      persist(updated);
      return updated;
    });
  }, [persist]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      persist(updated);
      return updated;
    });
  }, [persist]);

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      persist(updated);
      return updated;
    });
  }, [persist]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    persist([]);
  }, [persist]);

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
