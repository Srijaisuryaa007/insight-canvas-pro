import { useState } from 'react';
import { X, Search, Loader2, Globe, FileText, Database as DbIcon, Cloud, Upload, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useData } from '@/contexts/DataContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Category = 'all' | 'files' | 'web' | 'database' | 'cloud';
type ExtractType = 'tables' | 'lists' | 'css';

interface DataSource {
  id: string;
  name: string;
  desc: string;
  icon: string;
  iconBg: string;
  badge: string;
  badgeVariant: 'free' | 'pro';
  category: Category;
  ready?: boolean;
}

const DATA_SOURCES: DataSource[] = [
  { id: 'csv', name: 'CSV File', desc: 'Upload .csv files', icon: '📄', iconBg: 'bg-blue-500/20', badge: 'Free', badgeVariant: 'free', category: 'files', ready: true },
  { id: 'excel', name: 'Excel File', desc: 'Upload .xlsx or .xls', icon: '📊', iconBg: 'bg-emerald-500/20', badge: 'Free', badgeVariant: 'free', category: 'files', ready: true },
  { id: 'json', name: 'JSON File', desc: 'Upload .json files', icon: '{ }', iconBg: 'bg-amber-500/20', badge: 'Free', badgeVariant: 'free', category: 'files', ready: true },
  { id: 'scraper', name: 'Web Scraper', desc: 'Extract data from any website URL', icon: '🕷️', iconBg: 'bg-purple-500/20', badge: 'Free', badgeVariant: 'free', category: 'web' },
  { id: 'gsheets', name: 'Google Sheets', desc: 'Connect any Google Sheet', icon: '📋', iconBg: 'bg-emerald-500/20', badge: 'Free', badgeVariant: 'free', category: 'web' },
  { id: 'paste', name: 'Paste Data', desc: 'Copy-paste data directly', icon: '📋', iconBg: 'bg-teal-500/20', badge: 'Free', badgeVariant: 'free', category: 'web' },
  { id: 'postgres', name: 'PostgreSQL', desc: 'Connect PostgreSQL database', icon: '🐘', iconBg: 'bg-blue-500/20', badge: 'Pro', badgeVariant: 'pro', category: 'database' },
  { id: 'mysql', name: 'MySQL', desc: 'Connect MySQL database', icon: '🐬', iconBg: 'bg-orange-500/20', badge: 'Pro', badgeVariant: 'pro', category: 'database' },
  { id: 'mongodb', name: 'MongoDB', desc: 'Connect MongoDB database', icon: '🍃', iconBg: 'bg-emerald-500/20', badge: 'Pro', badgeVariant: 'pro', category: 'database' },
  { id: 'gdrive', name: 'Google Drive', desc: 'Import from Google Drive', icon: '▲', iconBg: 'bg-yellow-500/20', badge: 'Pro', badgeVariant: 'pro', category: 'cloud' },
  { id: 'dropbox', name: 'Dropbox', desc: 'Import from Dropbox', icon: '📦', iconBg: 'bg-blue-500/20', badge: 'Pro', badgeVariant: 'pro', category: 'cloud' },
  { id: 'onedrive', name: 'OneDrive', desc: 'Import from OneDrive', icon: '☁️', iconBg: 'bg-blue-500/20', badge: 'Pro', badgeVariant: 'pro', category: 'cloud' },
];

const CATEGORIES: { id: Category; label: string; icon: any }[] = [
  { id: 'all', label: 'All', icon: null },
  { id: 'files', label: 'Files', icon: FileText },
  { id: 'web', label: 'Web', icon: Globe },
  { id: 'database', label: 'Database', icon: DbIcon },
  { id: 'cloud', label: 'Cloud', icon: Cloud },
];

const SECTION_LABELS: Record<string, { label: string; icon: string }> = {
  files: { label: 'FILE UPLOAD', icon: '📁' },
  web: { label: 'WEB DATA', icon: '🌐' },
  database: { label: 'DATABASE', icon: '🗄️' },
  cloud: { label: 'CLOUD STORAGE', icon: '☁️' },
};

export function ConnectDataModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const navigate = useNavigate();
  const { plan } = useSubscription();
  const { refreshDatasets } = useData();

  const isPro = plan === 'pro' || plan === 'enterprise';

  const filtered = DATA_SOURCES.filter(s => {
    if (activeCategory !== 'all' && s.category !== activeCategory) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.desc.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = ['files', 'web', 'database', 'cloud'].map(cat => ({
    category: cat,
    sources: filtered.filter(s => s.category === cat),
  })).filter(g => g.sources.length > 0);

  const handleCardClick = (source: DataSource) => {
    if (source.badgeVariant === 'pro' && !isPro) {
      navigate('/dashboard/settings');
      onOpenChange(false);
      toast({ title: '🔒 Pro Feature', description: `${source.name} requires a Pro subscription. Upgrade in Settings.` });
      return;
    }
    if (['csv', 'excel', 'json'].includes(source.id)) {
      onOpenChange(false);
      // Trigger file upload - dispatch custom event
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('datavora-upload-file', { detail: { type: source.id } }));
      }, 100);
      return;
    }
    setExpandedCard(expandedCard === source.id ? null : source.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[680px] p-0 gap-0 border-border bg-card rounded-3xl overflow-hidden [&>button]:hidden">
        {/* Header */}
        <div className="px-7 pt-6 pb-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Connect Your Data</h2>
              <p className="text-sm text-muted-foreground mt-1">Choose how you want to bring data into DataVora</p>
            </div>
            <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-7 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="🔍 Search data sources..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 bg-muted/50 border-border"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-7 pt-4 flex gap-2 overflow-x-auto">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Cards Grid */}
        <ScrollArea className="max-h-[420px]">
          <div className="px-7 py-4 space-y-5">
            {grouped.map(group => {
              const sectionInfo = SECTION_LABELS[group.category];
              const isLocked = (group.category === 'database' || group.category === 'cloud') && !isPro;
              return (
                <div key={group.category}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs">{sectionInfo.icon}</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{sectionInfo.label}</span>
                    {isLocked && <Badge variant="outline" className="text-[9px] h-4 px-1.5">🔒 Pro</Badge>}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {group.sources.map(source => (
                      <SourceCard
                        key={source.id}
                        source={source}
                        isLocked={source.badgeVariant === 'pro' && !isPro}
                        isExpanded={expandedCard === source.id}
                        onClick={() => handleCardClick(source)}
                        onClose={() => setExpandedCard(null)}
                        onImportComplete={() => { onOpenChange(false); refreshDatasets(); }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-7 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">Free sources: CSV, Excel, JSON, Web Scraper, Google Sheets</p>
          <button onClick={() => { navigate('/dashboard/settings'); onOpenChange(false); }} className="text-[11px] text-primary hover:underline">
            🔒 Unlock databases & cloud with Pro →
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Individual Source Card ─────────────────────────────────────────

function SourceCard({
  source, isLocked, isExpanded, onClick, onClose, onImportComplete,
}: {
  source: DataSource;
  isLocked: boolean;
  isExpanded: boolean;
  onClick: () => void;
  onClose: () => void;
  onImportComplete: () => void;
}) {
  return (
    <div className={cn(
      isExpanded && "col-span-3"
    )}>
      <motion.div
        layout
        onClick={!isExpanded ? onClick : undefined}
        className={cn(
          "rounded-xl border p-4 cursor-pointer transition-all",
          "bg-muted/30 border-border",
          isLocked && "opacity-60",
          !isLocked && !isExpanded && "hover:border-primary hover:bg-muted/50 hover:-translate-y-0.5",
          isLocked && "hover:border-purple-500/50",
          isExpanded && "border-primary bg-card cursor-default",
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0", source.iconBg)}>
            {source.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{source.name}</span>
              <Badge variant={source.badgeVariant === 'free' ? 'secondary' : 'outline'} className={cn(
                "text-[9px] h-4 px-1.5",
                source.badgeVariant === 'free' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
                source.badgeVariant === 'pro' && "text-purple-400 border-purple-500/30",
              )}>
                {source.badge}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{source.desc}</p>
            {source.ready && !isExpanded && (
              <p className="text-[10px] text-emerald-500 mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Ready
              </p>
            )}
            {isLocked && (
              <p className="text-[10px] text-purple-400 mt-1">🔒 Pro Feature</p>
            )}
          </div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 overflow-hidden"
            >
              {source.id === 'scraper' && <WebScraperExpanded onClose={onClose} onImportComplete={onImportComplete} />}
              {source.id === 'gsheets' && <GoogleSheetsExpanded onClose={onClose} />}
              {source.id === 'paste' && <PasteDataExpanded onClose={onClose} onImportComplete={onImportComplete} />}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ─── Web Scraper Expanded ───────────────────────────────────────────

function WebScraperExpanded({ onClose, onImportComplete }: { onClose: () => void; onImportComplete: () => void }) {
  const [url, setUrl] = useState('');
  const [extractType, setExtractType] = useState<ExtractType>('tables');
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState('');
  const { uploadData } = useData();

  const handlePreview = async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    setError('');
    setPreview(null);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Scrape failed');
      } else {
        setPreview(data);
      }
    } catch {
      setError('Could not connect to backend. Make sure it\'s running on port 3001.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview) return;
    const tables = preview.tables;
    if (tables && tables.length > 0 && tables[0].length > 0) {
      const tableData = tables[0];
      const headers = tableData[0] || [];
      const rows = tableData.slice(1).map((row: string[]) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((h: string, i: number) => { obj[h || `col_${i}`] = row[i] || ''; });
        return obj;
      });
      if (rows.length > 0) {
        const hostname = new URL(url).hostname;
        await uploadData(`Web Scrape - ${hostname}`, `scrape_${Date.now()}.csv`, rows);
        toast({ title: '✓ Web data imported', description: `${rows.length} rows imported from ${hostname}` });
        onImportComplete();
        return;
      }
    }
    toast({ title: 'No table data', description: 'No structured table data found on this page.', variant: 'destructive' });
  };

  return (
    <div className="space-y-3 border-t border-border pt-4" onClick={e => e.stopPropagation()}>
      <div className="flex gap-2">
        <Input
          placeholder="https://example.com/data"
          value={url}
          onChange={e => setUrl(e.target.value)}
          className="flex-1 bg-muted/50"
          onKeyDown={e => e.key === 'Enter' && handlePreview()}
        />
        <Button size="sm" variant="outline" onClick={handlePreview} disabled={isLoading || !url.trim()}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '🔍'}
        </Button>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground font-medium">What to extract:</p>
        {(['tables', 'lists', 'css'] as ExtractType[]).map(type => (
          <label key={type} className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="radio" name="extractType" checked={extractType === type} onChange={() => setExtractType(type)} className="accent-primary" />
            <span className="text-foreground">{type === 'tables' ? 'Tables (auto-detect)' : type === 'lists' ? 'Lists and items' : 'Custom CSS selector'}</span>
          </label>
        ))}
      </div>

      {error && <p className="text-xs text-destructive bg-destructive/10 rounded-lg p-2">{error}</p>}

      {preview && (
        <div className="bg-muted/30 rounded-lg p-3 border border-border space-y-2">
          <p className="text-xs font-medium text-foreground">{preview.title || 'Page scraped'}</p>
          <p className="text-[10px] text-muted-foreground">
            Found {preview.tables?.length || 0} tables • {preview.links?.length || 0} links • {preview.textLength?.toLocaleString()} chars
          </p>
          {preview.tables?.[0] && (
            <div className="overflow-x-auto max-h-[120px]">
              <table className="w-full text-[10px] border border-border">
                <tbody>
                  {preview.tables[0].slice(0, 5).map((row: string[], ri: number) => (
                    <tr key={ri} className={ri === 0 ? 'bg-muted font-medium' : ''}>
                      {row.map((cell: string, ci: number) => (
                        <td key={ci} className="border border-border px-1.5 py-0.5 truncate max-w-[120px]">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={handlePreview} disabled={isLoading || !url.trim()}>
          {isLoading ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Scraping...</> : 'Preview Data'}
        </Button>
        <Button size="sm" onClick={handleImport} disabled={!preview}>
          Import to DataVora
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground">⚠️ Works best on public pages with structured data (tables/lists)</p>
    </div>
  );
}

// ─── Google Sheets Expanded ─────────────────────────────────────────

function GoogleSheetsExpanded({ onClose }: { onClose: () => void }) {
  const [sheetUrl, setSheetUrl] = useState('');
  return (
    <div className="space-y-3 border-t border-border pt-4" onClick={e => e.stopPropagation()}>
      <Input
        placeholder="Paste Google Sheets URL..."
        value={sheetUrl}
        onChange={e => setSheetUrl(e.target.value)}
        className="bg-muted/50"
      />
      <p className="text-[10px] text-muted-foreground">Make sure sheet is set to "Anyone with link can view"</p>
      <Button size="sm" disabled={!sheetUrl.trim()} onClick={() => toast({ title: 'Coming Soon', description: 'Google Sheets integration will be available soon.' })}>
        Connect Sheet
      </Button>
    </div>
  );
}

// ─── Paste Data Expanded ────────────────────────────────────────────

function PasteDataExpanded({ onClose, onImportComplete }: { onClose: () => void; onImportComplete: () => void }) {
  const [pastedData, setPastedData] = useState('');
  const { uploadData } = useData();

  const handleImport = async () => {
    if (!pastedData.trim()) return;
    const lines = pastedData.trim().split('\n');
    if (lines.length < 2) {
      toast({ title: 'Not enough data', description: 'Paste at least a header row and one data row.', variant: 'destructive' });
      return;
    }
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const values = line.split(delimiter);
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => { obj[h || `col_${i}`] = (values[i] || '').trim(); });
      return obj;
    });

    await uploadData(`Pasted Data ${new Date().toLocaleDateString()}`, `pasted_${Date.now()}.csv`, rows);
    toast({ title: '✓ Data imported', description: `${rows.length} rows imported from pasted data` });
    onImportComplete();
  };

  return (
    <div className="space-y-3 border-t border-border pt-4" onClick={e => e.stopPropagation()}>
      <Textarea
        placeholder="Paste your CSV or table data here..."
        value={pastedData}
        onChange={e => setPastedData(e.target.value)}
        className="bg-muted/50 min-h-[100px] text-xs font-mono"
      />
      <p className="text-[10px] text-muted-foreground">Supports comma-separated or tab-separated data. First row treated as headers.</p>
      <Button size="sm" onClick={handleImport} disabled={!pastedData.trim()}>
        Import Pasted Data
      </Button>
    </div>
  );
}
