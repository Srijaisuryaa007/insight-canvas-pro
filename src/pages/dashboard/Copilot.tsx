import { useState } from 'react';
import { CopilotChat } from '@/components/copilot/CopilotChat';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sparkles, Database, Lightbulb, BarChart3, Eye, Zap, Target, Terminal } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { PLANS } from '@/types/subscription';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

export default function Copilot() {
  const { currentDataset, currentData, datasets, selectDataset } = useData();
  const { plan } = useSubscription();
  const navigate = useNavigate();
  const [stakeholderView, setStakeholderView] = useState(false);
  const [aiMode, setAiMode] = useState<'fast' | 'precise'>('fast');
  const [generatedSQL, setGeneratedSQL] = useState('');

  const planConfig = PLANS[plan];
  const availableModels = planConfig.aiModels;

  const handleGenerateSQL = () => {
    if (!currentData.length) {
      toast({ title: 'No dataset selected', variant: 'destructive' });
      return;
    }
    const cols = Object.keys(currentData[0]);
    const numCols = cols.filter(c => typeof currentData[0][c] === 'number');
    const strCols = cols.filter(c => typeof currentData[0][c] === 'string');
    const tableName = currentDataset?.name?.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() || 'dataset';

    // Generate a sample SQL based on data structure
    let sql = '';
    if (strCols.length > 0 && numCols.length > 0) {
      sql = `SELECT ${strCols[0]}, SUM(${numCols[0]}) as total_${numCols[0]}\nFROM ${tableName}\nGROUP BY ${strCols[0]}\nORDER BY total_${numCols[0]} DESC\nLIMIT 10`;
    } else if (numCols.length > 0) {
      sql = `SELECT *\nFROM ${tableName}\nORDER BY ${numCols[0]} DESC\nLIMIT 20`;
    } else {
      sql = `SELECT *\nFROM ${tableName}\nLIMIT 20`;
    }
    setGeneratedSQL(sql);
  };

  const handleImportToSQLEngine = () => {
    if (!generatedSQL) return;
    sessionStorage.setItem('datapulse_sql_query', generatedSQL);
    navigate('/dashboard/sql');
    toast({ title: 'Query imported to SQL Engine' });
  };

  const features = [
    { icon: Lightbulb, title: 'Structured Insights', description: 'Key findings, evidence, risks, opportunities, and actions' },
    { icon: BarChart3, title: 'Chart Recommendations', description: 'AI suggests the best visualization type for your query' },
    { icon: Database, title: 'Query Your Data', description: 'Ask natural language questions about your datasets' },
    { icon: Target, title: 'Stakeholder Mode', description: 'Toggle board-ready formatting for executive presentations' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />AI Copilot
          </h1>
          <p className="text-muted-foreground">Your intelligent data analysis assistant</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <Label className="text-xs">Mode:</Label>
            <Button variant={aiMode === 'fast' ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => setAiMode('fast')}>
              ⚡ Fast
            </Button>
            <Button variant={aiMode === 'precise' ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => setAiMode('precise')}>
              🎯 Precise
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <Label className="text-xs">Stakeholder</Label>
            <Switch checked={stakeholderView} onCheckedChange={setStakeholderView} />
          </div>
          <Badge variant="outline">5 credits per query</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[calc(100vh-14rem)]">
          <CopilotChat datasetId={currentDataset?.id} />
        </div>

        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3"><CardTitle className="text-base">Active Dataset</CardTitle></CardHeader>
            <CardContent>
              {currentDataset ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{currentDataset.name}</p>
                    <p className="text-sm text-muted-foreground">{currentDataset.rowCount} rows • {currentDataset.columns?.length || 0} columns</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Select a dataset to enable context-aware analysis</p>
              )}
            </CardContent>
          </Card>

          {/* SQL Generation */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />SQL Query Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleGenerateSQL} variant="outline" className="w-full text-sm" disabled={!currentData.length}>
                Generate SQL from dataset
              </Button>
              {generatedSQL && (
                <>
                  <pre className="text-xs bg-muted/50 rounded-lg p-3 font-mono overflow-x-auto whitespace-pre-wrap">{generatedSQL}</pre>
                  <Button onClick={handleImportToSQLEngine} className="w-full text-sm gap-2">
                    <Terminal className="h-4 w-4" />Import to SQL Engine
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3"><CardTitle className="text-base">AI Models</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {availableModels.map(m => (
                <div key={m} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm capitalize font-medium">{m}</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">Available</Badge>
                </div>
              ))}
              {plan !== 'enterprise' && (
                <p className="text-xs text-muted-foreground mt-2">Upgrade to unlock more AI models.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3"><CardTitle className="text-base">Capabilities</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {features.map((f, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <f.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3"><CardTitle className="text-base">Your Datasets</CardTitle></CardHeader>
            <CardContent>
              {datasets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No datasets uploaded yet</p>
              ) : (
                <div className="space-y-2">
                  {datasets.slice(0, 5).map(ds => (
                    <button key={ds.id} onClick={() => selectDataset(ds.id)}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer text-left">
                      <span className="text-sm">{ds.name}</span>
                      <Badge variant="outline" className="text-xs">{ds.rowCount} rows</Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
