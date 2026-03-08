import { useState } from 'react';
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/hooks/use-toast';

const ALERT_STORAGE = 'datavora_data_alerts';

interface DataAlert {
  id: string;
  name: string;
  dataset: string;
  column: string;
  condition: 'above' | 'below' | 'changes_by';
  value: number;
  notifyApp: boolean;
  notifyEmail: boolean;
  enabled: boolean;
}

function loadAlerts(): DataAlert[] {
  try { return JSON.parse(localStorage.getItem(ALERT_STORAGE) || '[]'); } catch { return []; }
}

function saveAlerts(alerts: DataAlert[]) {
  localStorage.setItem(ALERT_STORAGE, JSON.stringify(alerts));
}

export function DataAlerts() {
  const { datasets, currentData } = useData();
  const [alerts, setAlerts] = useState<DataAlert[]>(loadAlerts);
  const [open, setOpen] = useState(false);

  // New alert form
  const [name, setName] = useState('');
  const [dataset, setDataset] = useState('');
  const [column, setColumn] = useState('');
  const [condition, setCondition] = useState<'above' | 'below' | 'changes_by'>('above');
  const [value, setValue] = useState('');
  const [notifyApp, setNotifyApp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);

  const columns = currentData.length > 0 ? Object.keys(currentData[0]).filter(k => typeof currentData[0][k] === 'number' || !isNaN(Number(currentData[0][k]))) : [];

  const handleCreate = () => {
    if (!name || !column || !value) {
      toast({ title: 'Fill all fields', variant: 'destructive' });
      return;
    }
    const alert: DataAlert = {
      id: crypto.randomUUID(),
      name, dataset, column, condition,
      value: parseFloat(value),
      notifyApp, notifyEmail, enabled: true,
    };
    const updated = [...alerts, alert];
    setAlerts(updated);
    saveAlerts(updated);
    setOpen(false);
    setName(''); setColumn(''); setValue('');
    toast({ title: 'Alert Created', description: `"${name}" will trigger when ${column} ${condition.replace('_', ' ')} ${value}` });
  };

  const toggleAlert = (id: string) => {
    const updated = alerts.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a);
    setAlerts(updated);
    saveAlerts(updated);
  };

  const deleteAlert = (id: string) => {
    const updated = alerts.filter(a => a.id !== id);
    setAlerts(updated);
    saveAlerts(updated);
    toast({ title: 'Alert Deleted' });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Bell className="h-5 w-5" />Data Alerts</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Create Alert</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Data Alert</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Alert Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Revenue drops below 10K" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Column</Label>
                <Select value={column} onValueChange={setColumn}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select column" /></SelectTrigger>
                  <SelectContent>
                    {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Condition</Label>
                  <Select value={condition} onValueChange={v => setCondition(v as any)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above">Is above</SelectItem>
                      <SelectItem value="below">Is below</SelectItem>
                      <SelectItem value="changes_by">Changes by</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Value</Label>
                  <Input type="number" value={value} onChange={e => setValue(e.target.value)} className="h-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Notify via</Label>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={notifyApp} onCheckedChange={v => setNotifyApp(!!v)} />
                    <span className="text-sm">In-app</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={notifyEmail} onCheckedChange={v => setNotifyEmail(!!v)} />
                    <span className="text-sm">Email</span>
                  </div>
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full">Create Alert</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No alerts configured</p>
            <p className="text-xs">Create an alert to monitor your data</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleAlert(a.id)}>
                    {a.enabled ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                  </button>
                  <div>
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.column} {a.condition.replace('_', ' ')} {a.value}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={a.enabled ? 'default' : 'secondary'} className="text-[10px]">
                    {a.enabled ? 'Active' : 'Paused'}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteAlert(a.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
