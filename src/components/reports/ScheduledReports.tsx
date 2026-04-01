import { useState } from 'react';
import { Calendar, Clock, Mail, MessageSquare, Download, Plus, Trash2, Play, Pause } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

export interface ScheduledReport {
  id: string;
  name: string;
  format: 'pdf' | 'pptx' | 'docx' | 'csv';
  frequency: 'daily' | 'weekly' | 'monthly';
  cronExpression: string;
  delivery: ('email' | 'slack' | 'download')[];
  emailRecipients: string[];
  slackChannel: string;
  enabled: boolean;
  lastRun?: string;
  nextRun: string;
  createdAt: string;
}

const CRON_PRESETS: Record<string, { label: string; cron: string; description: string }> = {
  'daily-9am': { label: 'Daily at 9 AM', cron: '0 9 * * *', description: 'Every day at 9:00 AM' },
  'weekly-monday': { label: 'Weekly on Monday', cron: '0 9 * * 1', description: 'Every Monday at 9:00 AM' },
  'weekly-friday': { label: 'Weekly on Friday', cron: '0 17 * * 5', description: 'Every Friday at 5:00 PM' },
  'monthly-1st': { label: 'Monthly on 1st', cron: '0 9 1 * *', description: '1st of every month at 9:00 AM' },
  'monthly-15th': { label: 'Monthly on 15th', cron: '0 9 15 * *', description: '15th of every month at 9:00 AM' },
};

const STORAGE_KEY = 'datavora_scheduled_reports';

function loadSchedules(): ScheduledReport[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function persistSchedules(schedules: ScheduledReport[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
}

function getNextRunDate(cron: string): string {
  // Simple next-run estimation from cron
  const parts = cron.split(' ');
  const now = new Date();
  const minute = parts[0] === '*' ? now.getMinutes() : parseInt(parts[0]);
  const hour = parts[1] === '*' ? now.getHours() : parseInt(parts[1]);
  const next = new Date(now);
  next.setMinutes(minute);
  next.setHours(hour);
  next.setSeconds(0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.toISOString();
}

export default function ScheduledReports() {
  const [schedules, setSchedules] = useState<ScheduledReport[]>(loadSchedules);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [format, setFormat] = useState<ScheduledReport['format']>('pdf');
  const [frequency, setFrequency] = useState<ScheduledReport['frequency']>('weekly');
  const [cronPreset, setCronPreset] = useState('weekly-monday');
  const [customCron, setCustomCron] = useState('');
  const [useCustomCron, setUseCustomCron] = useState(false);
  const [delivery, setDelivery] = useState<ScheduledReport['delivery']>(['download']);
  const [emailRecipients, setEmailRecipients] = useState('');
  const [slackChannel, setSlackChannel] = useState('');

  const toggleDelivery = (method: 'email' | 'slack' | 'download') => {
    setDelivery(prev => prev.includes(method) ? prev.filter(d => d !== method) : [...prev, method]);
  };

  const handleCreate = () => {
    if (!name.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    if (delivery.length === 0) { toast({ title: 'Select at least one delivery method', variant: 'destructive' }); return; }

    const cron = useCustomCron ? customCron : CRON_PRESETS[cronPreset]?.cron || '0 9 * * 1';

    const schedule: ScheduledReport = {
      id: crypto.randomUUID(),
      name: name.trim(),
      format,
      frequency,
      cronExpression: cron,
      delivery,
      emailRecipients: emailRecipients.split(',').map(e => e.trim()).filter(Boolean),
      slackChannel: slackChannel.trim(),
      enabled: true,
      nextRun: getNextRunDate(cron),
      createdAt: new Date().toISOString(),
    };

    const updated = [...schedules, schedule];
    setSchedules(updated);
    persistSchedules(updated);
    setShowForm(false);
    setName('');
    setEmailRecipients('');
    setSlackChannel('');
    toast({ title: 'Schedule Created', description: `"${schedule.name}" will run ${CRON_PRESETS[cronPreset]?.description || cron}` });
  };

  const toggleEnabled = (id: string) => {
    const updated = schedules.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s);
    setSchedules(updated);
    persistSchedules(updated);
  };

  const deleteSchedule = (id: string) => {
    const updated = schedules.filter(s => s.id !== id);
    setSchedules(updated);
    persistSchedules(updated);
    toast({ title: 'Schedule Deleted' });
  };

  const formatLabel: Record<string, string> = { pdf: 'PDF', pptx: 'PowerPoint', docx: 'Word', csv: 'CSV' };
  const deliveryIcon: Record<string, React.ReactNode> = {
    email: <Mail className="h-3 w-3" />,
    slack: <MessageSquare className="h-3 w-3" />,
    download: <Download className="h-3 w-3" />,
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5" /> Scheduled Reports
          </CardTitle>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" /> New Schedule
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Schedule Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Weekly Sales Report" className="h-8 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Export Format</Label>
                <Select value={format} onValueChange={v => setFormat(v as any)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="pdf">PDF Report</SelectItem>
                    <SelectItem value="pptx">PowerPoint</SelectItem>
                    <SelectItem value="docx">Word Document</SelectItem>
                    <SelectItem value="csv">CSV Export</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Frequency</Label>
              <Select value={frequency} onValueChange={v => setFrequency(v as any)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Cron Expression</Label>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Custom</Label>
                  <Switch checked={useCustomCron} onCheckedChange={setUseCustomCron} />
                </div>
              </div>
              {useCustomCron ? (
                <div className="space-y-1">
                  <Input value={customCron} onChange={e => setCustomCron(e.target.value)} placeholder="0 9 * * 1" className="h-8 text-sm font-mono" />
                  <p className="text-[10px] text-muted-foreground">Format: minute hour day month weekday (e.g. 0 9 * * 1 = Monday 9 AM)</p>
                </div>
              ) : (
                <Select value={cronPreset} onValueChange={setCronPreset}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {Object.entries(CRON_PRESETS).map(([key, { label, description }]) => (
                      <SelectItem key={key} value={key}>
                        <span>{label}</span>
                        <span className="ml-2 text-muted-foreground text-xs">({description})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs">Delivery Methods</Label>
              <div className="flex gap-2">
                {(['email', 'slack', 'download'] as const).map(method => (
                  <Button key={method} size="sm" variant={delivery.includes(method) ? 'default' : 'outline'}
                    onClick={() => toggleDelivery(method)} className="text-xs capitalize">
                    {deliveryIcon[method]}
                    <span className="ml-1">{method}</span>
                  </Button>
                ))}
              </div>
            </div>

            {delivery.includes('email') && (
              <div className="space-y-2">
                <Label className="text-xs">Email Recipients (comma-separated)</Label>
                <Input value={emailRecipients} onChange={e => setEmailRecipients(e.target.value)} placeholder="team@company.com, manager@company.com" className="h-8 text-sm" />
              </div>
            )}

            {delivery.includes('slack') && (
              <div className="space-y-2">
                <Label className="text-xs">Slack Channel</Label>
                <Input value={slackChannel} onChange={e => setSlackChannel(e.target.value)} placeholder="#reports" className="h-8 text-sm" />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate}>Create Schedule</Button>
            </div>
          </div>
        )}

        {schedules.length === 0 && !showForm ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No scheduled reports</p>
            <p className="text-xs">Create a schedule to automate report generation</p>
          </div>
        ) : (
          <div className="space-y-2">
            {schedules.map(schedule => (
              <div key={schedule.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <Switch checked={schedule.enabled} onCheckedChange={() => toggleEnabled(schedule.id)} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{schedule.name}</span>
                      <Badge variant="outline" className="text-[10px]">{formatLabel[schedule.format]}</Badge>
                      <Badge variant={schedule.enabled ? 'default' : 'secondary'} className="text-[10px]">
                        {schedule.enabled ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <code className="text-[10px] text-muted-foreground font-mono bg-muted px-1 rounded">{schedule.cronExpression}</code>
                      <span className="text-[10px] text-muted-foreground capitalize">{schedule.frequency}</span>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <span className="flex items-center gap-1">
                        {schedule.delivery.map(d => (
                          <span key={d} className="text-[10px] text-muted-foreground flex items-center gap-0.5">{deliveryIcon[d]} {d}</span>
                        ))}
                      </span>
                    </div>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => deleteSchedule(schedule.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
