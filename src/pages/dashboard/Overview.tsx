import { useEffect, useState, useCallback } from 'react';
import { 
  Database, BarChart3, Sparkles, TrendingUp, Plus, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { KPICard } from '@/components/dashboard/KPICard';
import { VisualizationEngine } from '@/components/charts/VisualizationEngine';
import { DatasetUploader } from '@/components/data/DatasetUploader';
import { CopilotChat } from '@/components/copilot/CopilotChat';
import { DAXBot } from '@/components/copilot/DAXBot';
import { EmptyStateCharacter } from '@/components/dashboard/EmptyStateCharacter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Semantic model store (measures)
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

export default function Overview() {
  const { user } = useAuth();
  const { datasets, currentDataset, currentData, refreshDatasets } = useData();

  const [showUploader, setShowUploader] = useState(false);
  const [measures, setMeasures] = useState(loadMeasures());

  const hasData = datasets.length > 0;

  useEffect(() => {
    refreshDatasets();
  }, []);

  const handleApplyMeasure = useCallback((name: string, formula: string) => {
    saveMeasure(name, formula);
    setMeasures(loadMeasures());
  }, []);

  // Build aggregated chart data from real dataset
  const getChartData = () => {
    if (!currentData || currentData.length === 0) return { byCategory: [], byDate: [], totalRevenue: 0, totalProfit: 0, avgRating: 0 };

    const keys = Object.keys(currentData[0]);
    const numericKeys = keys.filter(k => typeof currentData[0][k] === 'number');
    const stringKeys = keys.filter(k => typeof currentData[0][k] === 'string');

    const catKey = stringKeys[0] || keys[0];
    const valKey = numericKeys[0] || keys[1] || keys[0];
    const valKey2 = numericKeys[1] || valKey;

    const byCategory = currentData.reduce((acc, row) => {
      const cat = String(row[catKey]);
      const val = Number(row[valKey]) || 0;
      const existing = acc.find((a: Record<string, unknown>) => a[catKey] === cat);
      if (existing) {
        (existing as Record<string, unknown>)[valKey] = (Number(existing[valKey]) || 0) + val;
      } else {
        acc.push({ [catKey]: cat, [valKey]: val });
      }
      return acc;
    }, [] as Record<string, unknown>[]);

    const totalRevenue = currentData.reduce((sum, row) => sum + (Number(row[valKey]) || 0), 0);
    const totalProfit = currentData.reduce((sum, row) => sum + (Number(row[valKey2]) || 0), 0);

    return { byCategory, byDate: byCategory, totalRevenue, totalProfit, avgRating: 0, catKey, valKey };
  };

  const { byCategory, totalRevenue, totalProfit, catKey, valKey } = getChartData();

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0] || 'User'}!</h1>
          <p className="text-muted-foreground">Here's what's happening with your data today.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowUploader(!showUploader)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Data
          </Button>
        </div>
      </div>

      {showUploader && <DatasetUploader onUploadComplete={() => { setShowUploader(false); refreshDatasets(); }} />}

      <AnimatePresence mode="wait">
        {!hasData ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
            <EmptyStateCharacter onUploadClick={() => setShowUploader(true)} isHoveringUpload={showUploader} />
          </motion.div>
        ) : (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="Total Rows" value={currentData.length.toLocaleString()} icon={Database} />
              <KPICard title="Datasets" value={datasets.length} icon={BarChart3} />
              <KPICard title="Primary Sum" value={`${(totalRevenue).toLocaleString()}`} change={12.5} trend="up" icon={TrendingUp} />
              <KPICard title="Measures" value={measures.length} icon={Sparkles} />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {catKey && valKey && byCategory.length > 0 && (
                  <>
                    <VisualizationEngine chartType="bar" data={byCategory} xAxis={catKey} yAxis={valKey} title={`${valKey} by ${catKey}`} height={300} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <VisualizationEngine chartType="line" data={byCategory} xAxis={catKey} yAxis={valKey} title={`${valKey} Trend`} height={250} />
                      <VisualizationEngine chartType="pie" data={byCategory.map(c => ({ name: String(c[catKey!]), value: Number(c[valKey!]) }))} xAxis="name" yAxis="value" title="Distribution" height={250} />
                    </div>
                  </>
                )}

                {/* Measures Library */}
                {measures.length > 0 && (
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Semantic Model — Measures</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
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

              {/* Right Panel: DAX Bot + Stats */}
              <div className="space-y-6">
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

                <div className="h-[28rem]">
                  <DAXBot datasetId={currentDataset?.id} onApplyMeasure={handleApplyMeasure} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
