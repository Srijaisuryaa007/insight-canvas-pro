import { useState } from 'react';
import { User, Building2, CreditCard, BarChart3, Clock, Zap, FolderOpen, RotateCcw, Bell, CheckCheck, Trash2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useNotifications, AppNotification } from '@/contexts/NotificationContext';
import { useData } from '@/contexts/DataContext';
import { cn } from '@/lib/utils';

const PROJECTS_KEY = 'datavora_projects';
function loadProjects(): Array<{ id: string; name: string; status: 'active' | 'archived'; createdAt: string; datasetCount: number }> {
  try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]'); } catch { return []; }
}

const TYPE_ICON: Record<string, string> = {
  info: '📘', success: '✅', warning: '⚠️', error: '🔴',
};

export default function Profile() {
  const { user } = useAuth();
  const { plan, credits, isEnterprise, planConfig } = useSubscription();
  const { notifications, unreadCount, markAsRead, markAllRead, clearAll, filterByCategory } = useNotifications();
  const { datasets } = useData();
  const [notifFilter, setNotifFilter] = useState('all');
  const [projects] = useState(loadProjects());

  const filteredNotifs = filterByCategory(notifFilter);

  const aiUsage = JSON.parse(localStorage.getItem('datavora_ai_usage') || '{"total":0,"byModel":{}}');

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><User className="h-7 w-7" />Profile</h1>
        <p className="text-muted-foreground">Your account, usage, and notifications</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Info */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><User className="h-5 w-5" />Account</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="font-semibold text-lg">{user?.name || 'User'}</p>
                <p className="text-sm text-muted-foreground">{user?.email || '-'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Role</span><span className="text-sm font-medium">Admin</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Organization</span><span className="text-sm font-medium">My Organization</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Plan</span><Badge className="capitalize">{plan}</Badge></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Credits</span><span className="text-sm font-medium">{isEnterprise ? '∞' : credits}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Datasets</span><span className="text-sm font-medium">{datasets.length}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Renewal</span><span className="text-sm font-medium">Mar 1, 2026</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Usage + AI Stats */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-5 w-5" />Usage</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">AI Queries (total)</span>
                <span className="font-medium">{aiUsage.total || 0}</span>
              </div>
              {Object.entries(aiUsage.byModel || {}).map(([model, count]) => (
                <div key={model} className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground capitalize">{model}</span>
                  <Badge variant="outline" className="text-xs">{String(count)} calls</Badge>
                </div>
              ))}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Available Models</span>
                <div className="flex gap-1 flex-wrap justify-end">
                  {planConfig.aiModels.map(m => <Badge key={m} variant="secondary" className="text-xs capitalize">{m}</Badge>)}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Chart Types</span>
                <span className="font-medium">{planConfig.chartTypes}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Max Rows</span>
                <span className="font-medium">{planConfig.maxRows === -1 ? 'Unlimited' : planConfig.maxRows.toLocaleString()}</span>
              </div>
            </div>
            {!isEnterprise && (
              <Button className="w-full" variant="outline" size="sm" onClick={() => window.location.hash = '/dashboard/settings'}>
                <Zap className="h-4 w-4 mr-1" />Upgrade Plan
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Projects */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FolderOpen className="h-5 w-5" />Projects</CardTitle></CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>No projects yet.</p>
                <p className="text-xs mt-1">Projects are created automatically when you save dashboards.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.datasetCount} datasets • {p.status}</p>
                    </div>
                    {p.status === 'archived' && (
                      <Button variant="ghost" size="sm" className="text-xs"><RotateCcw className="h-3 w-3 mr-1" />Restore</Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notifications */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && <Badge variant="destructive" className="text-xs">{unreadCount}</Badge>}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={notifFilter} onValueChange={setNotifFilter}>
                <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="dataset">Dataset</SelectItem>
                  <SelectItem value="quality">Quality</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="plan">Plan</SelectItem>
                  <SelectItem value="connector">Connector</SelectItem>
                  <SelectItem value="insight">Insight</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs"><CheckCheck className="h-3 w-3 mr-1" />Mark all read</Button>
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-destructive"><Trash2 className="h-3 w-3 mr-1" />Clear</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredNotifs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No notifications.</p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {filteredNotifs.map(n => (
                  <div key={n.id}
                    className={cn("flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                      n.read ? "border-border bg-muted/20" : "border-primary/20 bg-primary/5"
                    )}
                    onClick={() => markAsRead(n.id)}
                  >
                    <span className="text-lg">{TYPE_ICON[n.type] || '📘'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] capitalize">{n.category}</Badge>
                        <span className="text-[10px] text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
