import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, Database, BarChart3, Sparkles, FileText, Settings,
  ChevronLeft, ChevronRight, Shield, Lightbulb, LogOut, Zap, Crown, Terminal
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { path: '/dashboard/builder', icon: BarChart3, label: 'Dashboards' },
  { path: '/dashboard/datasets', icon: Database, label: 'Datasets' },
  { path: '/dashboard/quality', icon: Shield, label: 'Data Quality' },
  { path: '/dashboard/insights', icon: Lightbulb, label: 'Insights' },
  { path: '/dashboard/visualizations', icon: BarChart3, label: 'Visualizations' },
  { path: '/dashboard/copilot', icon: Sparkles, label: 'AI Copilot' },
  { path: '/dashboard/reports', icon: FileText, label: 'Reports' },
];

const bottomItems = [
  { path: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const getPlanBadge = () => {
    switch (user?.plan) {
      case 'enterprise':
        return <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 border-0 text-primary-foreground"><Crown className="h-3 w-3 mr-1" /> Enterprise</Badge>;
      case 'pro':
        return <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 border-0 text-primary-foreground">Pro</Badge>;
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };

  return (
    <aside className={cn(
      "h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header — clicking navigates to intro page */}
      <div className="p-4 flex items-center justify-between">
        {!collapsed && (
          <button onClick={() => navigate('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-chart-1 to-chart-2 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-foreground">DataPulse</span>
          </button>
        )}
        {collapsed && (
          <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity mx-auto">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-chart-1 to-chart-2 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
          </button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <Separator />

      {/* Credits Display */}
      {!collapsed && (
        <div className="px-4 py-3">
          <div className="bg-sidebar-accent rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-sidebar-foreground/70">Credits</span>
              {getPlanBadge()}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-sidebar-foreground">
                {user?.plan === 'enterprise' ? '∞' : user?.credits ?? 0}
              </span>
              {user?.plan !== 'enterprise' && (
                <span className="text-xs text-sidebar-foreground/50">remaining</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/dashboard'}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Separator />

      {/* Bottom Navigation */}
      <div className="py-4 px-2">
        <ul className="space-y-1">
          {bottomItems.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              onClick={() => { logout(); navigate('/'); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                "hover:bg-destructive/10 text-sidebar-foreground hover:text-destructive"
              )}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="text-sm">Logout</span>}
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
}
