import { useState, useCallback, useMemo } from 'react';
import {
  Database, TrendingUp, Upload, Hash, Users, Percent, Sparkles,
  Link2, BarChart3, FileText, Bot, Eye, ArrowRight, Shield,
  Layers, ChevronRight, Clock, CheckCircle2, Activity, Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DatasetUploader } from '@/components/data/DatasetUploader';
import { ConnectorPanel } from '@/components/connectors/ConnectorPanel';
import { ConnectDataModal } from '@/components/connectors/ConnectDataModal';
import { EmptyStateCharacter } from '@/components/dashboard/EmptyStateCharacter';
import { VisualizationEngine } from '@/components/charts/VisualizationEngine';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer, LineChart, Line,
} from 'recharts';

// ─── Helpers ──────────────────────────────────────────────────────

const formatColumnName = (col: string) => {
  if (!col) return '';
  return col
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const MEASURES_KEY = 'datapulse_measures';
function loadMeasures(): Array<{ name: string; formula: string; createdAt: string }> {
  const stored = localStorage.getItem(MEASURES_KEY);
  return stored ? JSON.parse(stored) : [];
}

function getKPIColor(index: number) {
  const colors = [
    { border: 'border-l-blue-500', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-500', sparkColor: 'hsl(217, 91%, 60%)' },
    { border: 'border-l-emerald-500', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', sparkColor: 'hsl(160, 84%, 39%)' },
    { border: 'border-l-amber-500', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500', sparkColor: 'hsl(38, 92%, 50%)' },
    { border: 'border-l-orange-500', iconBg: 'bg-orange-500/10', iconColor: 'text-orange-500', sparkColor: 'hsl(25, 95%, 53%)' },
  ];
  return colors[index % colors.length];
}

function getKPIIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('row')) return Database;
  if (n.includes('revenue') || n.includes('sales') || n.includes('price') || n.includes('cost') || n.includes('profit') || n.includes('amount')) return TrendingUp;
  if (n.includes('customer') || n.includes('user') || n.includes('employee')) return Users;
  if (n.includes('rate') || n.includes('percent') || n.includes('ratio') || n.includes('discount')) return Percent;
  if (n.includes('rating') || n.includes('score')) return Sparkles;
  return Hash;
}

// ─── Main Component ───────────────────────────────────────────────

export default function Overview() {
  const { user } = useAuth();
  const { datasets, currentDataset, currentData, refreshDatasets } = useData();
  const { credits } = useCredits();
  const navigate = useNavigate();
  const [showUploader, setShowUploader] = useState(false);
  const [showConnectors, setShowConnectors] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const hasData = currentDataset !== null && currentData.length > 0;
  const measures = useMemo(() => loadMeasures(), []);

  // ─── Dynamic KPIs ───────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!currentData || currentData.length === 0) return [];
    const keys = Object.keys(currentData[0]);
    const numericKeys = keys.filter(k => typeof currentData[0][k] === 'number');

    const results: Array<{
      title: string; value: string; icon: any; sparkData: number[];
      change?: number; trend?: 'up' | 'down' | 'neutral';
    }> = [];

    results.push({
      title: 'Total Rows',
      value: currentData.length.toLocaleString(),
      icon: Database,
      sparkData: [],
    });

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
        title: isAvgMetric ? `Avg ${formatColumnName(key)}` : `Total ${formatColumnName(key)}`,
        value: isAvgMetric ? avg.toFixed(2) : sum.toLocaleString(undefined, { maximumFractionDigits: 2 }),
        icon: getKPIIcon(key),
        sparkData,
        change: Math.round(changePct * 10) / 10,
        trend: changePct > 1 ? 'up' : changePct < -1 ? 'down' : 'neutral',
      });
    });

    return results;
  }, [currentData]);

  // ─── Data Health Score ──────────────────────────────────────────
  const dataHealth = useMemo(() => {
    if (!currentData.length) return null;
    const keys = Object.keys(currentData[0]);
    let totalCells = currentData.length * keys.length;
    let nullCells = 0;
    let duplicateRows = 0;

    const rowSet = new Set<string>();
    currentData.forEach(row => {
      const rowStr = JSON.stringify(row);
      if (rowSet.has(rowStr)) duplicateRows++;
      else rowSet.add(rowStr);
      keys.forEach(k => {
        if (row[k] === null || row[k] === undefined || row[k] === '') nullCells++;
      });
    });

    const completeness = Math.round(((totalCells - nullCells) / totalCells) * 100);
    const uniqueness = Math.round(((currentData.length - duplicateRows) / currentData.length) * 100);
    const validity = Math.min(100, Math.round((completeness + uniqueness) / 2 + 5));
    const overall = Math.round((completeness * 0.4 + uniqueness * 0.3 + validity * 0.3));

    return { overall, completeness, uniqueness, validity };
  }, [currentData]);

  // ─── AI Chart Recommendation ────────────────────────────────────
  const topChart = useMemo(() => {
    if (!currentData.length) return null;
    const keys = Object.keys(currentData[0]);
    const strCols = keys.filter(k => typeof currentData[0][k] === 'string');
    const numCols = keys.filter(k => typeof currentData[0][k] === 'number');
    if (!strCols.length || !numCols.length) return null;
    return { xAxis: strCols[0], yAxis: numCols[0], type: 'bar' as const };
  }, [currentData]);

  // ─── Semantic Model Measures (generated from actual data) ───────
  const generatedMeasures = useMemo(() => {
    if (!currentData.length || !currentDataset) return [];
    const keys = Object.keys(currentData[0]);
    const numericKeys = keys.filter(k => typeof currentData[0][k] === 'number');
    const dsName = currentDataset.name.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_');

    return numericKeys.slice(0, 5).map(key => ({
      name: `Total ${formatColumnName(key)}`,
      formula: `Total ${formatColumnName(key)} = SUM(${dsName}[${key}])`,
    }));
  }, [currentData, currentDataset]);

  // ─── Recent Activity (simulated from data context) ──────────────
  const recentActivity = useMemo(() => {
    const items: Array<{ color: string; action: string; detail: string; time: string }> = [];
    if (currentDataset) {
      const keys = currentData.length > 0 ? Object.keys(currentData[0]) : [];
      items.push({
        color: 'bg-emerald-500',
        action: `${currentDataset.fileName || currentDataset.name} uploaded`,
        detail: `${currentData.length} rows \u2022 ${keys.length} columns`,
        time: 'Recent',
      });
      if (dataHealth) {
        items.push({
          color: 'bg-blue-500',
          action: 'Data quality check completed',
          detail: `Score: ${dataHealth.overall}/100 \u2022 Grade ${dataHealth.overall >= 90 ? 'A' : dataHealth.overall >= 75 ? 'B' : 'C'}`,
          time: 'Recent',
        });
      }
      if (currentData.length > 0) {
        items.push({
          color: 'bg-purple-500',
          action: 'AI insights available',
          detail: 'Dataset analyzed and ready for exploration',
          time: 'Recent',
        });
      }
    }
    if (measures.length > 0) {
      items.push({
        color: 'bg-amber-500',
        action: `${measures.length} semantic measures created`,
        detail: 'DAX/Excel formulas applied',
        time: 'Earlier',
      });
    }
    return items;
  }, [currentDataset, currentData, dataHealth, measures]);

  // ─── Column count ───────────────────────────────────────────────
  const columnCount = currentData.length > 0 ? Object.keys(currentData[0]).length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-sm text-muted-foreground">Here's your DataVora workspace overview</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowConnectModal(true)}>
            <Link2 className="h-4 w-4 mr-2" />Connect Data
          </Button>
          <Button size="sm" onClick={() => setShowUploader(!showUploader)}>
            <Upload className="h-4 w-4 mr-2" />Upload Data
          </Button>
        </div>
      </motion.div>

      {showUploader && <DatasetUploader onUploadComplete={() => { setShowUploader(false); refreshDatasets(); }} />}
      {showConnectors && <ConnectorPanel />}
      <ConnectDataModal open={showConnectModal} onOpenChange={setShowConnectModal} />

      <AnimatePresence mode="wait">
        {!hasData ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
            <EmptyStateCharacter onUploadClick={() => setShowUploader(true)} isHoveringUpload={showUploader} />
          </motion.div>
        ) : (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">

            {/* ROW 1: KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((kpi, i) => {
                const color = getKPIColor(i);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className={cn("border-l-4 bg-card border-border overflow-hidden h-full", color.border)}>
                      <CardContent className="p-5 h-full flex flex-col justify-between gap-3">
                        {/* Top: Title + Icon */}
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground font-medium truncate mr-2">{kpi.title}</p>
                          <div className={cn("p-2 rounded-full shrink-0", color.iconBg)}>
                            <kpi.icon className={cn("h-4 w-4", color.iconColor)} />
                          </div>
                        </div>

                        {/* Middle: Value */}
                        <p className="text-2xl font-bold text-foreground leading-none">{kpi.value}</p>

                        {/* Bottom: Sparkline + Trend */}
                        <div className="flex items-end justify-between gap-2 min-h-[40px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {kpi.change !== undefined && (
                              <>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-[10px] h-5 px-1.5 shrink-0",
                                    kpi.trend === 'up' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                                    kpi.trend === 'down' && "bg-destructive/10 text-destructive border-destructive/20",
                                    kpi.trend === 'neutral' && "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {kpi.trend === 'up' ? '↑' : kpi.trend === 'down' ? '↓' : '→'} {Math.abs(kpi.change)}%
                                </Badge>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">vs first half</span>
                              </>
                            )}
                          </div>
                          {kpi.sparkData.length > 2 && (
                            <div className="w-20 h-10 shrink-0">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={kpi.sparkData.map(v => ({ v }))}>
                                  <Line type="monotone" dataKey="v" stroke={color.sparkColor} strokeWidth={1.5} dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* ROW 2: Three Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* LEFT COLUMN (35%) */}
              <div className="lg:col-span-4 space-y-6">
                {/* Workspace Summary */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      Workspace Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-0">
                    {[
                      { icon: Database, label: 'Datasets', value: datasets.length },
                      { icon: BarChart3, label: 'Total Rows', value: currentData.length.toLocaleString() },
                      { icon: Activity, label: 'Columns', value: columnCount },
                      { icon: Shield, label: 'Data Quality', value: dataHealth ? `${dataHealth.overall}/100` : '—' },
                      { icon: Eye, label: 'Charts Created', value: 0 },
                      { icon: FileText, label: 'Reports Made', value: 0 },
                    ].map((item, i, arr) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between py-2.5">
                          <div className="flex items-center gap-2.5">
                            <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{item.label}</span>
                          </div>
                          <span className="text-sm font-semibold text-foreground">{item.value}</span>
                        </div>
                        {i < arr.length - 1 && <Separator />}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Data Health */}
                {dataHealth && (
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        Data Health Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Circle Score */}
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative w-24 h-24">
                          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                            <circle
                              cx="50" cy="50" r="42" fill="none"
                              stroke={dataHealth.overall >= 80 ? 'hsl(var(--chart-2))' : dataHealth.overall >= 60 ? 'hsl(38, 92%, 50%)' : 'hsl(var(--destructive))'}
                              strokeWidth="8"
                              strokeDasharray={`${(dataHealth.overall / 100) * 264} 264`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-foreground">{dataHealth.overall}</span>
                            <span className="text-[10px] text-muted-foreground">/100</span>
                          </div>
                        </div>
                        <Badge variant="secondary" className={cn(
                          "text-xs",
                          dataHealth.overall >= 90 ? "bg-emerald-500/10 text-emerald-500" :
                          dataHealth.overall >= 75 ? "bg-amber-500/10 text-amber-500" :
                          "bg-destructive/10 text-destructive"
                        )}>
                          Grade {dataHealth.overall >= 90 ? 'A' : dataHealth.overall >= 75 ? 'B' : 'C'}
                        </Badge>
                      </div>

                      {/* Sub-scores */}
                      <div className="space-y-3">
                        {[
                          { label: 'Completeness', value: dataHealth.completeness },
                          { label: 'Uniqueness', value: dataHealth.uniqueness },
                          { label: 'Validity', value: dataHealth.validity },
                        ].map(s => (
                          <div key={s.label} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{s.label}</span>
                              <span className="font-medium text-foreground">{s.value}%</span>
                            </div>
                            <Progress
                              value={s.value}
                              className="h-1.5"
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* MIDDLE COLUMN (40%) */}
              <div className="lg:col-span-5 space-y-6">
                {/* Recent Activity */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentActivity.length > 0 ? (
                      <div className="space-y-4">
                        {recentActivity.map((item, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", item.color)} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{item.action}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{item.detail} &middot; {item.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <p className="text-sm text-muted-foreground">No recent activity yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Upload data to get started</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Semantic Model Measures */}
                {generatedMeasures.length > 0 && (
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Zap className="h-4 w-4 text-muted-foreground" />
                          Semantic Model
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px]">{generatedMeasures.length} measures</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {generatedMeasures.map((m, i) => (
                          <div key={i} className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
                            <p className="text-xs font-medium text-foreground">{m.name}</p>
                            <p className="text-[11px] font-mono text-muted-foreground mt-1">{m.formula}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* RIGHT COLUMN (25%) */}
              <div className="lg:col-span-3 space-y-6">
                {/* Quick Actions */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { icon: Upload, label: 'Upload New Dataset', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-500', action: () => setShowUploader(true) },
                      { icon: Bot, label: 'Ask AI Copilot', iconBg: 'bg-purple-500/10', iconColor: 'text-purple-500', action: () => navigate('/dashboard/copilot') },
                      { icon: BarChart3, label: 'Create Visualization', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', action: () => navigate('/dashboard/visualizations') },
                      { icon: FileText, label: 'Generate Report', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500', action: () => navigate('/dashboard/reports') },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={item.action}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 border border-border/50 hover:border-border transition-all group text-left"
                      >
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", item.iconBg)}>
                          <item.icon className={cn("h-4 w-4", item.iconColor)} />
                        </div>
                        <span className="text-sm font-medium text-foreground flex-1">{item.label}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {/* Credits Usage */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                      Credits This Month
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-center">
                      <span className="text-3xl font-bold text-foreground">{credits}</span>
                      <span className="text-sm text-muted-foreground ml-1">remaining</span>
                    </div>
                    <Progress value={Math.min(100, credits)} className="h-2" />
                    <div className="text-xs text-muted-foreground text-center">
                      <p>Resets monthly</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-primary hover:text-primary"
                      onClick={() => navigate('/dashboard/settings')}
                    >
                      Upgrade for unlimited
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* ROW 3: Data Snapshot — Top Chart */}
            {topChart && currentData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="bg-card border-border overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        Data Snapshot: {formatColumnName(topChart.yAxis)} by {formatColumnName(topChart.xAxis)}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-primary"
                        onClick={() => navigate('/dashboard/visualizations')}
                      >
                        View full chart <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <VisualizationEngine
                      chartType="bar"
                      data={currentData.slice(0, 20)}
                      xAxis={topChart.xAxis}
                      yAxis={topChart.yAxis}
                      height={250}
                      colorPalette="default"
                      showLegend={false}
                      showGrid={true}
                      showLabels={false}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ROW 4: Datasets Table */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    Datasets
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => navigate('/dashboard/datasets')}>
                    View all <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {datasets.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 text-xs font-medium text-muted-foreground">Name</th>
                          <th className="text-left py-2 text-xs font-medium text-muted-foreground">Rows</th>
                          <th className="text-left py-2 text-xs font-medium text-muted-foreground">Columns</th>
                          <th className="text-left py-2 text-xs font-medium text-muted-foreground">Health</th>
                          <th className="text-right py-2 text-xs font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datasets.map(ds => {
                          const cols = ds.columns?.length || (ds.data?.length ? Object.keys(ds.data[0]).length : 0);
                          return (
                            <tr key={ds.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                              <td className="py-2.5 font-medium text-foreground">{ds.name}</td>
                              <td className="py-2.5 text-muted-foreground">{ds.rowCount?.toLocaleString()}</td>
                              <td className="py-2.5 text-muted-foreground">{cols}</td>
                              <td className="py-2.5">
                                {dataHealth && ds.id === currentDataset?.id ? (
                                  <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-500">
                                    <CheckCircle2 className="h-3 w-3 mr-0.5" />{dataHealth.overall}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="py-2.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={() => navigate('/dashboard/insights')}>Analyze</Button>
                                  <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={() => navigate('/dashboard/visualizations')}>Visualize</Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">No datasets uploaded yet</p>
                    <Button size="sm" className="mt-3" onClick={() => setShowUploader(true)}>
                      <Upload className="h-4 w-4 mr-2" />Upload Dataset
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
