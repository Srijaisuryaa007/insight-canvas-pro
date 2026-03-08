import { useState, useMemo } from 'react';
import { History, RotateCcw, Eye, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';

export interface VersionEntry {
  id: string;
  dashboardId: string;
  version: number;
  description: string;
  userId: string;
  userName: string;
  changes: string[];
  snapshotJson: string;
  createdAt: string;
}

const STORAGE_KEY = 'datapulse_versions';

function loadVersions(): VersionEntry[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function persistVersions(versions: VersionEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(versions));
}

interface VersionHistoryProps {
  dashboardId: string;
  onRestore?: (snapshotJson: string) => void;
}

export default function VersionHistory({ dashboardId, onRestore }: VersionHistoryProps) {
  const [allVersions, setAllVersions] = useState<VersionEntry[]>(loadVersions);

  const versions = useMemo(() =>
    allVersions.filter(v => v.dashboardId === dashboardId).sort((a, b) => b.version - a.version),
    [allVersions, dashboardId]
  );

  const handleRestore = (version: VersionEntry) => {
    if (onRestore) {
      onRestore(version.snapshotJson);
      toast({ title: 'Version Restored', description: `Restored to v${version.version}` });
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-5 w-5" /> Version History
          {versions.length > 0 && <Badge variant="secondary" className="text-[10px]">{versions.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-2">
            {versions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No version history</p>
                <p className="text-xs">Versions are saved when dashboards are modified</p>
              </div>
            ) : (
              versions.map((version, idx) => (
                <div key={version.id} className="p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <Avatar className="h-6 w-6 mt-0.5">
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                          {version.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={idx === 0 ? 'default' : 'outline'} className="text-[10px]">
                            v{version.version}
                          </Badge>
                          <span className="text-xs font-medium">{version.userName}</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" /> {formatTime(version.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{version.description}</p>
                        {version.changes.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {version.changes.map((change, i) => (
                              <li key={i} className="text-[10px] text-muted-foreground">• {change}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    {idx > 0 && onRestore && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRestore(version)}>
                        <RotateCcw className="h-3 w-3 mr-1" /> Restore
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Utility to save a version programmatically
export function saveVersion(
  dashboardId: string,
  dashboardJson: string,
  userName: string,
  userId: string,
  description: string,
  changes: string[]
) {
  const versions = loadVersions();
  const dashVersions = versions.filter(v => v.dashboardId === dashboardId);
  const nextVersion = dashVersions.length > 0 ? Math.max(...dashVersions.map(v => v.version)) + 1 : 1;

  const entry: VersionEntry = {
    id: crypto.randomUUID(),
    dashboardId,
    version: nextVersion,
    description,
    userId,
    userName,
    changes,
    snapshotJson: dashboardJson,
    createdAt: new Date().toISOString(),
  };

  const updated = [...versions, entry].slice(-100); // keep last 100 versions
  persistVersions(updated);
  return entry;
}
