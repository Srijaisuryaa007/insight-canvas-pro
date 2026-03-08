import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Shield, AlertTriangle, CheckCircle, Loader2, Wand2, Database, Eye, Play, Undo2, Redo2, Sparkles,
  BarChart3, FileText, Zap, ClipboardCheck, ShieldCheck, Clock, Search, Filter, Download,
  Hash, Type, ChevronDown, X, Info, AlertCircle, CheckCircle2, Columns, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useData, Dataset } from '@/contexts/DataContext';
import { useDataQuality } from '@/hooks/useDataQuality';
import { useSubscription } from '@/hooks/useSubscription';
import { profileData, DataProfile } from '@/lib/dataProfiler';
import { runFullCleaningPipeline, CleaningSummary, ColumnAnalysis } from '@/lib/dataCleaner';
import { DuplicateReport } from '@/lib/duplicateEngine';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { applyFormulaColumn, FormulaColumn } from '@/lib/formulaEngine';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';

// Module-level cache to persist across tab switches
let cachedProfile: DataProfile | null = null;
let cachedSummary: CleaningSummary | null = null;
let cachedActiveTab: string = 'issues';
let cachedColumnDecisions: Record<string, 'drop' | 'fill' | 'keep'> = {};

// ─── Scan Step Definitions ──────────────────────────────────────
const SCAN_STEPS = [
  { label: 'Loading dataset', icon: '📊' },
  { label: 'Checking missing values', icon: '🔍' },
  { label: 'Detecting duplicates', icon: '📋' },
  { label: 'Analyzing data types', icon: '🔢' },
  { label: 'Finding outliers', icon: '📈' },
  { label: 'Validating formats', icon: '✅' },
  { label: 'Running business rules', icon: '📐' },
  { label: 'Generating health score', icon: '🏆' },
];

const CLEAN_STEPS = [
  { step: 1, label: 'Handle missing values', description: 'Fill or remove null/empty values using median/mode imputation' },
  { step: 2, label: 'Remove duplicates', description: 'Detect and remove exact and near-duplicate rows' },
  { step: 3, label: 'Fix data types', description: 'Convert mismatched types (numbers stored as text, etc.)' },
  { step: 4, label: 'Standardize formats', description: 'Normalize date formats, trim whitespace, fix encoding' },
  { step: 5, label: 'Handle outliers', description: 'Cap extreme values using IQR boundaries' },
  { step: 6, label: 'Validate business rules', description: 'Check cross-column consistency and format rules' },
  { step: 7, label: 'Fix text quality', description: 'Repair mojibake, standardize casing, trim special chars' },
  { step: 8, label: 'Generate clean report', description: 'Score data health and produce detailed changelog' },
];

const QUALITY_CHECKS = [
  'Missing values',
  'Duplicate rows',
  'Data type issues',
  'Outliers & anomalies',
  'Format validation',
  'Statistical profiling',
  'Consistency checks',
  'Business rule violations',
];

// ─── Mini Histogram Component ───────────────────────────────────
function MiniHistogram({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const buckets = Array(7).fill(0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  values.forEach(v => {
    const idx = Math.min(6, Math.floor(((v - min) / range) * 7));
    buckets[idx]++;
  });
  const maxBucket = Math.max(...buckets, 1);
  return (
    <div className="flex items-end gap-0.5 h-10">
      {buckets.map((b, i) => (
        <div
          key={i}
          className="flex-1 bg-primary/60 rounded-t-sm min-w-[4px] transition-all"
          style={{ height: `${(b / maxBucket) * 100}%`, minHeight: b > 0 ? 2 : 0 }}
        />
      ))}
    </div>
  );
}

export default function Quality() {
  const { datasets, currentDataset, currentData, selectDataset, updateCurrentData, updateCleanedData, undo, redo, canUndo, canRedo } = useData();
  const { isScanning, report, scanDataset, getFixPreview, applyFix, setReport } = useDataQuality();
  const { getCreditCost } = useSubscription();
  const [previewFix, setPreviewFix] = useState<{ column: string; type: string; description: string; before: string; after: string; affectedRows: number } | null>(null);
  const [confirmFix, setConfirmFix] = useState<{ column: string; type: string } | null>(null);
  const [confirmFixAll, setConfirmFixAll] = useState(false);
  const [aiCleaningPreview, setAiCleaningPreview] = useState<string | null>(null);
  const [dataProfile, setDataProfileState] = useState<DataProfile | null>(cachedProfile);
  const [cleaningSummary, setCleaningSummaryState] = useState<CleaningSummary | null>(cachedSummary);
  const [isProfileRunning, setIsProfileRunning] = useState(false);
  const [isCleaningRunning, setIsCleaningRunning] = useState(false);
  const [activeTab, setActiveTabState] = useState(cachedActiveTab);
  const [columnDecisions, setColumnDecisionsState] = useState<Record<string, 'drop' | 'fill' | 'keep'>>(cachedColumnDecisions);
  const [missingStrategy, setMissingStrategy] = useState<Record<string, string>>({});
  
  // New state for addons
  const [scanStep, setScanStep] = useState(0);
  const [scanStepTimer, setScanStepTimer] = useState<ReturnType<typeof setInterval> | null>(null);
  const [issueFilter, setIssueFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [fullCleanModalOpen, setFullCleanModalOpen] = useState(false);
  const [cleanOptions, setCleanOptions] = useState({ backup: true, detailedLog: true, autoDownload: false });
  const [cleaningStep, setCleaningStep] = useState(0);
  const [showScanComplete, setShowScanComplete] = useState(false);

  // Wrapped setters that also update module-level cache
  const setDataProfile = (v: DataProfile | null) => { cachedProfile = v; setDataProfileState(v); };
  const setCleaningSummary = (v: CleaningSummary | null) => { cachedSummary = v; setCleaningSummaryState(v); };
  const setActiveTab = (v: string) => { cachedActiveTab = v; setActiveTabState(v); };
  const setColumnDecisions = (v: Record<string, 'drop' | 'fill' | 'keep'>) => { cachedColumnDecisions = v; setColumnDecisionsState(v); };
  const handleColumnDecisionCached = (col: string, decision: 'drop' | 'fill' | 'keep') => {
    const next = { ...columnDecisions, [col]: decision };
    cachedColumnDecisions = next;
    setColumnDecisionsState(next);
  };

  // ─── Quick Stats (computed instantly) ─────────────────────────
  const quickStats = useMemo(() => {
    if (!currentData || currentData.length === 0) return null;
    const rows = currentData.length;
    const keys = Object.keys(currentData[0]);
    const cols = keys.length;
    const totalCells = rows * cols;
    let nullCount = 0;
    const rowSet = new Set<string>();
    let dupeCount = 0;
    currentData.forEach(row => {
      const key = JSON.stringify(row);
      if (rowSet.has(key)) dupeCount++;
      rowSet.add(key);
      keys.forEach(k => {
        if (row[k] === null || row[k] === undefined || row[k] === '') nullCount++;
      });
    });
    return { rows, cols, totalCells, estIssues: nullCount + dupeCount, nullCount, dupeCount };
  }, [currentData]);

  // ─── Scan step animation ──────────────────────────────────────
  useEffect(() => {
    if (isScanning) {
      setScanStep(0);
      setShowScanComplete(false);
      const interval = setInterval(() => {
        setScanStep(prev => {
          if (prev >= SCAN_STEPS.length - 1) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 400);
      setScanStepTimer(interval);
      return () => clearInterval(interval);
    } else {
      if (scanStepTimer) clearInterval(scanStepTimer);
      if (report) {
        setShowScanComplete(true);
        setTimeout(() => setShowScanComplete(false), 5000);
      }
    }
  }, [isScanning]);

  // ─── Handlers (all preserved from original) ──────────────────
  const handleScan = async () => {
    if (!currentDataset) return;
    await scanDataset(currentDataset.id, currentData);
  };

  const handleProfile = () => {
    if (!currentData || currentData.length === 0) {
      toast({ title: 'No Data', description: 'Upload a dataset first.', variant: 'destructive' });
      return;
    }
    setIsProfileRunning(true);
    setTimeout(() => {
      const profile = profileData(currentData);
      setDataProfile(profile);
      setIsProfileRunning(false);
      setActiveTab('profile');
      toast({ title: 'Profile Complete', description: `${profile.totalRows} rows, ${profile.totalColumns} columns, ${profile.issuesFound} issues detected` });
    }, 300);
  };

  const handleFullClean = () => {
    if (!currentData || currentData.length === 0) {
      toast({ title: 'No Data', description: 'Upload a dataset first.', variant: 'destructive' });
      return;
    }
    setFullCleanModalOpen(false);
    setIsCleaningRunning(true);
    setCleaningStep(0);
    // Animate cleaning steps
    const stepInterval = setInterval(() => {
      setCleaningStep(prev => {
        if (prev >= 7) { clearInterval(stepInterval); return prev; }
        return prev + 1;
      });
    }, 300);
    setTimeout(() => {
      clearInterval(stepInterval);
      const { cleanedData, summary } = runFullCleaningPipeline(currentData, columnDecisions);
      updateCleanedData(cleanedData, summary as unknown as Record<string, unknown>);
      setCleaningSummary(summary);
      setIsCleaningRunning(false);
      setCleaningStep(8);
      if (summary.columnsNeedingDecision.length > 0) {
        setActiveTab('columns');
        toast({ title: 'Action Required', description: `${summary.columnsNeedingDecision.length} columns are 50–70% empty and require your decision.` });
      } else {
        setActiveTab('summary');
        toast({ title: 'Cleaning Complete', description: `Health Score: ${summary.healthScore}/100 — ${summary.steps.reduce((a, s) => a + s.changesMade, 0)} changes applied` });
      }
      setDataProfile(profileData(cleanedData));
      if (currentDataset) scanDataset(currentDataset.id, cleanedData);
    }, 2800);
  };

  const handleColumnDecision = (col: string, decision: 'drop' | 'fill' | 'keep') => {
    handleColumnDecisionCached(col, decision);
  };

  const handleRerunWithDecisions = () => {
    if (!currentData || currentData.length === 0) return;
    setIsCleaningRunning(true);
    setTimeout(() => {
      const { cleanedData, summary } = runFullCleaningPipeline(currentData, columnDecisions);
      updateCleanedData(cleanedData, summary as unknown as Record<string, unknown>);
      setCleaningSummary(summary);
      setIsCleaningRunning(false);
      setActiveTab('summary');
      setDataProfile(profileData(cleanedData));
      toast({ title: 'Cleaning Complete', description: `Health Score: ${summary.healthScore}/100 — Decisions applied successfully.` });
      if (currentDataset) scanDataset(currentDataset.id, cleanedData);
    }, 500);
  };

  const handlePreviewFix = (column: string, type: string) => {
    const fix = getFixPreview(currentData, column, type);
    setPreviewFix({
      column, type, description: fix.description,
      before: fix.preview.before, after: fix.preview.after,
      affectedRows: fix.preview.affectedRows,
    });
  };

  const handleConfirmFix = (column: string, type: string) => {
    setConfirmFix({ column, type });
  };

  const removeIssueFromReport = (column: string, type: string) => {
    if (!report) return;
    const remaining = report.issues.filter(i => !(i.column === column && i.type === type));
    const newScore = remaining.length === 0 ? 100 : Math.min(100, report.overallScore + Math.round(10 / report.issues.length));
    setReport({ ...report, issues: remaining, overallScore: newScore });
  };

  const handleApplyFix = async (column: string, type: string) => {
    const newData = applyFix(currentData, column, type);
    updateCurrentData(newData);
    setPreviewFix(null);
    setConfirmFix(null);
    removeIssueFromReport(column, type);
    setMissingStrategy(s => { const n = { ...s }; delete n[column]; return n; });
    const remaining = report ? report.issues.filter(i => !(i.column === column && i.type === type)).length : 0;
    toast({ 
      title: 'Fix Applied', 
      description: remaining > 0 
        ? `Resolved ${type} in "${column}". ${remaining} issue${remaining > 1 ? 's' : ''} remaining.`
        : `Resolved ${type} in "${column}". All issues cleared.`
    });
    if (currentDataset) await scanDataset(currentDataset.id, newData);
  };

  const handleApplyMissingStrategy = async (column: string, strategy: string) => {
    let newData = [...currentData];
    const isNum = newData.some(r => typeof r[column] === 'number');
    const nonNullVals = newData.map(r => r[column]).filter(v => v !== null && v !== undefined && v !== '');
    
    if (strategy === 'remove') {
      newData = newData.filter(r => r[column] !== null && r[column] !== undefined && r[column] !== '');
    } else if (strategy === 'mean' && isNum) {
      const nums = nonNullVals.filter(v => typeof v === 'number') as number[];
      const mean = nums.reduce((a, b) => a + b, 0) / (nums.length || 1);
      newData = newData.map(r => (r[column] === null || r[column] === undefined || r[column] === '') ? { ...r, [column]: Math.round(mean * 100) / 100 } : r);
    } else if (strategy === 'median' && isNum) {
      const nums = (nonNullVals.filter(v => typeof v === 'number') as number[]).sort((a, b) => a - b);
      const mid = Math.floor(nums.length / 2);
      const median = nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
      newData = newData.map(r => (r[column] === null || r[column] === undefined || r[column] === '') ? { ...r, [column]: Math.round(median * 100) / 100 } : r);
    } else if (strategy === 'mode') {
      const freq: Record<string, number> = {};
      nonNullVals.forEach(v => { const k = String(v); freq[k] = (freq[k] || 0) + 1; });
      const mode = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
      const modeVal = isNum ? Number(mode) : mode;
      newData = newData.map(r => (r[column] === null || r[column] === undefined || r[column] === '') ? { ...r, [column]: modeVal } : r);
    }

    updateCurrentData(newData);
    removeIssueFromReport(column, 'missing');
    setMissingStrategy(s => { const n = { ...s }; delete n[column]; return n; });
    const remaining = report ? report.issues.filter(i => !(i.column === column && i.type === 'missing')).length : 0;
    toast({ 
      title: 'Missing Values Resolved', 
      description: remaining > 0
        ? `Applied "${strategy}" to "${column}". ${remaining} issue${remaining > 1 ? 's' : ''} remaining.`
        : `Applied "${strategy}" to "${column}". All issues cleared.`
    });
    if (currentDataset) await scanDataset(currentDataset.id, newData);
  };

  const handleFixAll = async () => {
    if (!report || !currentDataset) return;
    let data = [...currentData];
    const count = report.issues.length;
    for (const issue of report.issues) {
      data = applyFix(data, issue.column, issue.type);
    }
    updateCurrentData(data);
    setConfirmFixAll(false);
    setMissingStrategy({});
    setReport({ ...report, issues: [], overallScore: 100 });
    toast({ title: 'All Fixes Applied', description: `Resolved ${count} issue types successfully.` });
    await scanDataset(currentDataset.id, data);
  };

  const handleAIClean = () => {
    if (!report || report.issues.length === 0) {
      toast({ title: 'No issues', description: 'Data is clean. No AI cleaning needed.' });
      return;
    }
    const actions = report.issues.map(issue => {
      switch (issue.type) {
        case 'missing': return `• Fill ${issue.count} missing values in "${issue.column}" using median/mode imputation`;
        case 'duplicate': return `• Remove ${issue.count} duplicate entries in "${issue.column}", keeping first occurrence`;
        case 'outlier': return `• Cap ${issue.count} outliers in "${issue.column}" using IQR boundaries`;
        case 'invalid': return `• Convert ${issue.count} text-formatted numbers in "${issue.column}" to numeric type`;
        default: return `• Fix ${issue.count} ${issue.type} issues in "${issue.column}"`;
      }
    });
    setAiCleaningPreview(actions.join('\n'));
  };

  const handleApplyAIClean = async () => {
    if (!report || !currentDataset) return;
    let data = [...currentData];
    for (const issue of report.issues) {
      data = applyFix(data, issue.column, issue.type);
    }
    updateCurrentData(data);
    setAiCleaningPreview(null);
    toast({ title: 'AI Cleaning Complete', description: 'All issues resolved. Re-scanning...' });
    await scanDataset(currentDataset.id, data);
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-destructive';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-destructive';
  };

  const getGrade = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    return 'D';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default: return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const getSeverityBorder = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-l-destructive';
      case 'medium': return 'border-l-amber-500';
      default: return 'border-l-primary';
    }
  };

  // Filtered issues
  const filteredIssues = useMemo(() => {
    if (!report) return [];
    if (issueFilter === 'all') return report.issues;
    return report.issues.filter(i => i.severity === issueFilter);
  }, [report, issueFilter]);

  const issueCounts = useMemo(() => {
    if (!report) return { all: 0, high: 0, medium: 0, low: 0 };
    return {
      all: report.issues.length,
      high: report.issues.filter(i => i.severity === 'high').length,
      medium: report.issues.filter(i => i.severity === 'medium').length,
      low: report.issues.filter(i => i.severity === 'low').length,
    };
  }, [report]);

  // ─── RENDER ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Data Quality</h1>
          <p className="text-sm text-muted-foreground">Automated profiling, validation, and cleaning powered by an enterprise-grade pipeline</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={undo} disabled={!canUndo} title="Undo">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={redo} disabled={!canRedo} title="Redo">
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ═══════════ LEFT PANEL ═══════════ */}
        <div className="space-y-4">
          {/* Dataset Selector */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3"><CardTitle className="text-base">Select Dataset</CardTitle></CardHeader>
            <CardContent>
              {datasets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No datasets available.</p>
              ) : (
                <ScrollArea className="max-h-[180px]">
                  <div className="space-y-1.5">
                    {datasets.map(ds => (
                      <button key={ds.id} onClick={() => selectDataset(ds.id)}
                        className={cn("w-full p-2.5 rounded-lg text-left transition-all text-sm",
                          currentDataset?.id === ds.id ? "bg-primary/10 border border-primary/20 shadow-sm" : "hover:bg-muted/50")}>
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-medium truncate">{ds.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats Preview */}
          {currentDataset && quickStats && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />Quick Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: 'Rows', value: quickStats.rows.toLocaleString() },
                    { label: 'Columns', value: quickStats.cols.toLocaleString() },
                    { label: 'Total Cells', value: quickStats.totalCells.toLocaleString() },
                    { label: 'Est. Issues', value: `~${quickStats.estIssues}`, highlight: quickStats.estIssues > 0 },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className={cn("font-semibold", item.highlight ? "text-amber-500" : "text-foreground")}>{item.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* What Scan Checks */}
          {currentDataset && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Full Scan checks for:</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {QUALITY_CHECKS.map(check => (
                      <div key={check} className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span className="text-muted-foreground">{check}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Scan Button in Left Panel */}
          {currentDataset && currentData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="space-y-2">
                <Button onClick={handleScan} disabled={isScanning} className="w-full gap-2">
                  {isScanning ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Scanning...</>
                  ) : (
                    <><Shield className="h-4 w-4" />{report ? 'Re-Scan' : 'Scan Dataset'} ({getCreditCost('quality-scan')} credit)</>
                  )}
                </Button>
                <p className="text-[10px] text-center text-muted-foreground">
                  {report ? `Last scanned: ${new Date(report.scannedAt).toLocaleString()}` : 'Last scanned: Never'}
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* ═══════════ RIGHT PANEL ═══════════ */}
        <div className="lg:col-span-3 space-y-4">
          {!currentDataset ? (
            /* No Dataset Selected */
            <Card className="bg-card border-border">
              <CardContent className="py-16 text-center">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6"
                >
                  <Shield className="h-10 w-10 text-muted-foreground/50" />
                </motion.div>
                <h3 className="font-semibold text-lg">Select a Dataset</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Choose a dataset from the left panel to run quality analysis
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* ─── Header Card ─── */}
              <Card className="bg-card border-border overflow-hidden">
                <CardContent className="py-5">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
                        !report ? "bg-muted" :
                        report.overallScore >= 80 ? "bg-emerald-500/10" :
                        report.overallScore >= 50 ? "bg-amber-500/10" : "bg-destructive/10"
                      )}>
                        <Shield className={cn("h-7 w-7 transition-colors",
                          !report ? "text-muted-foreground" :
                          report.overallScore >= 80 ? "text-emerald-500" :
                          report.overallScore >= 50 ? "text-amber-500" : "text-destructive"
                        )} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{currentDataset.name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                          {isScanning ? (
                            <><Loader2 className="h-3 w-3 animate-spin text-primary" /><span className="text-primary">Scan in progress...</span></>
                          ) : report ? (
                            <><CheckCircle className="h-3 w-3 text-emerald-500" /><span>Scan complete · {report.issues.length} issues</span></>
                          ) : (
                            <span>Not scanned yet</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Score display when report exists */}
                    {report && !isScanning && (
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="flex items-baseline gap-1">
                            <span className={cn("text-4xl font-bold", getScoreColor(report.overallScore))}>{report.overallScore}</span>
                            <span className="text-sm text-muted-foreground">/100</span>
                          </div>
                          <Badge variant="secondary" className={cn("text-xs mt-0.5", getScoreColor(report.overallScore))}>
                            Grade {getGrade(report.overallScore)}
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <Button onClick={handleScan} disabled={isScanning} size="sm" className="gap-1.5">
                        {isScanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                        {report ? 'Re-Scan' : 'Scan'} ({getCreditCost('quality-scan')} credit)
                      </Button>
                      {currentData.length > 0 && (
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setFullCleanModalOpen(true)} disabled={isCleaningRunning}>
                          {isCleaningRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                          Full 8-Step Clean
                        </Button>
                      )}
                    </div>
                  </div>
                  {report && <Progress value={report.overallScore} className="h-2 mt-4" />}
                </CardContent>
              </Card>

              {/* ─── Scan Loading Animation ─── */}
              <AnimatePresence>
                {isScanning && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                    <Card className="bg-card border-primary/20 overflow-hidden">
                      <CardContent className="py-6">
                        <div className="flex flex-col items-center gap-4 mb-6">
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                            <Shield className="h-10 w-10 text-primary" />
                          </motion.div>
                          <div className="text-center">
                            <h3 className="font-semibold text-lg">Scanning {currentDataset.name}...</h3>
                            <p className="text-xs text-muted-foreground mt-1">{quickStats ? `${quickStats.totalCells} cells across ${quickStats.cols} columns` : ''}</p>
                          </div>
                        </div>
                        <div className="space-y-2 max-w-md mx-auto">
                          {SCAN_STEPS.map((step, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0.4 }}
                              animate={{ opacity: i <= scanStep ? 1 : 0.4 }}
                              className="flex items-center gap-3 text-sm"
                            >
                              {i < scanStep ? (
                                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                              ) : i === scanStep ? (
                                <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-border shrink-0" />
                              )}
                              <span className={cn(
                                i < scanStep ? "text-muted-foreground line-through" :
                                i === scanStep ? "text-foreground font-medium" : "text-muted-foreground"
                              )}>{step.icon} {step.label}...</span>
                            </motion.div>
                          ))}
                        </div>
                        <Progress value={(scanStep / SCAN_STEPS.length) * 100} className="h-1.5 mt-6 max-w-md mx-auto" />
                        <p className="text-[10px] text-muted-foreground text-center mt-2">~{Math.max(1, Math.round((SCAN_STEPS.length - scanStep) * 0.5))} seconds remaining</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ─── Cleaning Progress Animation ─── */}
              <AnimatePresence>
                {isCleaningRunning && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                    <Card className="bg-card border-primary/20 overflow-hidden">
                      <CardContent className="py-6">
                        <div className="flex flex-col items-center gap-4 mb-6">
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                            <Zap className="h-10 w-10 text-primary" />
                          </motion.div>
                          <h3 className="font-semibold text-lg">Running Full 8-Step Clean...</h3>
                        </div>
                        <div className="space-y-2 max-w-md mx-auto">
                          {CLEAN_STEPS.map((step, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0.4 }}
                              animate={{ opacity: i <= cleaningStep ? 1 : 0.4 }}
                              className="flex items-center gap-3 text-sm"
                            >
                              {i < cleaningStep ? (
                                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                              ) : i === cleaningStep ? (
                                <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-border shrink-0" />
                              )}
                              <span className={cn(
                                i < cleaningStep ? "text-muted-foreground" :
                                i === cleaningStep ? "text-foreground font-medium" : "text-muted-foreground"
                              )}>Step {step.step}: {step.label}</span>
                            </motion.div>
                          ))}
                        </div>
                        <Progress value={(cleaningStep / 8) * 100} className="h-1.5 mt-6 max-w-md mx-auto" />
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ─── Post-Scan Health Banner ─── */}
              <AnimatePresence>
                {showScanComplete && report && !isScanning && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                  >
                    <Card className={cn("border overflow-hidden",
                      report.overallScore >= 80 ? "bg-emerald-500/5 border-emerald-500/20" :
                      report.overallScore >= 50 ? "bg-amber-500/5 border-amber-500/20" :
                      "bg-destructive/5 border-destructive/20"
                    )}>
                      <CardContent className="py-5">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-4">
                            <Shield className={cn("h-8 w-8",
                              report.overallScore >= 80 ? "text-emerald-500" :
                              report.overallScore >= 50 ? "text-amber-500" : "text-destructive"
                            )} />
                            <div>
                              <p className="font-semibold flex items-center gap-2">
                                Scan Complete <CheckCircle className="h-4 w-4 text-emerald-500" />
                              </p>
                              <p className="text-sm text-muted-foreground">{currentDataset.name} scored {report.overallScore}/100</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={cn("text-5xl font-bold", getScoreColor(report.overallScore))}>{report.overallScore}</span>
                            <Badge variant="secondary" className={cn("ml-2 text-xs", getScoreColor(report.overallScore))}>
                              Grade {getGrade(report.overallScore)}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-4">
                          {[
                            { icon: '✅', label: `${quickStats?.nullCount || 0} Missing`, color: (quickStats?.nullCount || 0) === 0 ? 'text-emerald-500' : 'text-amber-500' },
                            { icon: '✅', label: `${quickStats?.dupeCount || 0} Duplicates`, color: (quickStats?.dupeCount || 0) === 0 ? 'text-emerald-500' : 'text-amber-500' },
                            { icon: '⚠️', label: `${report.issues.length} Issues`, color: report.issues.length === 0 ? 'text-emerald-500' : 'text-amber-500' },
                            { icon: '📊', label: `${quickStats?.cols || 0} Columns Profiled`, color: 'text-foreground' },
                          ].map(item => (
                            <Badge key={item.label} variant="outline" className={cn("text-xs gap-1", item.color)}>
                              {item.icon} {item.label}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* AI Cleaning Preview */}
              {aiCleaningPreview && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <p className="font-medium text-sm">AI Cleaning Plan</p>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">The AI will perform the following operations (all reversible with Undo):</p>
                        <pre className="text-xs text-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">{aiCleaningPreview}</pre>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => setAiCleaningPreview(null)}>Cancel</Button>
                        <Button size="sm" onClick={handleApplyAIClean} className="gap-1">
                          <Sparkles className="h-3 w-3" /> Apply AI Clean
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {previewFix && (
                <Card className="bg-chart-1/5 border-chart-1/20">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-sm">Preview Fix: {previewFix.type} in "{previewFix.column}"</p>
                        <pre className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{previewFix.description}</pre>
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div className="p-2 rounded bg-destructive/10 text-xs">
                            <span className="font-medium text-destructive">Before: </span>{previewFix.before}
                          </div>
                          <div className="p-2 rounded bg-emerald-500/10 text-xs">
                            <span className="font-medium text-emerald-600">After: </span>{previewFix.after}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">{previewFix.affectedRows} rows will be affected</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => setPreviewFix(null)}>Cancel</Button>
                        <Button size="sm" onClick={() => handleConfirmFix(previewFix.column, previewFix.type)} className="gap-1">
                          <Play className="h-3 w-3" /> Apply Fix
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ─── Action Bar ─── */}
              {report && report.issues.length > 0 && !isScanning && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={handleProfile} disabled={isProfileRunning} className="gap-1.5 text-xs">
                    {isProfileRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5" />}
                    Profile Data
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleAIClean} className="gap-1.5 text-xs">
                    <Sparkles className="h-3.5 w-3.5" />Clean using AI
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setConfirmFixAll(true)} className="gap-1.5 text-xs">
                    <Wand2 className="h-3.5 w-3.5" />Fix All ({report.issues.length})
                  </Button>
                </div>
              )}

              {/* ─── Tabs ─── */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full grid grid-cols-6">
                  <TabsTrigger value="profile" className="gap-1 text-xs">
                    <BarChart3 className="h-3 w-3" /> Profile
                  </TabsTrigger>
                  <TabsTrigger value="columns" className="gap-1 text-xs">
                    <Database className="h-3 w-3" /> Columns {cleaningSummary?.columnsNeedingDecision.length ? `(⚠️${cleaningSummary.columnsNeedingDecision.length})` : ''}
                  </TabsTrigger>
                  <TabsTrigger value="duplicates" className="gap-1 text-xs">
                    <FileText className="h-3 w-3" /> Duplicates {cleaningSummary?.duplicateReport ? `(${cleaningSummary.duplicateReport.totalIssues})` : ''}
                  </TabsTrigger>
                  <TabsTrigger value="validation" className="gap-1 text-xs">
                    <ShieldCheck className="h-3 w-3" /> Validation {cleaningSummary?.validationReport ? `(${cleaningSummary.validationReport.issues.length})` : ''}
                  </TabsTrigger>
                  <TabsTrigger value="issues" className="gap-1 text-xs">
                    <AlertTriangle className="h-3 w-3" /> Issues {report ? `(${report.issues.length})` : ''}
                  </TabsTrigger>
                  <TabsTrigger value="summary" className="gap-1 text-xs">
                    <ClipboardCheck className="h-3 w-3" /> Report
                  </TabsTrigger>
                </TabsList>

                {/* ═══════════ PROFILE TAB ═══════════ */}
                <TabsContent value="profile">
                  {!dataProfile ? (
                    <Card className="bg-card border-border">
                      <CardContent className="py-16 text-center">
                        <motion.div
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 3, repeat: Infinity }}
                          className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4"
                        >
                          <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
                        </motion.div>
                        <h3 className="font-semibold text-lg">Ready to profile your data</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                          DataVora will analyze all {quickStats?.cols || 0} columns with statistics, distributions, and anomaly detection
                        </p>
                        <Button onClick={handleProfile} disabled={isProfileRunning} className="mt-6 gap-2">
                          {isProfileRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                          Generate Data Profile
                        </Button>
                        <p className="text-[10px] text-muted-foreground mt-2">Takes ~2 seconds</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {/* Profile Summary */}
                      <Card className="bg-card border-border">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" /> Data Profile Report
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                            <div className="p-3 rounded-lg bg-muted/50 text-center">
                              <p className="text-2xl font-bold">{dataProfile.totalRows}</p>
                              <p className="text-xs text-muted-foreground">Total Rows</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 text-center">
                              <p className="text-2xl font-bold">{dataProfile.totalColumns}</p>
                              <p className="text-xs text-muted-foreground">Total Columns</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 text-center">
                              <p className="text-2xl font-bold">{dataProfile.totalMissing}</p>
                              <p className="text-xs text-muted-foreground">Missing ({dataProfile.totalMissingPct}%)</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 text-center">
                              <p className="text-2xl font-bold">{dataProfile.duplicateRows}</p>
                              <p className="text-xs text-muted-foreground">Duplicate Rows</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 text-center">
                              <p className="text-2xl font-bold">{dataProfile.columns.filter(c => c.type === 'number').length}</p>
                              <p className="text-xs text-muted-foreground">Numeric</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 text-center">
                              <p className="text-2xl font-bold">{dataProfile.columns.filter(c => c.type === 'string').length}</p>
                              <p className="text-xs text-muted-foreground">Text</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 text-center">
                              <p className="text-2xl font-bold">{dataProfile.issuesFound}</p>
                              <p className="text-xs text-muted-foreground">Issues Found</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 text-center col-span-1">
                               <p className={cn("text-2xl font-bold", dataProfile.issuesFound === 0 ? "text-emerald-500" : "text-amber-500")}>
                                 {dataProfile.issuesFound === 0 ? 'Pass' : 'Review'}
                               </p>
                              <p className="text-xs text-muted-foreground">Status</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Column Cards Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {dataProfile.columns.map((col, i) => {
                          const isNumeric = col.type === 'number';
                          const numericValues = isNumeric && currentData.length > 0
                            ? currentData.map(r => r[col.name]).filter(v => typeof v === 'number' && !isNaN(v as number)) as number[]
                            : [];
                          return (
                            <motion.div
                              key={col.name}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.03 }}
                            >
                              <Card className="bg-card border-border hover:border-primary/30 transition-colors">
                                <CardContent className="p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                      {isNumeric ? (
                                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                          <Hash className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                      ) : (
                                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                          <Type className="h-3.5 w-3.5 text-emerald-500" />
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold truncate">{col.name}</p>
                                        <Badge variant="outline" className="text-[9px] h-4 capitalize">{col.type}</Badge>
                                      </div>
                                    </div>
                                    {col.missingCount > 0 && (
                                      <Badge variant="destructive" className="text-[9px] h-4 shrink-0">{col.missingPct}% null</Badge>
                                    )}
                                  </div>

                                  {isNumeric ? (
                                    <>
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                        <div className="flex justify-between"><span className="text-muted-foreground">Min</span><span className="font-mono">{col.min?.toLocaleString()}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Max</span><span className="font-mono">{col.max?.toLocaleString()}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Mean</span><span className="font-mono">{col.mean}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Std</span><span className="font-mono">{col.stdDev}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Nulls</span><span className="font-mono">{col.missingPct}%</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Outliers</span><span className="font-mono">{col.outlierCount ?? 0}</span></div>
                                      </div>
                                      {numericValues.length > 0 && (
                                        <div className="pt-1">
                                          <MiniHistogram values={numericValues} />
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <div className="space-y-1 text-xs">
                                      <div className="flex justify-between"><span className="text-muted-foreground">Unique</span><span className="font-mono">{col.uniqueCount}</span></div>
                                      <div className="flex justify-between"><span className="text-muted-foreground">Empty</span><span className="font-mono">{col.missingPct}%</span></div>
                                      {col.sampleValues && col.sampleValues.length > 0 && (
                                        <div className="pt-1">
                                          <p className="text-muted-foreground mb-1">Top values:</p>
                                          {col.sampleValues.slice(0, 3).map((v, j) => (
                                            <p key={j} className="truncate font-mono text-[10px]">"{v}"</p>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* First & Last 5 Rows */}
                      {dataProfile.firstFiveRows.length > 0 && (
                        <Card className="bg-card border-border">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">👀 First 5 Rows</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-border">
                                    {Object.keys(dataProfile.firstFiveRows[0]).slice(0, 8).map(k => (
                                      <th key={k} className="text-left p-1.5 font-medium text-muted-foreground truncate max-w-24">{k}</th>
                                    ))}
                                    {Object.keys(dataProfile.firstFiveRows[0]).length > 8 && <th className="p-1.5 text-muted-foreground">...</th>}
                                  </tr>
                                </thead>
                                <tbody>
                                  {dataProfile.firstFiveRows.map((row, i) => (
                                    <tr key={i} className="border-b border-border/30">
                                      {Object.values(row).slice(0, 8).map((v, j) => (
                                        <td key={j} className="p-1.5 truncate max-w-24">{v === null ? <span className="text-destructive">null</span> : String(v)}</td>
                                      ))}
                                      {Object.values(row).length > 8 && <td className="p-1.5 text-muted-foreground">...</td>}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {dataProfile.lastFiveRows.length > 0 && (
                        <Card className="bg-card border-border">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">👀 Last 5 Rows</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-border">
                                    {Object.keys(dataProfile.lastFiveRows[0]).slice(0, 8).map(k => (
                                      <th key={k} className="text-left p-1.5 font-medium text-muted-foreground truncate max-w-24">{k}</th>
                                    ))}
                                    {Object.keys(dataProfile.lastFiveRows[0]).length > 8 && <th className="p-1.5 text-muted-foreground">...</th>}
                                  </tr>
                                </thead>
                                <tbody>
                                  {dataProfile.lastFiveRows.map((row, i) => (
                                    <tr key={i} className="border-b border-border/30">
                                      {Object.values(row).slice(0, 8).map((v, j) => (
                                        <td key={j} className="p-1.5 truncate max-w-24">{v === null ? <span className="text-destructive">null</span> : String(v)}</td>
                                      ))}
                                      {Object.values(row).length > 8 && <td className="p-1.5 text-muted-foreground">...</td>}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* ═══════════ COLUMN ANALYSIS TAB ═══════════ */}
                <TabsContent value="columns">
                  {!cleaningSummary ? (
                    <Card className="bg-card border-border">
                      <CardContent className="py-12 text-center">
                        <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-medium">No Column Analysis Yet</h3>
                        <p className="text-sm text-muted-foreground mt-1">Click "Full 8-Step Clean" to analyze all columns</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      <Card className="bg-card border-border">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Empty Column Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-border">
                                  <th className="text-left p-2 font-medium text-muted-foreground">Column</th>
                                  <th className="text-right p-2 font-medium text-muted-foreground">Empty%</th>
                                  <th className="text-right p-2 font-medium text-muted-foreground">Unique</th>
                                  <th className="text-left p-2 font-medium text-muted-foreground">Action</th>
                                  <th className="text-left p-2 font-medium text-muted-foreground">Reason</th>
                                  <th className="text-left p-2 font-medium text-muted-foreground">Scenario</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cleaningSummary.columnAnalysis.map((col, i) => (
                                  <tr key={i} className={cn("border-b border-border/30", col.action === 'WARN_USER' && "bg-amber-500/5")}>
                                    <td className="p-2 font-medium">{col.column}</td>
                                    <td className="p-2 text-right">
                                      <span className={cn(
                                        col.emptyPct === 0 ? "text-emerald-500" :
                                        col.emptyPct >= 70 ? "text-destructive" :
                                        col.emptyPct >= 50 ? "text-amber-500" : "text-muted-foreground"
                                      )}>{col.emptyPct}%</span>
                                    </td>
                                    <td className="p-2 text-right">{col.uniqueValues}</td>
                                    <td className="p-2">
                                      <Badge variant={
                                        col.action === 'AUTO_DROP' ? 'destructive' :
                                        col.action === 'WARN_USER' ? 'outline' :
                                        col.action === 'KEEP_FILL' ? 'default' : 'secondary'
                                      } className="text-xs">
                                         {col.action === 'AUTO_DROP' ? 'DROP' :
                                          col.action === 'WARN_USER' ? 'DECIDE' :
                                          col.action === 'KEEP_FILL' ? 'FILL' : 'CLEAN'}
                                      </Badge>
                                    </td>
                                    <td className="p-2 text-muted-foreground">{col.reason}</td>
                                    <td className="p-2 text-muted-foreground">{col.scenario}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3 text-xs">
                            <span>Dropped: {cleaningSummary.columnAnalysis.filter(c => c.action === 'AUTO_DROP').length}</span>
                            <span className="text-amber-500">Pending Decision: {cleaningSummary.columnAnalysis.filter(c => c.action === 'WARN_USER').length}</span>
                            <span>To Fill: {cleaningSummary.columnAnalysis.filter(c => c.action === 'KEEP_FILL').length}</span>
                            <span>Clean: {cleaningSummary.columnAnalysis.filter(c => c.action === 'KEEP_CLEAN').length}</span>
                          </div>
                        </CardContent>
                      </Card>

                      {cleaningSummary.columnsNeedingDecision.length > 0 && (
                        <Card className="bg-amber-500/5 border-amber-500/20">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Columns Requiring Your Decision</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-muted-foreground mb-4">
                              These columns are 50-70% empty. Choose what to do with each, then click "Re-run with Decisions".
                            </p>
                            <div className="space-y-3">
                              {cleaningSummary.columnsNeedingDecision.map(col => {
                                const analysis = cleaningSummary.columnAnalysis.find(c => c.column === col);
                                return (
                                  <div key={col} className="p-3 rounded-lg border border-border bg-card">
                                    <p className="text-sm font-medium mb-1">
                                      Column "{col}" is {analysis?.emptyPct ?? '?'}% empty ({analysis?.emptyCount ?? '?'} of {analysis?.totalRows ?? '?'} rows)
                                    </p>
                                    <p className="text-xs text-muted-foreground mb-3">Should I:</p>
                                    <div className="flex flex-wrap gap-2">
                                      <Button size="sm" variant={columnDecisions[col] === 'drop' ? 'default' : 'outline'} className="text-xs h-7" onClick={() => handleColumnDecision(col, 'drop')}>
                                        A) Drop column entirely
                                      </Button>
                                      <Button size="sm" variant={columnDecisions[col] === 'fill' ? 'default' : 'outline'} className="text-xs h-7" onClick={() => handleColumnDecision(col, 'fill')}>
                                        B) Fill with median/mode
                                      </Button>
                                      <Button size="sm" variant={columnDecisions[col] === 'keep' ? 'default' : 'outline'} className="text-xs h-7" onClick={() => handleColumnDecision(col, 'keep')}>
                                        C) Keep as is
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <Button
                              className="mt-4 gap-2 w-full"
                              disabled={cleaningSummary.columnsNeedingDecision.some(c => !columnDecisions[c]) || isCleaningRunning}
                              onClick={handleRerunWithDecisions}
                            >
                              {isCleaningRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                              Re-run Cleaning with Your Decisions
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* ═══════════ DUPLICATES TAB ═══════════ */}
                <TabsContent value="duplicates">
                  {!cleaningSummary?.duplicateReport ? (
                    <Card className="bg-card border-border">
                      <CardContent className="py-12 text-center">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-medium">No Duplicate Analysis Yet</h3>
                        <p className="text-sm text-muted-foreground mt-1">Click "Full 8-Step Clean" to run comprehensive duplicate detection</p>
                      </CardContent>
                    </Card>
                  ) : (() => {
                    const dr = cleaningSummary.duplicateReport!;
                    return (
                      <div className="space-y-4">
                        <Card className="bg-primary/5 border-primary/20">
                          <CardContent className="py-4 text-center">
                            <p className="text-lg font-bold tracking-wide uppercase">Duplicate Analysis Report</p>
                          </CardContent>
                        </Card>

                        <Card className="bg-card border-border">
                          <CardContent className="py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                              <div className="p-3 rounded-lg bg-destructive/10">
                                <p className="text-2xl font-bold text-destructive">{dr.fullDuplicates}</p>
                                <p className="text-xs text-muted-foreground">Full Duplicates</p>
                              </div>
                              <div className="p-3 rounded-lg bg-amber-500/10">
                                <p className="text-2xl font-bold text-amber-600">{Object.values(dr.partialDuplicates).reduce((a, b) => a + b, 0)}</p>
                                <p className="text-xs text-muted-foreground">Partial Duplicates</p>
                              </div>
                              <div className="p-3 rounded-lg bg-amber-500/10">
                                <p className="text-2xl font-bold text-amber-600">{dr.caseDuplicates + dr.whitespaceDuplicates + dr.formatDuplicates}</p>
                                <p className="text-xs text-muted-foreground">Case / Space / Format</p>
                              </div>
                              <div className="p-3 rounded-lg bg-amber-500/10">
                                <p className="text-2xl font-bold text-amber-600">{dr.typoDuplicates.reduce((a, t) => a + t.groups.length, 0)}</p>
                                <p className="text-xs text-muted-foreground">Typo Groups</p>
                              </div>
                              <div className="p-3 rounded-lg bg-amber-500/10">
                                <p className="text-2xl font-bold text-amber-600">{dr.duplicateColumns.length}</p>
                                <p className="text-xs text-muted-foreground">Duplicate Columns</p>
                              </div>
                              <div className="p-3 rounded-lg bg-orange-500/10">
                                <p className="text-2xl font-bold text-orange-600">{dr.nearDuplicates.length}</p>
                                <p className="text-xs text-muted-foreground">Near Duplicates</p>
                              </div>
                              <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                                <p className="text-2xl font-bold">{dr.totalIssues}</p>
                                <p className="text-xs text-muted-foreground">Total Issues Found</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-card border-border">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Scenario Breakdown</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-border">
                                    <th className="text-left p-2 font-medium text-muted-foreground">Scenario</th>
                                    <th className="text-right p-2 font-medium text-muted-foreground">Count</th>
                                    <th className="text-left p-2 font-medium text-muted-foreground">Details</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {dr.scenarios.map((s, i) => (
                                    <tr key={i} className="border-b border-border/30">
                                      <td className="p-2 font-medium">{s.name}</td>
                                      <td className="p-2 text-right">
                                        <Badge variant={s.count > 0 ? 'destructive' : 'secondary'} className="text-xs">{s.count}</Badge>
                                      </td>
                                      <td className="p-2 text-muted-foreground">{s.description}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </Card>

                        {dr.nearDuplicates.length > 0 && (
                          <Card className="bg-card border-border">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Near-Duplicate Rows (Similarity &gt; 80%)</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-border">
                                      <th className="text-left p-2 font-medium text-muted-foreground">Row A</th>
                                      <th className="text-left p-2 font-medium text-muted-foreground">Row B</th>
                                      <th className="text-right p-2 font-medium text-muted-foreground">Similarity</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {dr.nearDuplicates.slice(0, 20).map((nd, i) => (
                                      <tr key={i} className="border-b border-border/30">
                                        <td className="p-2">Row {nd.row1 + 1}</td>
                                        <td className="p-2">Row {nd.row2 + 1}</td>
                                        <td className="p-2 text-right font-bold text-orange-600">{nd.similarity}%</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        <Card className="bg-card border-border">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">✅ Actions Taken</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-1">
                              {dr.actions.map((a, i) => (
                                <li key={i} className="text-xs text-muted-foreground">• {a}</li>
                              ))}
                            </ul>
                            <div className="mt-4 flex gap-4 text-xs">
                              <span>📊 Rows before: {cleaningSummary.rowsBefore}</span>
                              <span>📊 Rows after: {cleaningSummary.rowsAfter}</span>
                              <span>📊 Columns before: {cleaningSummary.colsBefore}</span>
                              <span>📊 Columns after: {cleaningSummary.colsAfter}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })()}
                </TabsContent>

                {/* ═══════════ VALIDATION TAB ═══════════ */}
                <TabsContent value="validation">
                  {!cleaningSummary?.validationReport ? (
                    <Card className="bg-card border-border">
                      <CardContent className="py-12 text-center">
                        <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-medium">No Validation Report Yet</h3>
                        <p className="text-sm text-muted-foreground mt-1">Click "Full 8-Step Clean" to run comprehensive validation</p>
                      </CardContent>
                    </Card>
                  ) : (() => {
                    const vr = cleaningSummary.validationReport!;
                    return (
                      <div className="space-y-4">
                        <Card className="bg-primary/5 border-primary/20">
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center text-primary-foreground font-bold text-2xl",
                                  vr.letterGrade === 'A' ? 'bg-emerald-500' : vr.letterGrade === 'B' ? 'bg-chart-1' : vr.letterGrade === 'C' ? 'bg-amber-500' : 'bg-destructive'
                                )}>
                                  {vr.letterGrade}
                                </div>
                                <div>
                                  <p className="text-lg font-bold">Validation Score: {vr.validationScore}/100</p>
                                  <p className="text-sm text-muted-foreground">
                                    {vr.letterGrade === 'A' ? 'Excellent — data is clean and valid' :
                                     vr.letterGrade === 'B' ? 'Good — minor issues remain' :
                                     vr.letterGrade === 'C' ? 'Fair — several issues need attention' :
                                     'Poor — significant data quality issues'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">{vr.issues.length} issues</p>
                                <p className="text-xs text-muted-foreground">{cleaningSummary.validationFixCount} auto-fixed</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-card border-border">
                          <CardHeader className="pb-3"><CardTitle className="text-base">Completeness — {vr.completeness.overall}%</CardTitle></CardHeader>
                          <CardContent>
                            <Progress value={vr.completeness.overall} className="h-3 mb-3" />
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {Object.entries(vr.completeness.perColumn).slice(0, 12).map(([col, pct]) => (
                                <div key={col} className="flex justify-between p-2 rounded bg-muted/30">
                                  <span className="truncate mr-2">{col}</span>
                                  <span className={cn("font-mono", pct < 60 ? "text-destructive" : pct < 80 ? "text-amber-500" : "text-emerald-500")}>{pct}%</span>
                                </div>
                              ))}
                            </div>
                            {vr.completeness.lowRows > 0 && (
                              <p className="text-xs text-amber-500 mt-2">{vr.completeness.lowRows} rows have less than 50% completeness</p>
                            )}
                          </CardContent>
                        </Card>

                        {vr.issues.length > 0 && (
                          <Card className="bg-card border-border">
                            <CardHeader className="pb-3"><CardTitle className="text-base">Validation Issues ({vr.issues.length})</CardTitle></CardHeader>
                            <CardContent>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-border">
                                      <th className="text-left p-2 font-medium text-muted-foreground">Category</th>
                                      <th className="text-left p-2 font-medium text-muted-foreground">Column</th>
                                      <th className="text-left p-2 font-medium text-muted-foreground">Type</th>
                                      <th className="text-left p-2 font-medium text-muted-foreground">Severity</th>
                                      <th className="text-right p-2 font-medium text-muted-foreground">Count</th>
                                      <th className="text-left p-2 font-medium text-muted-foreground">Description</th>
                                      <th className="text-left p-2 font-medium text-muted-foreground">Fixable</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {vr.issues.map((iss, i) => (
                                      <tr key={i} className="border-b border-border/30">
                                        <td className="p-2">{iss.category}</td>
                                        <td className="p-2 font-medium">{iss.column}</td>
                                        <td className="p-2"><Badge variant="outline" className="text-xs">{iss.type}</Badge></td>
                                        <td className="p-2">
                                          <Badge variant={iss.severity === 'high' ? 'destructive' : iss.severity === 'medium' ? 'outline' : 'secondary'} className="text-xs capitalize">{iss.severity}</Badge>
                                        </td>
                                        <td className="p-2 text-right font-bold">{iss.count}</td>
                                        <td className="p-2 text-muted-foreground">{iss.description}</td>
                                        <td className="p-2">{iss.autoFixable ? <Badge variant="secondary" className="text-xs">Auto</Badge> : <Badge variant="outline" className="text-xs">Manual</Badge>}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {vr.distribution.length > 0 && (
                          <Card className="bg-card border-border">
                            <CardHeader className="pb-3"><CardTitle className="text-base">Distribution Analysis</CardTitle></CardHeader>
                            <CardContent>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-border">
                                      <th className="text-left p-2 font-medium text-muted-foreground">Column</th>
                                      <th className="text-right p-2 font-medium text-muted-foreground">Skewness</th>
                                      <th className="text-right p-2 font-medium text-muted-foreground">Kurtosis</th>
                                      <th className="text-left p-2 font-medium text-muted-foreground">Dominant Value</th>
                                      <th className="text-right p-2 font-medium text-muted-foreground">Dominant %</th>
                                      <th className="text-right p-2 font-medium text-muted-foreground">Rare Categories</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {vr.distribution.map((d, i) => (
                                      <tr key={i} className="border-b border-border/30">
                                        <td className="p-2 font-medium">{d.column}</td>
                                        <td className="p-2 text-right">
                                          <span className={cn(Math.abs(d.skewness) > 2 ? "text-amber-500" : "")}>{d.skewness || '—'}</span>
                                        </td>
                                        <td className="p-2 text-right">{d.kurtosis || '—'}</td>
                                        <td className="p-2 text-muted-foreground">{d.dominantValue || '—'}</td>
                                        <td className="p-2 text-right">
                                          {d.dominantPct ? <span className={cn(d.dominantPct > 95 ? "text-destructive" : d.dominantPct > 80 ? "text-amber-500" : "")}>{d.dominantPct}%</span> : '—'}
                                        </td>
                                        <td className="p-2 text-right">{d.rareCategories ?? '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {vr.uniqueness.length > 0 && (
                          <Card className="bg-card border-border">
                            <CardHeader className="pb-3"><CardTitle className="text-base">Uniqueness Check</CardTitle></CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {vr.uniqueness.map((u, i) => (
                                  <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30 text-xs">
                                    <span className="font-medium">{u.column}</span>
                                     {u.isUnique ? (
                                       <Badge variant="secondary" className="text-xs">Unique</Badge>
                                     ) : (
                                       <Badge variant="destructive" className="text-xs">{u.duplicateCount} duplicates</Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {vr.columnNameIssues.length > 0 && (
                          <Card className="bg-card border-border">
                            <CardHeader className="pb-3"><CardTitle className="text-base">Column Name Fixes</CardTitle></CardHeader>
                            <CardContent>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-border">
                                      <th className="text-left p-2 font-medium text-muted-foreground">Original</th>
                                      <th className="text-left p-2 font-medium text-muted-foreground">Fixed</th>
                                      <th className="text-left p-2 font-medium text-muted-foreground">Reason</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {vr.columnNameIssues.map((c, i) => (
                                      <tr key={i} className="border-b border-border/30">
                                        <td className="p-2 text-destructive">{c.original}</td>
                                        <td className="p-2 text-emerald-500">{c.fixed}</td>
                                        <td className="p-2 text-muted-foreground">{c.reason}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {cleaningSummary.validationFixDetails.length > 0 && (
                          <Card className="bg-emerald-500/5 border-emerald-500/20">
                            <CardContent className="py-4">
                              <h4 className="font-medium text-sm mb-2">Auto-Fixes Applied ({cleaningSummary.validationFixCount})</h4>
                              <ul className="space-y-1">
                                {cleaningSummary.validationFixDetails.map((d, i) => (
                                  <li key={i} className="text-xs text-muted-foreground">{d}</li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    );
                  })()}
                </TabsContent>

                {/* ═══════════ ISSUES TAB ═══════════ */}
                <TabsContent value="issues">
                  {!report ? (
                    <Card className="bg-card border-border">
                      <CardContent className="py-16 text-center">
                        <motion.div
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 3, repeat: Infinity }}
                          className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4"
                        >
                          <Shield className="h-8 w-8 text-muted-foreground/50" />
                        </motion.div>
                        <h3 className="font-semibold text-lg">Ready to scan your data</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                          DataVora will check your dataset across 20 quality dimensions and give you an actionable report
                        </p>
                        <Button onClick={handleScan} disabled={isScanning} className="mt-6 gap-2">
                          {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                          Start Quality Scan
                        </Button>
                        <p className="text-[10px] text-muted-foreground mt-2">Uses {getCreditCost('quality-scan')} credit · Takes ~5 seconds</p>
                      </CardContent>
                    </Card>
                  ) : report.issues.length === 0 ? (
                    <Card className="bg-card border-border">
                      <CardContent className="py-8 text-center">
                        <CheckCircle className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
                        <h3 className="font-medium">No Issues Found!</h3>
                        <p className="text-sm text-muted-foreground mt-1">Your data quality is excellent.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {/* Issue Filter Bar */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h3 className="font-semibold text-base flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                          {report.issues.length} Issues Found
                        </h3>
                        <div className="flex items-center gap-1.5">
                          {(['all', 'high', 'medium', 'low'] as const).map(sev => (
                            <Button
                              key={sev}
                              variant={issueFilter === sev ? 'default' : 'outline'}
                              size="sm"
                              className="text-xs h-7 gap-1"
                              onClick={() => setIssueFilter(sev)}
                            >
                              {sev === 'high' && <AlertCircle className="h-3 w-3 text-destructive" />}
                              {sev === 'medium' && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                              {sev === 'low' && <Info className="h-3 w-3 text-primary" />}
                              {sev === 'all' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1)} ({issueCounts[sev]})
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Issue Cards */}
                      <div className="space-y-3">
                        {filteredIssues.map((issue, idx) => (
                          <motion.div
                            key={`${issue.column}-${issue.type}`}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                          >
                            <Card className={cn("bg-card border-border border-l-4 overflow-hidden", getSeverityBorder(issue.severity))}>
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-3 flex-1">
                                    {getSeverityIcon(issue.severity)}
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant={
                                          issue.severity === 'high' ? 'destructive' :
                                          issue.severity === 'medium' ? 'outline' : 'secondary'
                                        } className="text-[10px] capitalize">{issue.severity}</Badge>
                                        <span className="font-medium text-sm">{issue.column}</span>
                                        <Badge variant="outline" className="text-[10px] capitalize">{issue.type}</Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground mt-1">{issue.count} occurrences ({issue.percentage}%)</p>
                                      <p className="text-xs mt-2 text-muted-foreground italic">{issue.suggestion}</p>
                                      {issue.reasoning && (
                                        <p className="text-xs mt-1 text-muted-foreground/70">{issue.reasoning}</p>
                                      )}

                                      {/* Missing value strategy selector */}
                                      {issue.type === 'missing' && (
                                        <div className="mt-3 p-3 rounded-lg bg-muted/50 space-y-2">
                                          <Label className="text-xs font-medium">Choose fix strategy:</Label>
                                          <div className="flex flex-wrap gap-2">
                                            <Select value={missingStrategy[issue.column] || ''} onValueChange={v => setMissingStrategy(s => ({ ...s, [issue.column]: v }))}>
                                              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                                              <SelectContent className="bg-popover">
                                                <SelectItem value="remove">Remove rows</SelectItem>
                                                <SelectItem value="mean">Fill with Mean</SelectItem>
                                                <SelectItem value="median">Fill with Median</SelectItem>
                                                <SelectItem value="mode">Fill with Mode</SelectItem>
                                              </SelectContent>
                                            </Select>
                                            {missingStrategy[issue.column] && (
                                              <Button size="sm" className="h-8 text-xs gap-1"
                                                onClick={() => handleApplyMissingStrategy(issue.column, missingStrategy[issue.column])}>
                                                <Play className="h-3 w-3" />Apply
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handlePreviewFix(issue.column, issue.type)}>
                                      <Eye className="h-3 w-3" /> Preview
                                    </Button>
                                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleConfirmFix(issue.column, issue.type)}>
                                      <Wand2 className="h-3 w-3" /> Fix
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* ═══════════ REPORT TAB ═══════════ */}
                <TabsContent value="summary">
                  {!cleaningSummary ? (
                    <Card className="bg-card border-border">
                      <CardContent className="py-12 text-center">
                        <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-medium">No Cleaning Report Yet</h3>
                        <p className="text-sm text-muted-foreground mt-1">Click "Full 8-Step Clean" to run the complete pipeline</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {/* Banner */}
                      <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <p className="text-lg font-bold tracking-wide uppercase">Data Cleaning Complete</p>
                            <div className="flex items-center gap-3">
                              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-primary-foreground font-bold text-xl",
                                cleaningSummary.letterGrade === 'A' ? 'bg-emerald-500' : cleaningSummary.letterGrade === 'B' ? 'bg-chart-1' : cleaningSummary.letterGrade === 'C' ? 'bg-amber-500' : 'bg-destructive'
                              )}>
                                {cleaningSummary.letterGrade}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {cleaningSummary.timeTakenMs < 1000 ? `${cleaningSummary.timeTakenMs}ms` : `${(cleaningSummary.timeTakenMs / 1000).toFixed(1)}s`}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Changelog */}
                      {(() => {
                        const totalChanges = cleaningSummary.steps.reduce((a, s) => a + s.changesMade, 0);
                        const allDetails = cleaningSummary.steps.flatMap(s => s.details.map(d => ({ ...d, stepName: s.name, stepNum: s.step, stepIcon: s.icon })));
                        return (
                          <Card className="bg-card border-border">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                What Changed — {totalChanges} total changes across {cleaningSummary.steps.filter(s => s.changesMade > 0).length} steps
                              </CardTitle>
                              <p className="text-xs text-muted-foreground">Every change made to your data, step by step. Nothing is hidden.</p>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                                {cleaningSummary.duplicatesRemoved > 0 && (
                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-xs">
                                    <span className="font-bold text-destructive">{cleaningSummary.duplicatesRemoved}</span>
                                    <span className="text-muted-foreground">duplicate rows removed</span>
                                  </div>
                                )}
                                {cleaningSummary.missingFixed > 0 && (
                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 text-xs">
                                    <span className="font-bold text-amber-600">{cleaningSummary.missingFixed}</span>
                                    <span className="text-muted-foreground">missing values filled</span>
                                  </div>
                                )}
                                {cleaningSummary.outliersCapped > 0 && (
                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-chart-1/10 text-xs">
                                    <span className="font-bold text-chart-1">{cleaningSummary.outliersCapped}</span>
                                    <span className="text-muted-foreground">outliers capped</span>
                                  </div>
                                )}
                                {cleaningSummary.columnsDropped > 0 && (
                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted text-xs">
                                    <span className="font-bold text-foreground">{cleaningSummary.columnsDropped}</span>
                                    <span className="text-muted-foreground">useless columns dropped</span>
                                  </div>
                                )}
                                {cleaningSummary.typesFixed > 0 && (
                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 text-xs">
                                    <span className="font-bold text-primary">{cleaningSummary.typesFixed}</span>
                                    <span className="text-muted-foreground">type conversions</span>
                                  </div>
                                )}
                                {cleaningSummary.textStandardized > 0 && (
                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 text-xs">
                                    <span className="font-bold text-emerald-600">{cleaningSummary.textStandardized}</span>
                                    <span className="text-muted-foreground">text values standardized</span>
                                  </div>
                                )}
                              </div>

                              <div className="overflow-x-auto border border-border rounded-lg">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-muted/50 border-b border-border">
                                      <th className="text-left p-2.5 font-semibold text-foreground w-8">#</th>
                                      <th className="text-left p-2.5 font-semibold text-foreground">Pipeline Step</th>
                                      <th className="text-left p-2.5 font-semibold text-foreground">What We Did</th>
                                      <th className="text-right p-2.5 font-semibold text-foreground">Rows Before</th>
                                      <th className="text-right p-2.5 font-semibold text-foreground">Rows After</th>
                                      <th className="text-right p-2.5 font-semibold text-foreground">Changes</th>
                                      <th className="text-center p-2.5 font-semibold text-foreground">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {cleaningSummary.steps.map((step, i) => (
                                      <tr key={i} className={cn("border-b border-border/50", step.changesMade > 0 ? "bg-primary/[0.02]" : "")}>
                                        <td className="p-2.5 font-mono text-muted-foreground">{step.step}</td>
                                        <td className="p-2.5 font-medium">
                                          <span className="mr-1.5">{step.icon}</span>{step.name}
                                        </td>
                                        <td className="p-2.5 text-muted-foreground max-w-[300px]">
                                          {step.actions.length > 0 ? step.actions[0] : 'No changes needed'}
                                          {step.actions.length > 1 && (
                                            <span className="text-primary ml-1">+{step.actions.length - 1} more</span>
                                          )}
                                        </td>
                                        <td className="p-2.5 text-right font-mono">{step.rowsBefore.toLocaleString()}</td>
                                        <td className="p-2.5 text-right font-mono">
                                          {step.rowsAfter.toLocaleString()}
                                          {step.rowsBefore !== step.rowsAfter && (
                                            <span className="text-destructive ml-1">(-{(step.rowsBefore - step.rowsAfter).toLocaleString()})</span>
                                          )}
                                        </td>
                                        <td className="p-2.5 text-right">
                                          <Badge variant={step.changesMade > 0 ? 'default' : 'outline'} className="text-[10px]">
                                            {step.changesMade}
                                          </Badge>
                                        </td>
                                        <td className="p-2.5 text-center">
                                          {step.changesMade > 0 ? (
                                            <CheckCircle className="h-4 w-4 text-emerald-500 inline" />
                                          ) : (
                                            <span className="text-muted-foreground">—</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="bg-muted/30 font-medium">
                                      <td className="p-2.5" colSpan={3}>Total</td>
                                      <td className="p-2.5 text-right font-mono">{cleaningSummary.rowsBefore.toLocaleString()}</td>
                                      <td className="p-2.5 text-right font-mono">{cleaningSummary.rowsAfter.toLocaleString()}</td>
                                      <td className="p-2.5 text-right">
                                        <Badge className="text-[10px]">{totalChanges}</Badge>
                                      </td>
                                      <td className="p-2.5 text-center">
                                        <CheckCircle className="h-4 w-4 text-emerald-500 inline" />
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>

                              {allDetails.length > 0 && (
                                <div className="mt-4">
                                  <p className="text-xs font-semibold text-foreground mb-2">Detailed Before → After (sample changes)</p>
                                  <div className="overflow-x-auto border border-border rounded-lg max-h-[300px] overflow-y-auto">
                                    <table className="w-full text-xs">
                                      <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                                        <tr className="border-b border-border">
                                          <th className="text-left p-2 font-semibold text-foreground">Step</th>
                                          <th className="text-left p-2 font-semibold text-foreground">Column</th>
                                          <th className="text-left p-2 font-semibold text-foreground">Before</th>
                                          <th className="text-left p-2 font-semibold text-foreground">After</th>
                                          <th className="text-left p-2 font-semibold text-foreground">Action Taken</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {allDetails.slice(0, 100).map((d, j) => (
                                          <tr key={j} className="border-b border-border/30 hover:bg-muted/30">
                                            <td className="p-2 text-muted-foreground whitespace-nowrap">
                                              <span className="mr-1">{d.stepIcon}</span>{d.stepName}
                                            </td>
                                            <td className="p-2 font-medium">{d.column}</td>
                                            <td className="p-2">
                                              <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-mono">{d.before || '(empty)'}</span>
                                            </td>
                                            <td className="p-2">
                                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-mono">{d.after || '(removed)'}</span>
                                            </td>
                                            <td className="p-2 text-muted-foreground">{d.action}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    {allDetails.length > 100 && (
                                      <p className="text-[10px] text-muted-foreground text-center py-2">Showing first 100 of {allDetails.length} changes</p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })()}

                      {/* Health Score */}
                      <Card className="bg-card border-border">
                        <CardContent className="py-6">
                          <div className="flex items-center gap-6 mb-4">
                            <div className={cn("w-20 h-20 rounded-full flex items-center justify-center",
                              getScoreBg(cleaningSummary.healthScore))}>
                              <span className="text-3xl font-bold text-primary-foreground">{cleaningSummary.healthScore}</span>
                            </div>
                            <div>
                              <h3 className="text-lg font-bold">Data Health Score: {cleaningSummary.healthScore}/100 (Grade {cleaningSummary.letterGrade})</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                 {cleaningSummary.letterGrade === 'A' ? 'Excellent — your data is analysis-ready.' :
                                  cleaningSummary.letterGrade === 'B' ? 'Good — minor improvements recommended.' :
                                  cleaningSummary.letterGrade === 'C' ? 'Fair — review the flagged issues below.' :
                                  'Needs attention — significant quality issues detected.'}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {cleaningSummary.healthBreakdown.map((item, i) => (
                              <div key={i} className="flex items-center gap-3">
                                <span className="text-xs w-36 text-muted-foreground">{item.label}</span>
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className={cn("h-full rounded-full transition-all", item.score >= item.max ? "bg-emerald-500" : item.score >= item.max * 0.7 ? "bg-amber-500" : "bg-destructive")}
                                    style={{ width: `${(item.score / item.max) * 100}%` }} 
                                  />
                                </div>
                                <span className="text-xs font-mono w-12 text-right">{item.score}/{item.max}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Flagged Rows */}
                      {cleaningSummary.flaggedRows.length > 0 && (
                        <Card className="bg-card border-border">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Flagged Values — Requires Manual Review</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-border">
                                    <th className="text-left p-1.5 font-medium text-muted-foreground">Row</th>
                                    <th className="text-left p-1.5 font-medium text-muted-foreground">Column</th>
                                    <th className="text-left p-1.5 font-medium text-muted-foreground">Value</th>
                                    <th className="text-left p-1.5 font-medium text-muted-foreground">Reason</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {cleaningSummary.flaggedRows.map((f, i) => (
                                    <tr key={i} className="border-b border-border/30">
                                      <td className="p-1.5">Row {f.row}</td>
                                      <td className="p-1.5 font-medium">{f.column}</td>
                                      <td className="p-1.5 text-amber-500">{f.value}</td>
                                      <td className="p-1.5 text-muted-foreground">{f.reason}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Warnings & Recommendations */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {cleaningSummary.warnings.length > 0 && (
                          <Card className="bg-card border-border">
                            <CardContent className="py-4">
                              <h4 className="font-medium text-sm mb-3">Warnings</h4>
                              <div className="space-y-2">
                                {cleaningSummary.warnings.map((w, i) => (
                                  <p key={i} className="text-xs text-amber-500">• {w}</p>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        <Card className="bg-card border-border">
                          <CardContent className="py-4">
                            <h4 className="font-medium text-sm mb-3">Recommendations</h4>
                            <div className="space-y-2">
                              {cleaningSummary.recommendations.map((r, i) => (
                                <p key={i} className="text-xs text-muted-foreground">• {r}</p>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Features Added */}
                      {cleaningSummary.featuresAdded.length > 0 && (
                        <Card className="bg-card border-border">
                          <CardContent className="py-4">
                            <h4 className="font-medium text-sm mb-2">Engineered Features ({cleaningSummary.featuresAdded.length})</h4>
                            <div className="flex flex-wrap gap-2">
                              {cleaningSummary.featuresAdded.map((f, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>

      {/* ═══════════ FULL CLEAN MODAL ═══════════ */}
      <Dialog open={fullCleanModalOpen} onOpenChange={setFullCleanModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" />Full Data Cleaning</DialogTitle>
            <DialogDescription>Review the 8-step pipeline before running</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-2">
            {CLEAN_STEPS.map(step => (
              <div key={step.step} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">{step.step}</div>
                <div>
                  <p className="text-sm font-medium">{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-3 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Create backup before cleaning</Label>
              <Switch checked={cleanOptions.backup} onCheckedChange={v => setCleanOptions(o => ({ ...o, backup: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Show detailed log</Label>
              <Switch checked={cleanOptions.detailedLog} onCheckedChange={v => setCleanOptions(o => ({ ...o, detailedLog: v }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFullCleanModalOpen(false)}>Cancel</Button>
            <Button onClick={handleFullClean} className="gap-1.5">
              <Zap className="h-4 w-4" />Start Full Clean (3 credits)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fix Confirmation Dialog */}
      <AlertDialog open={!!confirmFix} onOpenChange={() => setConfirmFix(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Fix?</AlertDialogTitle>
            <AlertDialogDescription>
              This will fix {confirmFix?.type} issues in column "{confirmFix?.column}". The operation is reversible using Undo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmFix && handleApplyFix(confirmFix.column, confirmFix.type)}>
              Apply Fix
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fix All Confirmation Dialog */}
      <AlertDialog open={confirmFixAll} onOpenChange={setConfirmFixAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fix All Issues?</AlertDialogTitle>
            <AlertDialogDescription>
              This will apply fixes for all {report?.issues.length} issue types. All changes are reversible using Undo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFixAll}>Fix All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
