import { useState, useCallback, useMemo } from 'react';
import { 
  Database, Sparkles, TrendingUp, Upload, DollarSign, ShoppingCart, Hash, Users, Percent,
  Code, FileSpreadsheet, Link2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DatasetUploader } from '@/components/data/DatasetUploader';
import { DAXBot } from '@/components/copilot/DAXBot';
import { ExcelBot } from '@/components/copilot/ExcelBot';
import { ConnectorPanel } from '@/components/connectors/ConnectorPanel';
import { EmptyStateCharacter } from '@/components/dashboard/EmptyStateCharacter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  ResponsiveContainer, LineChart, Line,
} from 'recharts';

const MEASURES_KEY = 'datapulse_measures';
function loadMeasures(): Array<{ name: string; formula: string; createdAt: string }> {
  const stored = localStorage.getItem(MEASURES_KEY);
  return stored ? JSON.parse(stored) : [];
}
function saveMeasure(name: string, formula: string) {
  const measures = loadMeasures();
  measures.push({ name, formula, createdAt: new Date().toISOString() });
  localStorage.setItem(MEASURES_KEY, JSON.stringify(measures));
}

function getKPIIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('revenue') || n.includes('sales') || n.includes('price') || n.includes('cost') || n.includes('profit') || n.includes('amount')) return DollarSign;
  if (n.includes('quantity') || n.includes('order') || n.includes('count') || n.includes('item')) return ShoppingCart;
  if (n.includes('customer') || n.includes('user') || n.includes('employee')) return Users;
  if (n.includes('rate') || n.includes('percent') || n.includes('ratio') || n.includes('discount')) return Percent;
  if (n.includes('rating') || n.includes('score')) return Sparkles;
  return Hash;
}

export default function Overview() {
  const { user } = useAuth();
  const { datasets, currentDataset, currentData, refreshDatasets } = useData();
  const [showUploader, setShowUploader] = useState(false);
  const [measures, setMeasures] = useState(loadMeasures());
  const [activeAI, setActiveAI] = useState<'dax' | 'excel'>('dax');
  const [showConnectors, setShowConnectors] = useState(false);

  const hasData = currentDataset !== null && currentData.length > 0;

  const handleApplyMeasure = useCallback((name: string, formula: string) => {
    saveMeasure(name, formula);
    setMeasures(loadMeasures());
  }, []);

  // Dynamic KPIs based on current data (no filters — filters removed per spec)
  const kpis = useMemo(() => {
    if (!currentData || currentData.length === 0) return [];
    const keys = Object.keys(currentData[0]);
    const numericKeys = keys.filter(k => typeof currentData[0][k] === 'number');

    const results: Array<{ title: string; value: string; icon: any; sparkData: number[]; change?: number; trend?: 'up' | 'down' | 'neutral' }> = [];

    results.push({ title: 'Total Rows', value: currentData.length.toLocaleString(), icon: Database, sparkData: [] });

    numericKeys.slice(0, 3).forEach(key => {
      const vals = currentData.map(r => Number(r[key]) || 0);
      const sum = vals.reduce((a, b) => a + b, 0);
      const avg = sum / vals.length;
      
      const bucketSize = Math.max(1, Math.floor(vals.length / 10));
      const sparkData: number[] = [];
      for (let i = 0; i < vals.length; i += bucketSize) {
        const bucket = vals.slice(i, i + bucketSize);
        sparkData.push(bucket.reduce((a, b) => a + b, 0) / bucket.length);
      }

      const firstHalf = vals.slice(0, Math.floor(vals.length / 2));
      const secondHalf = vals.slice(Math.floor(vals.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / (firstHalf.length || 1);
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / (secondHalf.length || 1);
      const changePct = firstAvg ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

      const isAvgMetric = key.toLowerCase().includes('rating') || key.toLowerCase().includes('score') || key.toLowerCase().includes('rate') || key.toLowerCase().includes('discount');

      results.push({
        title: isAvgMetric ? `Avg ${key}` : `Total ${key}`,
        value: isAvgMetric ? avg.toFixed(1) : sum.toLocaleString(),
        icon: getKPIIcon(key),
        sparkData,
        change: Math.round(changePct * 10) / 10,
        trend: changePct > 1 ? 'up' : changePct < -1 ? 'down' : 'neutral',
      });
    });

    return results;
  }, [currentData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0] || 'User'}!</h1>
          <p className="text-muted-foreground">Here's what's happening with your data today.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowConnectors(!showConnectors)}>
            <Link2 className="h-4 w-4 mr-2" />Connect Data
          </Button>
          <Button onClick={() => setShowUploader(!showUploader)}>
            <Upload className="h-4 w-4 mr-2" />Upload Data
          </Button>
        </div>
      </div>

      {showUploader && <DatasetUploader onUploadComplete={() => { setShowUploader(false); refreshDatasets(); }} />}
      {showConnectors && <ConnectorPanel />}

      <AnimatePresence mode="wait">
        {!hasData ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
            <EmptyStateCharacter onUploadClick={() => setShowUploader(true)} isHoveringUpload={showUploader} />
          </motion.div>
        ) : (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
            
            {/* Dynamic KPI Cards with Sparklines */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((kpi, i) => (
                <Card key={i} className="p-5 bg-card border-border hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <p className="text-xs text-muted-foreground font-medium">{kpi.title}</p>
                      <p className="text-2xl font-bold text-card-foreground">{kpi.value}</p>
                      {kpi.change !== undefined && (
                        <div className={`flex items-center gap-1 text-xs ${kpi.trend === 'up' ? 'text-emerald-500' : kpi.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'}`}>
                          <TrendingUp className="h-3 w-3" />
                          <span>{kpi.change > 0 ? '+' : ''}{kpi.change}%</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <kpi.icon className="h-4 w-4 text-primary" />
                      </div>
                      {kpi.sparkData.length > 2 && (
                        <div className="w-16 h-8">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={kpi.sparkData.map(v => ({ v }))}>
                              <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Semantic Model + AI Bots */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-4">
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Workspace Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Datasets</span>
                      <span className="font-medium">{datasets.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Rows</span>
                      <span className="font-medium">{currentData.length.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Measures</span>
                      <span className="font-medium">{measures.length}</span>
                    </div>
                  </CardContent>
                </Card>

                {measures.length > 0 && (
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Semantic Model — Measures</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {measures.map((m, i) => (
                          <div key={i} className="p-3 rounded-lg bg-muted/50 font-mono text-xs">
                            <span className="text-foreground font-medium">{m.name}</span>
                            <pre className="text-muted-foreground mt-1 whitespace-pre-wrap">{m.formula}</pre>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="lg:col-span-2">
                <Tabs value={activeAI} onValueChange={(v) => setActiveAI(v as 'dax' | 'excel')}>
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="dax" className="gap-2"><Code className="h-4 w-4" />DAX Bot</TabsTrigger>
                    <TabsTrigger value="excel" className="gap-2"><FileSpreadsheet className="h-4 w-4" />Excel Formula Bot</TabsTrigger>
                  </TabsList>
                  <TabsContent value="dax" className="mt-4">
                    <div className="h-[28rem]">
                      <DAXBot datasetId={currentDataset?.id} onApplyMeasure={handleApplyMeasure} columns={currentData.length > 0 ? Object.keys(currentData[0]) : []} data={currentData} />
                    </div>
                  </TabsContent>
                  <TabsContent value="excel" className="mt-4">
                    <div className="h-[28rem]">
                      <ExcelBot datasetId={currentDataset?.id} onApplyMeasure={handleApplyMeasure} columns={currentData.length > 0 ? Object.keys(currentData[0]) : []} data={currentData} />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
