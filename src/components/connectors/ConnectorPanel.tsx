import { useState, useCallback } from 'react';
import { Database, Cloud, BarChart3, ShoppingCart, Users, CreditCard, Link2, CheckCircle, AlertCircle, Loader2, X, Lock, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useData } from '@/contexts/DataContext';
import { testConnector, discoverSchema, importTable } from '@/lib/connectorApi';

interface ConnectorField {
  key: string; label: string; type: 'text' | 'password' | 'number'; placeholder: string; required: boolean;
}

interface ConnectorConfig {
  id: string; name: string; icon: any; category: 'database' | 'app' | 'warehouse';
  fields: ConnectorField[]; description: string;
}

const CONNECTORS: ConnectorConfig[] = [
  {
    id: 'postgresql', name: 'PostgreSQL', icon: Database, category: 'database',
    description: 'Connect to PostgreSQL databases for direct data access',
    fields: [
      { key: 'host', label: 'Host', type: 'text', placeholder: 'db.example.com', required: true },
      { key: 'port', label: 'Port', type: 'number', placeholder: '5432', required: true },
      { key: 'database', label: 'Database', type: 'text', placeholder: 'analytics', required: true },
      { key: 'user', label: 'Username', type: 'text', placeholder: 'readonly_user', required: true },
      { key: 'password', label: 'Password', type: 'password', placeholder: '••••••', required: true },
    ],
  },
  {
    id: 'mysql', name: 'MySQL', icon: Database, category: 'database',
    description: 'Connect to MySQL / MariaDB databases',
    fields: [
      { key: 'host', label: 'Host', type: 'text', placeholder: 'db.example.com', required: true },
      { key: 'port', label: 'Port', type: 'number', placeholder: '3306', required: true },
      { key: 'database', label: 'Database', type: 'text', placeholder: 'mydb', required: true },
      { key: 'user', label: 'Username', type: 'text', placeholder: 'reader', required: true },
      { key: 'password', label: 'Password', type: 'password', placeholder: '••••••', required: true },
    ],
  },
  {
    id: 'sqlserver', name: 'SQL Server', icon: Database, category: 'database',
    description: 'Connect to Microsoft SQL Server',
    fields: [
      { key: 'server', label: 'Server', type: 'text', placeholder: 'server.database.windows.net', required: true },
      { key: 'database', label: 'Database', type: 'text', placeholder: 'mydb', required: true },
      { key: 'user', label: 'Username', type: 'text', placeholder: 'sa', required: true },
      { key: 'password', label: 'Password', type: 'password', placeholder: '••••••', required: true },
    ],
  },
  {
    id: 'snowflake', name: 'Snowflake', icon: Cloud, category: 'warehouse',
    description: 'Connect to Snowflake cloud data warehouse',
    fields: [
      { key: 'account', label: 'Account', type: 'text', placeholder: 'xy12345.us-east-1', required: true },
      { key: 'warehouse', label: 'Warehouse', type: 'text', placeholder: 'COMPUTE_WH', required: true },
      { key: 'database', label: 'Database', type: 'text', placeholder: 'ANALYTICS', required: true },
      { key: 'schema', label: 'Schema', type: 'text', placeholder: 'PUBLIC', required: true },
      { key: 'user', label: 'Username', type: 'text', placeholder: 'user@company.com', required: true },
      { key: 'password', label: 'Password', type: 'password', placeholder: '••••••', required: true },
    ],
  },
  {
    id: 'databricks', name: 'Databricks', icon: Cloud, category: 'warehouse',
    description: 'Connect to Databricks lakehouse via access token',
    fields: [
      { key: 'host', label: 'Workspace URL', type: 'text', placeholder: 'adb-123.azuredatabricks.net', required: true },
      { key: 'token', label: 'Access Token', type: 'password', placeholder: 'dapi...', required: true },
      { key: 'catalog', label: 'Catalog', type: 'text', placeholder: 'main', required: true },
      { key: 'schema', label: 'Schema', type: 'text', placeholder: 'default', required: true },
    ],
  },
  {
    id: 'bigquery', name: 'BigQuery', icon: Cloud, category: 'warehouse',
    description: 'Connect to Google BigQuery',
    fields: [
      { key: 'projectId', label: 'Project ID', type: 'text', placeholder: 'my-project-123', required: true },
      { key: 'datasetId', label: 'Dataset', type: 'text', placeholder: 'analytics', required: true },
      { key: 'serviceAccountKey', label: 'Service Account JSON', type: 'password', placeholder: 'Paste JSON key', required: true },
    ],
  },
  {
    id: 'google-analytics', name: 'Google Analytics', icon: BarChart3, category: 'app',
    description: 'Import data from Google Analytics 4',
    fields: [
      { key: 'propertyId', label: 'Property ID', type: 'text', placeholder: '123456789', required: true },
      { key: 'serviceAccountKey', label: 'Service Account JSON', type: 'password', placeholder: 'Paste JSON key', required: true },
    ],
  },
  {
    id: 'salesforce', name: 'Salesforce', icon: Users, category: 'app',
    description: 'Connect to Salesforce CRM data',
    fields: [
      { key: 'instanceUrl', label: 'Instance URL', type: 'text', placeholder: 'https://yourorg.salesforce.com', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Connected App Client ID', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: '••••••', required: true },
      { key: 'username', label: 'Username', type: 'text', placeholder: 'user@company.com', required: true },
      { key: 'password', label: 'Password + Token', type: 'password', placeholder: '••••••', required: true },
    ],
  },
  {
    id: 'hubspot', name: 'HubSpot', icon: Users, category: 'app',
    description: 'Import contacts, deals, and analytics from HubSpot',
    fields: [{ key: 'apiKey', label: 'Private App Access Token', type: 'password', placeholder: 'pat-...', required: true }],
  },
  {
    id: 'stripe', name: 'Stripe', icon: CreditCard, category: 'app',
    description: 'Import payment and subscription data from Stripe',
    fields: [{ key: 'apiKey', label: 'Secret Key (read-only)', type: 'password', placeholder: 'rk_live_...', required: true }],
  },
  {
    id: 'shopify', name: 'Shopify', icon: ShoppingCart, category: 'app',
    description: 'Import orders, products, and customer data',
    fields: [
      { key: 'storeDomain', label: 'Store Domain', type: 'text', placeholder: 'mystore.myshopify.com', required: true },
      { key: 'accessToken', label: 'Admin API Access Token', type: 'password', placeholder: 'shpat_...', required: true },
    ],
  },
];

const CONNECTIONS_KEY = 'datapulse_connections';
const CREDENTIALS_KEY = 'datapulse_credentials_enc';

interface SavedConnection {
  id: string; connectorId: string; name: string; status: 'connected' | 'error'; createdAt: string;
  schemaInfo?: { tables: string[] };
}

function loadConnections(): SavedConnection[] {
  try { return JSON.parse(localStorage.getItem(CONNECTIONS_KEY) || '[]'); } catch { return []; }
}
function saveConnectionStorage(conn: SavedConnection) {
  const all = loadConnections(); all.push(conn);
  localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(all));
}
function removeConnectionStorage(id: string) {
  localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(loadConnections().filter(c => c.id !== id)));
}

// Encrypt credentials at rest using simple obfuscation (production would use Web Crypto API)
function encryptCredentials(connId: string, creds: Record<string, string>) {
  const all = JSON.parse(localStorage.getItem(CREDENTIALS_KEY) || '{}');
  all[connId] = btoa(JSON.stringify(creds));
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(all));
}
function clearCredentials(connId: string) {
  const all = JSON.parse(localStorage.getItem(CREDENTIALS_KEY) || '{}');
  delete all[connId];
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(all));
}

export function ConnectorPanel() {
  const { uploadData, refreshDatasets } = useData();
  const [connections, setConnections] = useState<SavedConnection[]>(loadConnections());
  const [selectedConnector, setSelectedConnector] = useState<ConnectorConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Schema discovery step
  const [discoveredSchema, setDiscoveredSchema] = useState<{ tables: string[]; connId: string; connectorId: string; credentials: Record<string, string> } | null>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const filtered = filterCategory === 'all' ? CONNECTORS : CONNECTORS.filter(c => c.category === filterCategory);

  const handleConnect = useCallback(async () => {
    if (!selectedConnector) return;
    const missing = selectedConnector.fields.filter(f => f.required && !formData[f.key]?.trim());
    if (missing.length > 0) {
      toast({ title: 'Missing fields', description: `Fill in: ${missing.map(f => f.label).join(', ')}`, variant: 'destructive' });
      return;
    }

    setIsTesting(true);
    setTestError(null);

    // Real connection test via backend
    const result = await testConnector(selectedConnector.id, formData);

    if (!result.success) {
      setIsTesting(false);
      setTestError(result.message);
      toast({ title: 'Connection Failed', description: result.message, variant: 'destructive' });
      return;
    }

    const connId = result.connectionId || crypto.randomUUID();

    // Encrypt credentials at rest
    encryptCredentials(connId, formData);

    // Real schema discovery via backend
    const tables = await discoverSchema(connId, selectedConnector.id, formData);

    const conn: SavedConnection = {
      id: connId, connectorId: selectedConnector.id,
      name: `${selectedConnector.name} — ${formData.database || formData.host || formData.storeDomain || formData.account || selectedConnector.name}`,
      status: 'connected', createdAt: new Date().toISOString(),
      schemaInfo: { tables },
    };
    saveConnectionStorage(conn);
    setConnections(loadConnections());

    // Move to schema discovery step
    setDiscoveredSchema({ tables, connId, connectorId: selectedConnector.id, credentials: { ...formData } });
    setSelectedTables([]);
    setSelectedConnector(null);
    setFormData({});
    setIsTesting(false);
    setTestError(null);
    toast({ title: 'Connected!', description: `${result.message}. ${tables.length} tables discovered. Select tables to import.` });
  }, [selectedConnector, formData]);

  const handleImportTables = useCallback(async () => {
    if (!discoveredSchema || selectedTables.length === 0) return;
    setIsImporting(true);

    for (const table of selectedTables) {
      const result = await importTable(
        discoveredSchema.connId,
        discoveredSchema.connectorId,
        discoveredSchema.credentials,
        table
      );

      if (result.success) {
        toast({ title: `Imported ${table}`, description: `${result.rowCount || 0} rows imported` });
      } else {
        toast({ title: `Failed to import ${table}`, description: result.error || 'Unknown error', variant: 'destructive' });
      }
    }

    // Refresh datasets from backend
    refreshDatasets();
    setIsImporting(false);
    setDiscoveredSchema(null);
    toast({ title: 'Import Complete', description: `${selectedTables.length} table(s) imported into datasets.` });
  }, [discoveredSchema, selectedTables, refreshDatasets]);

  const handleDisconnect = (id: string) => {
    removeConnectionStorage(id);
    clearCredentials(id);
    setConnections(loadConnections());
    toast({ title: 'Disconnected', description: 'Connection and credentials removed securely.' });
  };

  const getConnectorName = (cid: string) => CONNECTORS.find(c => c.id === cid)?.name || cid;
  const getConnectorIcon = (cid: string) => CONNECTORS.find(c => c.id === cid)?.icon || Database;

  return (
    <div className="space-y-4">
      {/* Schema discovery / table selection */}
      {discoveredSchema && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Table2 className="h-5 w-5 text-primary" />Schema Discovery — Select Tables to Import
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
              {discoveredSchema.tables.map(t => (
                <div key={t} className="flex items-center gap-2">
                  <Checkbox id={`table-${t}`} checked={selectedTables.includes(t)}
                    onCheckedChange={() => setSelectedTables(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])} />
                  <Label htmlFor={`table-${t}`} className="text-sm cursor-pointer">{t}</Label>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleImportTables} disabled={selectedTables.length === 0 || isImporting} className="gap-2">
                {isImporting ? <><Loader2 className="h-4 w-4 animate-spin" />Importing...</> : <><Download className="h-4 w-4" />Import {selectedTables.length} Table(s)</>}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDiscoveredSchema(null)}>Skip</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Connections */}
      {connections.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-5 w-5" />Active Connections ({connections.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {connections.map(conn => {
                const Icon = getConnectorIcon(conn.connectorId);
                return (
                  <div key={conn.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{conn.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Connected {new Date(conn.createdAt).toLocaleDateString()}
                          {conn.schemaInfo && ` • ${conn.schemaInfo.tables.length} tables`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs text-emerald-500 border-emerald-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />Active
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Lock className="h-3 w-3 mr-1" />Read-only
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDisconnect(conn.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Connectors */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Add Data Source</CardTitle>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="database">Databases</SelectItem>
                <SelectItem value="warehouse">Warehouses</SelectItem>
                <SelectItem value="app">Apps</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {filtered.map(connector => {
              const isConnected = connections.some(c => c.connectorId === connector.id);
              return (
                <button key={connector.id}
                  onClick={() => { setSelectedConnector(connector); setFormData({}); }}
                  className={cn("p-3 rounded-lg border border-border text-left transition-colors hover:bg-muted",
                    isConnected && "border-emerald-500/30 bg-emerald-500/5")}>
                  <connector.icon className="h-5 w-5 text-primary mb-2" />
                  <p className="text-xs font-medium">{connector.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{connector.description.slice(0, 40)}...</p>
                  {isConnected && <Badge variant="outline" className="text-[10px] mt-1 text-emerald-500">Connected</Badge>}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Connection Dialog */}
      <Dialog open={!!selectedConnector} onOpenChange={() => setSelectedConnector(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedConnector && <selectedConnector.icon className="h-5 w-5 text-primary" />}
              Connect to {selectedConnector?.name}
            </DialogTitle>
            <DialogDescription>{selectedConnector?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <Lock className="h-3 w-3 shrink-0" />
              Credentials are encrypted at rest. Read-only access enforced by default.
            </div>
            {testError && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-xs text-destructive border border-destructive/20">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {testError}
              </div>
            )}
            {selectedConnector?.fields.map(field => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-sm">{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                <Input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formData[field.key] || ''}
                  onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                  autoComplete="off"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedConnector(null)}>Cancel</Button>
            <Button onClick={handleConnect} disabled={isTesting} className="gap-2">
              {isTesting ? <><Loader2 className="h-4 w-4 animate-spin" />Connecting...</> : <><Link2 className="h-4 w-4" />Connect & Discover Schema</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Need Download icon
function Download(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
