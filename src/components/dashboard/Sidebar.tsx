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
  { path: '/dashboard', icon: LayoutDashboard, label: 'Overview', tour: 'sidebar' },
  { path: '/dashboard/builder', icon: BarChart3, label: 'Dashboards', tour: 'builder' },
  { path: '/dashboard/datasets', icon: Database, label: 'Datasets', tour: 'datasets' },
  { path: '/dashboard/quality', icon: Shield, label: 'Data Quality' },
  { path: '/dashboard/insights', icon: Lightbulb, label: 'Insights' },
  { path: '/dashboard/visualizations', icon: BarChart3, label: 'Visualizations' },
  { path: '/dashboard/copilot', icon: Sparkles, label: 'AI Copilot', tour: 'copilot' },
  { path: '/dashboard/sql', icon: Terminal, label: 'SQL Engine' },
  { path: '/dashboard/reports', icon: FileText, label: 'Reports', tour: 'reports' },
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
        return <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 border-0 text-white text-[10px]"><Crown className="h-3 w-3 mr-1" /> Enterprise</Badge>;
      case 'pro':
        return <Badge className="gradient-primary border-0 text-white text-[10px]">Pro</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">Free</Badge>;
    }
  };

  return (
    <aside className={cn(
      "h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        {!collapsed && (
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-md shadow-primary/20">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <span className="font-extrabold text-foreground tracking-tight">DataVora</span>
          </button>
        )}
        {collapsed && (
          <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity mx-auto">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-md shadow-primary/20">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
          </button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onToggle}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <Separator className="opacity-50" />

      {/* Credits */}
      {!collapsed && (
        <div className="px-3 py-3">
          <div className="rounded-xl p-3 gradient-glow border border-primary/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Credits</span>
              {getPlanBadge()}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-foreground">
                {user?.plan === 'enterprise' ? '∞' : user?.credits ?? 0}
              </span>
              {user?.plan !== 'enterprise' && (
                <span className="text-[10px] text-muted-foreground">remaining</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <ul className="space-y-0.5 px-2">
          {navItems.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/dashboard'}
                {...('tour' in item && item.tour ? { 'data-tour': item.tour } : {})}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                  isActive 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full gradient-primary" />
                    )}
                    <item.icon className={cn("h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110", isActive && "text-primary")} />
                    {!collapsed && <span className="text-sm">{item.label}</span>}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Separator className="opacity-50" />

      {/* Bottom */}
      <div className="py-3 px-2">
        <ul className="space-y-0.5">
          {bottomItems.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                  isActive 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="text-sm">Logout</span>}
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
}
