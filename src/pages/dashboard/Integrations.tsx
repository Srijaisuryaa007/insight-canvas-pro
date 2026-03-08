import { useState, useMemo } from 'react';
import { Search, Plug, Lock, Check, ExternalLink, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = ['All', 'Files', 'Databases', 'Cloud', 'Apps', 'APIs'];

interface Integration {
  id: string;
  name: string;
  icon: string;
  category: string;
  status: 'connected' | 'available' | 'pro';
  description: string;
}

const INTEGRATIONS: Integration[] = [
  // Files (Free)
  { id: 'csv', name: 'CSV Upload', icon: '📁', category: 'Files', status: 'connected', description: 'Import CSV files from your computer' },
  { id: 'excel', name: 'Excel (.xlsx)', icon: '📊', category: 'Files', status: 'connected', description: 'Import Excel spreadsheets' },
  { id: 'json', name: 'JSON Upload', icon: '📄', category: 'Files', status: 'connected', description: 'Import structured JSON data' },
  { id: 'gsheets', name: 'Google Sheets', icon: '📋', category: 'Files', status: 'available', description: 'Connect to Google Sheets via OAuth' },
  { id: 'onedrive', name: 'OneDrive', icon: '📁', category: 'Files', status: 'available', description: 'Import from Microsoft OneDrive' },
  { id: 'dropbox', name: 'Dropbox', icon: '📁', category: 'Files', status: 'available', description: 'Import from Dropbox storage' },
  // Databases (Pro)
  { id: 'postgres', name: 'PostgreSQL', icon: '🐘', category: 'Databases', status: 'pro', description: 'Connect to PostgreSQL databases' },
  { id: 'mysql', name: 'MySQL', icon: '🐬', category: 'Databases', status: 'pro', description: 'Connect to MySQL databases' },
  { id: 'snowflake', name: 'Snowflake', icon: '❄️', category: 'Databases', status: 'pro', description: 'Cloud data warehouse' },
  { id: 'bigquery', name: 'BigQuery', icon: '🧱', category: 'Databases', status: 'pro', description: 'Google BigQuery analytics' },
  { id: 'mongodb', name: 'MongoDB', icon: '📦', category: 'Databases', status: 'pro', description: 'NoSQL document database' },
  { id: 'mssql', name: 'Microsoft SQL', icon: '🗄️', category: 'Databases', status: 'pro', description: 'SQL Server database' },
  // Cloud (Pro)
  { id: 's3', name: 'AWS S3', icon: '☁️', category: 'Cloud', status: 'pro', description: 'Amazon S3 storage buckets' },
  { id: 'azure', name: 'Azure Blob', icon: '🔷', category: 'Cloud', status: 'pro', description: 'Microsoft Azure storage' },
  { id: 'gcs', name: 'Google Cloud', icon: '🌐', category: 'Cloud', status: 'pro', description: 'Google Cloud Storage' },
  // Apps (Pro)
  { id: 'salesforce', name: 'Salesforce', icon: '📊', category: 'Apps', status: 'pro', description: 'CRM and sales data' },
  { id: 'hubspot', name: 'HubSpot', icon: '📣', category: 'Apps', status: 'pro', description: 'Marketing and CRM data' },
  { id: 'slack', name: 'Slack', icon: '💬', category: 'Apps', status: 'pro', description: 'Alerts and notifications' },
  { id: 'ga', name: 'Google Analytics', icon: '📅', category: 'Apps', status: 'pro', description: 'Website analytics data' },
  { id: 'shopify', name: 'Shopify', icon: '🛒', category: 'Apps', status: 'pro', description: 'E-commerce store data' },
  { id: 'stripe', name: 'Stripe', icon: '💳', category: 'Apps', status: 'pro', description: 'Payment and revenue data' },
  // APIs
  { id: 'rest', name: 'REST API', icon: '🔗', category: 'APIs', status: 'pro', description: 'Connect to any REST endpoint' },
  { id: 'graphql', name: 'GraphQL', icon: '◼️', category: 'APIs', status: 'pro', description: 'Query GraphQL endpoints' },
  { id: 'webhook', name: 'Webhooks', icon: '🪝', category: 'APIs', status: 'pro', description: 'Receive data via webhooks' },
];

export default function Integrations() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const { plan } = useSubscription();
  const isPro = plan === 'pro' || plan === 'enterprise';

  const filtered = useMemo(() => {
    return INTEGRATIONS.filter(i => {
      const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === 'All' || i.category === category;
      return matchSearch && matchCat;
    });
  }, [search, category]);

  const handleConnect = (integration: Integration) => {
    if (integration.status === 'pro' && !isPro) {
      toast({ title: 'Pro Feature', description: `${integration.name} requires a Pro plan. Upgrade to connect.`, variant: 'destructive' });
      return;
    }
    toast({ title: `Connecting to ${integration.name}...`, description: 'OAuth flow would open here.' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Plug className="h-7 w-7" />Connect Your Data Sources</h1>
        <p className="text-muted-foreground">Import data directly from your tools</p>
      </div>

      {/* Search + Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search integrations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                category === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/50 text-muted-foreground border-border hover:border-muted-foreground/40'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Connected count */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{INTEGRATIONS.filter(i => i.status === 'connected').length} connected</span>
        <span>{filtered.length} shown</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((integration, i) => (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, delay: i * 0.03 }}
            >
              <Card className="bg-card border-border hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{integration.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">{integration.name}</h3>
                        {integration.status === 'connected' && (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
                            <Check className="h-2.5 w-2.5 mr-0.5" />Connected
                          </Badge>
                        )}
                        {integration.status === 'pro' && !isPro && (
                          <Badge variant="outline" className="text-[10px]">
                            <Lock className="h-2.5 w-2.5 mr-0.5" />Pro
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{integration.description}</p>
                      <Badge variant="secondary" className="text-[10px] mt-2">{integration.category}</Badge>
                    </div>
                  </div>
                  <div className="mt-3">
                    {integration.status === 'connected' ? (
                      <Button variant="outline" size="sm" className="w-full text-xs" disabled>
                        <Check className="h-3 w-3 mr-1" />Connected
                      </Button>
                    ) : (
                      <Button
                        variant={integration.status === 'pro' && !isPro ? 'outline' : 'default'}
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => handleConnect(integration)}
                      >
                        {integration.status === 'pro' && !isPro ? (
                          <><Lock className="h-3 w-3 mr-1" />Upgrade to Connect</>
                        ) : (
                          <><ExternalLink className="h-3 w-3 mr-1" />Connect</>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <span className="text-4xl block mb-3">🔍</span>
          <h3 className="font-medium">No integrations found</h3>
          <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
        </div>
      )}
    </div>
  );
}
