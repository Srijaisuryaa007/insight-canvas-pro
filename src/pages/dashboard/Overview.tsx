import { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Database, BarChart3, Sparkles, TrendingUp, Upload, DollarSign, ShoppingCart, Hash, Users, Percent,
  Search, CalendarDays, X, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VisualizationEngine } from '@/components/charts/VisualizationEngine';
import { DatasetUploader } from '@/components/data/DatasetUploader';
import { DAXBot } from '@/components/copilot/DAXBot';
import { EmptyStateCharacter } from '@/components/dashboard/EmptyStateCharacter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

function detectDateColumn(data: Record<string, unknown>[]): string | null {
  if (!data.length) return null;
  const keys = Object.keys(data[0]);
  for (const k of keys) {
    const sample = data[0][k];
    if (typeof sample === 'string') {
      const parsed = Date.parse(sample);
      if (!isNaN(parsed) && /\d{4}[-/]\d{1,2}/.test(sample)) return k;
    }
    if (k.toLowerCase().includes('date') || k.toLowerCase().includes('time')) {
      const val = String(data[0][k]);
      if (!isNaN(Date.parse(val))) return k;
    }
  }
  return null;
}

export default function Overview() {
  const { user } = useAuth();
  const { datasets, currentDataset, currentData, refreshDatasets } = useData();
  const [showUploader, setShowUploader] = useState(false);
  const [measures, setMeasures] = useState(loadMeasures());

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [crossFilter, setCrossFilter] = useState<{ key: string; value: string } | null>(null);

  const hasData = currentDataset !== null && currentData.length > 0;

  const dateColumn = useMemo(() => hasData ? detectDateColumn(currentData) : null, [currentData, hasData]);

  // Filtered data - centralized, immutable original
  const filteredData = useMemo(() => {
    if (!hasData) return [];
    let result = currentData;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q))
      );
    }

    // Date filter
    if (dateColumn && dateFrom) {
      const from = new Date(dateFrom).getTime();
      result = result.filter(row => {
        const d = new Date(String(row[dateColumn])).getTime();
        return !isNaN(d) && d >= from;
      });
    }
    if (dateColumn && dateTo) {
      const to = new Date(dateTo).getTime() + 86400000;
      result = result.filter(row => {
        const d = new Date(String(row[dateColumn])).getTime();
        return !isNaN(d) && d < to;
      });
    }

    // Cross-filter
    if (crossFilter) {
      result = result.filter(row => String(row[crossFilter.key]) === crossFilter.value);
    }

    return result;
  }, [currentData, hasData, searchQuery, dateColumn, dateFrom, dateTo, crossFilter]);

  const isFiltered = searchQuery.trim() !== '' || dateFrom !== '' || dateTo !== '' || crossFilter !== null;

  const handleResetFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setCrossFilter(null);
  };

  const handleChartClick = useCallback((dataPoint: Record<string, unknown>, catKey: string) => {
    const val = String(dataPoint[catKey]);
    if (crossFilter && crossFilter.key === catKey && crossFilter.value === val) {
      setCrossFilter(null); // toggle off
    } else {
      setCrossFilter({ key: catKey, value: val });
    }
  }, [crossFilter]);

  useEffect(() => { refreshDatasets(); }, []);

  const handleApplyMeasure = useCallback((name: string, formula: string) => {
    saveMeasure(name, formula);
    setMeasures(loadMeasures());
  }, []);

  // Dynamic KPIs based on filtered data
  const kpis = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    const keys = Object.keys(filteredData[0]);
    const numericKeys = keys.filter(k => typeof filteredData[0][k] === 'number');

    const results: Array<{ title: string; value: string; icon: any; sparkData: number[]; change?: number; trend?: 'up' | 'down' | 'neutral' }> = [];

    results.push({ title: 'Total Rows', value: filteredData.length.toLocaleString(), icon: Database, sparkData: [] });

    numericKeys.slice(0, 3).forEach(key => {
      const vals = filteredData.map(r => Number(r[key]) || 0);
      const sum = vals.reduce((a, b) => a + b, 0);
      const avg = sum / vals.length;
      
      const bucketSize = Math.max(1, Math.floor(vals.length / 10));
      const sparkData = [];
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
  }, [filteredData]);

  // Chart data from filtered data
  const chartData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return { byCategory: [], catKey: '', valKey: '' };
    const keys = Object.keys(filteredData[0]);
    const numericKeys = keys.filter(k => typeof filteredData[0][k] === 'number');
    const stringKeys = keys.filter(k => typeof filteredData[0][k] === 'string');
    const catKey = stringKeys[0] || keys[0];
    const valKey = numericKeys[0] || keys[1] || keys[0];

    const byCategory = filteredData.reduce((acc, row) => {
      const cat = String(row[catKey]);
      const val = Number(row[valKey]) || 0;
      const existing = acc.find((a: Record<string, unknown>) => a[catKey] === cat);
      if (existing) (existing as any)[valKey] = (Number(existing[valKey]) || 0) + val;
      else acc.push({ [catKey]: cat, [valKey]: val });
      return acc;
    }, [] as Record<string, unknown>[]);

    return { byCategory, catKey, valKey };
  }, [filteredData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0] || 'User'}!</h1>
          <p className="text-muted-foreground">Here's what's happening with your data today.</p>
        </div>
        <Button onClick={() => setShowUploader(!showUploader)}>
          <Upload className="h-4 w-4 mr-2" />Upload Data
        </Button>
      </div>

      {showUploader && <DatasetUploader onUploadComplete={() => { setShowUploader(false); refreshDatasets(); }} />}

      <AnimatePresence mode="wait">
        {!hasData ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
            <EmptyStateCharacter onUploadClick={() => setShowUploader(true)} isHoveringUpload={showUploader} />
          </motion.div>
        ) : (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
            
            {/* Filter Bar */}
            <Card className="bg-card border-border">
              <CardContent className="py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search all columns..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  {dateColumn && (
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-36" />
                      <span className="text-xs text-muted-foreground">to</span>
                      <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-36" />
                    </div>
                  )}
                  {!dateColumn && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3 mr-1" />No date column detected
                    </Badge>
                  )}
                  {crossFilter && (
                    <Badge variant="secondary" className="gap-1">
                      <Filter className="h-3 w-3" />
                      {crossFilter.key}: {crossFilter.value}
                      <button onClick={() => setCrossFilter(null)}><X className="h-3 w-3" /></button>
                    </Badge>
                  )}
                  <Button variant={isFiltered ? "default" : "outline"} size="sm" onClick={handleResetFilters} disabled={!isFiltered}>
                    All Data
                  </Button>
                  {isFiltered && (
                    <span className="text-xs text-muted-foreground">
                      {filteredData.length} of {currentData.length} rows
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

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

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {chartData.catKey && chartData.valKey && chartData.byCategory.length > 0 && (
                  <>
                    <VisualizationEngine
                      chartType="bar"
                      data={chartData.byCategory}
                      xAxis={chartData.catKey}
                      yAxis={chartData.valKey}
                      title={`${chartData.valKey} by ${chartData.catKey}`}
                      height={300}
                      onDataClick={(point) => handleChartClick(point, chartData.catKey)}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <VisualizationEngine
                        chartType="line"
                        data={chartData.byCategory}
                        xAxis={chartData.catKey}
                        yAxis={chartData.valKey}
                        title={`${chartData.valKey} Trend`}
                        height={250}
                        onDataClick={(point) => handleChartClick(point, chartData.catKey)}
                      />
                      <VisualizationEngine
                        chartType="pie"
                        data={chartData.byCategory.map(c => ({ name: String(c[chartData.catKey!]), value: Number(c[chartData.valKey!]) }))}
                        xAxis="name"
                        yAxis="value"
                        title="Distribution"
                        height={250}
                        onDataClick={(point) => handleChartClick(point, 'name')}
                      />
                    </div>
                  </>
                )}

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
