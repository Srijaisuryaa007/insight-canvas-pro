import { useState } from 'react';
import { Database, Cloud, BarChart3, ShoppingCart, Users, CreditCard, Link2, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ConnectorConfig {
  id: string;
  name: string;
  icon: any;
  category: 'database' | 'app' | 'warehouse';
  fields: Array<{ key: string; label: string; type: 'text' | 'password' | 'number'; placeholder: string; required: boolean }>;
  description: string;
}

const CONNECTORS: ConnectorConfig[] = [
  {
    id: 'postgresql', name: 'PostgreSQL', icon: Database, category: 'database',
    description: 'Connect to PostgreSQL databases for direct data access',
    fields: [
      { key: 'host', label: 'Host', type: 'text', placeholder: 'localhost', required: true },
      { key: 'port', label: 'Port', type: 'number', placeholder: '5432', required: true },
      { key: 'database', label: 'Database', type: 'text', placeholder: 'mydb', required: true },
      { key: 'user', label: 'Username', type: 'text', placeholder: 'postgres', required: true },
      { key: 'password', label: 'Password', type: 'password', placeholder: '••••••', required: true },
    ],
  },
  {
    id: 'mysql', name: 'MySQL', icon: Database, category: 'database',
    description: 'Connect to MySQL databases',
    fields: [
      { key: 'host', label: 'Host', type: 'text', placeholder: 'localhost', required: true },
      { key: 'port', label: 'Port', type: 'number', placeholder: '3306', required: true },
      { key: 'database', label: 'Database', type: 'text', placeholder: 'mydb', required: true },
      { key: 'user', label: 'Username', type: 'text', placeholder: 'root', required: true },
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
    description: 'Connect to Databricks lakehouse',
    fields: [
      { key: 'host', label: 'Workspace URL', type: 'text', placeholder: 'adb-1234567890.azuredatabricks.net', required: true },
      { key: 'token', label: 'Access Token', type: 'password', placeholder: 'dapi...', required: true },
      { key: 'catalog', label: 'Catalog', type: 'text', placeholder: 'main', required: true },
      { key: 'schema', label: 'Schema', type: 'text', placeholder: 'default', required: true },
    ],
  },
  {
    id: 'sql-generic', name: 'SQL (Generic)', icon: Database, category: 'database',
    description: 'Connect via generic SQL connection string',
    fields: [
      { key: 'connectionString', label: 'Connection String', type: 'password', placeholder: 'Driver={...};Server=...;Database=...', required: true },
    ],
  },
  {
    id: 'google-analytics', name: 'Google Analytics', icon: BarChart3, category: 'app',
    description: 'Import data from Google Analytics 4',
    fields: [
      { key: 'propertyId', label: 'Property ID', type: 'text', placeholder: '123456789', required: true },
      { key: 'serviceAccountKey', label: 'Service Account JSON Key', type: 'password', placeholder: 'Paste JSON key', required: true },
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
      { key: 'password', label: 'Password + Security Token', type: 'password', placeholder: '••••••', required: true },
    ],
  },
  {
    id: 'hubspot', name: 'HubSpot', icon: Users, category: 'app',
    description: 'Import contacts, deals, and analytics from HubSpot',
    fields: [
      { key: 'apiKey', label: 'Private App Access Token', type: 'password', placeholder: 'pat-...', required: true },
    ],
  },
  {
    id: 'stripe', name: 'Stripe', icon: CreditCard, category: 'app',
    description: 'Import payment and subscription data from Stripe',
    fields: [
      { key: 'apiKey', label: 'Secret Key', type: 'password', placeholder: 'sk_live_...', required: true },
    ],
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

interface SavedConnection {
  id: string;
  connectorId: string;
  name: string;
  status: 'connected' | 'error';
  createdAt: string;
}

function loadConnections(): SavedConnection[] {
  const stored = localStorage.getItem(CONNECTIONS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveConnection(conn: SavedConnection) {
  const all = loadConnections();
  all.push(conn);
  localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(all));
}

function removeConnection(id: string) {
  const all = loadConnections().filter(c => c.id !== id);
  localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(all));
}

export function ConnectorPanel() {
  const [connections, setConnections] = useState<SavedConnection[]>(loadConnections());
  const [selectedConnector, setSelectedConnector] = useState<ConnectorConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filtered = filterCategory === 'all' ? CONNECTORS : CONNECTORS.filter(c => c.category === filterCategory);

  const handleConnect = async () => {
    if (!selectedConnector) return;
    const missing = selectedConnector.fields.filter(f => f.required && !formData[f.key]?.trim());
    if (missing.length > 0) {
      toast({ title: 'Missing fields', description: `Fill in: ${missing.map(f => f.label).join(', ')}`, variant: 'destructive' });
      return;
    }

    setIsTesting(true);
    // Simulate connection test
    await new Promise(r => setTimeout(r, 1500));

    const conn: SavedConnection = {
      id: crypto.randomUUID(),
      connectorId: selectedConnector.id,
      name: `${selectedConnector.name} Connection`,
      status: 'connected',
      createdAt: new Date().toISOString(),
    };
    saveConnection(conn);
    setConnections(loadConnections());
    setSelectedConnector(null);
    setFormData({});
    setIsTesting(false);
    toast({ title: 'Connected!', description: `${selectedConnector.name} connection established. Data will be available in Datasets.` });
  };

  const handleDisconnect = (id: string) => {
    removeConnection(id);
    setConnections(loadConnections());
    toast({ title: 'Disconnected', description: 'Connection removed.' });
  };

  const getConnectorName = (connectorId: string) => CONNECTORS.find(c => c.id === connectorId)?.name || connectorId;
  const getConnectorIcon = (connectorId: string) => CONNECTORS.find(c => c.id === connectorId)?.icon || Database;

  return (
    <div className="space-y-4">
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
                        <p className="text-sm font-medium">{getConnectorName(conn.connectorId)}</p>
                        <p className="text-xs text-muted-foreground">Connected {new Date(conn.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs text-emerald-500 border-emerald-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />Active
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {filtered.map(connector => {
              const isConnected = connections.some(c => c.connectorId === connector.id);
              return (
                <button key={connector.id}
                  onClick={() => { setSelectedConnector(connector); setFormData({}); }}
                  disabled={isConnected}
                  className={cn("p-3 rounded-lg border border-border text-left transition-colors hover:bg-muted",
                    isConnected && "opacity-50 cursor-not-allowed")}>
                  <connector.icon className="h-5 w-5 text-primary mb-2" />
                  <p className="text-xs font-medium">{connector.name}</p>
                  {isConnected && <Badge variant="outline" className="text-[10px] mt-1">Connected</Badge>}
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
          <div className="space-y-4">
            {selectedConnector?.fields.map(field => (
              <div key={field.key} className="space-y-2">
                <Label className="text-sm">{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                <Input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formData[field.key] || ''}
                  onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedConnector(null)}>Cancel</Button>
            <Button onClick={handleConnect} disabled={isTesting} className="gap-2">
              {isTesting ? <><Loader2 className="h-4 w-4 animate-spin" />Testing...</> : <><Link2 className="h-4 w-4" />Connect</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
