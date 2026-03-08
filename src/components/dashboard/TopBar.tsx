import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bell, CheckCheck, Sun, Moon, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function TopBar() {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  // Dark mode state
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('datapulse_theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('datapulse_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="h-14 border-b border-border bg-card px-6 flex items-center justify-end gap-3">
      {/* Credits Badge */}
      {user && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
          <CreditCard className="h-3.5 w-3.5" />
          <span>{user.credits} credits</span>
          <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
            {user.plan}
          </Badge>
        </div>
      )}

      {/* Dark Mode Toggle */}
      <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)} title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>

      {/* Notifications */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full text-[10px] flex items-center justify-center text-destructive-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <p className="text-sm font-medium">Notifications</p>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-6" onClick={markAllRead}>
                <CheckCheck className="h-3 w-3 mr-1" />Mark all read
              </Button>
            )}
          </div>
          <ScrollArea className="h-64">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
            ) : (
              <div className="space-y-1 p-2">
                {notifications.slice(0, 10).map(n => (
                  <div key={n.id} className={cn("p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                    !n.read && "bg-primary/5")} onClick={() => markAsRead(n.id)}>
                    <p className={cn("text-xs", !n.read && "font-semibold")}>{n.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{n.description}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="p-2 border-t border-border">
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate('/dashboard/profile')}>
              View all notifications
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
              {user?.profilePicture && (
                <AvatarImage src={user.profilePicture} alt={user.name} />
              )}
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {user?.name?.charAt(0).toUpperCase() ?? 'U'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-popover" align="end">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>Profile</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>Settings</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive">
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
