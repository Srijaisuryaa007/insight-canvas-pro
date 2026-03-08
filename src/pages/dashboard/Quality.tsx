import { useState } from 'react';
import { 
  Shield, AlertTriangle, CheckCircle, Loader2, Wand2, Database, Eye, Play, Undo2, Redo2, Sparkles,
  BarChart3, FileText, Zap, ClipboardCheck, ShieldCheck, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useData } from '@/contexts/DataContext';
import { useDataQuality } from '@/hooks/useDataQuality';
import { useSubscription } from '@/hooks/useSubscription';
import { profileData, DataProfile } from '@/lib/dataProfiler';
import { runFullCleaningPipeline, CleaningSummary, ColumnAnalysis } from '@/lib/dataCleaner';
import { DuplicateReport } from '@/lib/duplicateEngine';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// Module-level cache to persist across tab switches
let cachedProfile: DataProfile | null = null;
let cachedSummary: CleaningSummary | null = null;
let cachedActiveTab: string = 'issues';
let cachedColumnDecisions: Record<string, 'drop' | 'fill' | 'keep'> = {};

export default function Quality() {
  const { datasets, currentDataset, currentData, selectDataset, updateCurrentData, undo, redo, canUndo, canRedo } = useData();
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

  // Missing value strategy state
  const [missingStrategy, setMissingStrategy] = useState<Record<string, string>>({});

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
    setIsCleaningRunning(true);
    setTimeout(() => {
      const { cleanedData, summary } = runFullCleaningPipeline(currentData, columnDecisions);
      updateCurrentData(cleanedData);
      setCleaningSummary(summary);
      setIsCleaningRunning(false);
      // If columns need decisions, show analysis tab first
      if (summary.columnsNeedingDecision.length > 0) {
        setActiveTab('columns');
        toast({ title: 'Action Required', description: `${summary.columnsNeedingDecision.length} columns are 50–70% empty and require your decision.` });
      } else {
        setActiveTab('summary');
        toast({ title: 'Cleaning Complete', description: `Health Score: ${summary.healthScore}/100 — ${summary.steps.reduce((a, s) => a + s.changesMade, 0)} changes applied` });
      }
      setDataProfile(profileData(cleanedData));
      if (currentDataset) scanDataset(currentDataset.id, cleanedData);
    }, 500);
  };

  const handleColumnDecision = (col: string, decision: 'drop' | 'fill' | 'keep') => {
    handleColumnDecisionCached(col, decision);
  };

  const handleRerunWithDecisions = () => {
    if (!currentData || currentData.length === 0) return;
    setIsCleaningRunning(true);
    setTimeout(() => {
      const { cleanedData, summary } = runFullCleaningPipeline(currentData, columnDecisions);
      updateCurrentData(cleanedData);
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

  // Helper: remove fixed issue from report immediately (optimistic)
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
    // Remove fixed issue immediately from UI
    removeIssueFromReport(column, type);
    // Clear strategy for this column
    setMissingStrategy(s => { const n = { ...s }; delete n[column]; return n; });
    const remaining = report ? report.issues.filter(i => !(i.column === column && i.type === type)).length : 0;
    toast({ 
      title: 'Fix Applied', 
      description: remaining > 0 
        ? `Resolved ${type} in "${column}". ${remaining} issue${remaining > 1 ? 's' : ''} remaining.`
        : `Resolved ${type} in "${column}". All issues cleared.`
    });
    // Re-scan in background to get accurate report
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
    // Clear all issues immediately
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

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default: return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Quality</h1>
          <p className="text-muted-foreground">Automated profiling, validation, and cleaning powered by an enterprise-grade pipeline</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={undo} disabled={!canUndo} title="Undo">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={redo} disabled={!canRedo} title="Redo">
            <Redo2 className="h-4 w-4" />
          </Button>
          {currentDataset && currentData.length > 0 && (
            <>
              <Button variant="outline" onClick={handleProfile} disabled={isProfileRunning} className="gap-2">
                {isProfileRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                Profile Data
              </Button>
              <Button variant="outline" onClick={handleFullClean} disabled={isCleaningRunning} className="gap-2">
                {isCleaningRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Full 8-Step Clean
              </Button>
            </>
          )}
          {report && report.issues.length > 0 && (
            <>
              <Button variant="outline" onClick={handleAIClean} className="gap-2">
                <Sparkles className="h-4 w-4" />Clean using AI
              </Button>
              <Button variant="outline" onClick={() => setConfirmFixAll(true)} className="gap-2">
                <Wand2 className="h-4 w-4" />Fix All ({report.issues.length})
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base">Select Dataset</CardTitle></CardHeader>
          <CardContent>
            {datasets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No datasets available.</p>
            ) : (
              <div className="space-y-2">
                {datasets.map(ds => (
                  <button key={ds.id} onClick={() => selectDataset(ds.id)}
                    className={cn("w-full p-3 rounded-lg text-left transition-colors",
                      currentDataset?.id === ds.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted")}>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{ds.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {!currentDataset ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg">Select a Dataset</h3>
                <p className="text-muted-foreground text-sm mt-1">Choose a dataset to run quality scan</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="bg-card border-border">
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-16 h-16 rounded-full flex items-center justify-center",
                        report ? getScoreBg(report.overallScore) : "bg-muted")}>
                        {report ? (
                          <span className="text-2xl font-bold text-primary-foreground">{report.overallScore}</span>
                        ) : (
                          <Shield className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{currentDataset.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {report ? `Score: ${report.overallScore}% • ${report.issues.length} issues` : 'Not scanned yet'}
                        </p>
                      </div>
                    </div>
                    <Button onClick={handleScan} disabled={isScanning} className="gap-2">
                      {isScanning ? (
                        <><Loader2 className="h-4 w-4 animate-spin" />Scanning...</>
                      ) : (
                        <><Shield className="h-4 w-4" />{report ? 'Re-Scan' : 'Scan'} ({getCreditCost('quality-scan')} credits)</>
                      )}
                    </Button>
                  </div>
                  {report && <Progress value={report.overallScore} className="h-2 mt-4" />}
                </CardContent>
              </Card>

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

              {/* Tabs for Profile / Columns / Issues / Summary */}
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

                {/* COLUMN ANALYSIS TAB */}
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

                          {/* Summary counts */}
                          <div className="mt-4 flex flex-wrap gap-3 text-xs">
                            <span>Dropped: {cleaningSummary.columnAnalysis.filter(c => c.action === 'AUTO_DROP').length}</span>
                            <span className="text-amber-500">Pending Decision: {cleaningSummary.columnAnalysis.filter(c => c.action === 'WARN_USER').length}</span>
                            <span>To Fill: {cleaningSummary.columnAnalysis.filter(c => c.action === 'KEEP_FILL').length}</span>
                            <span>Clean: {cleaningSummary.columnAnalysis.filter(c => c.action === 'KEEP_CLEAN').length}</span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* User decision prompts for 50-70% empty columns */}
                      {cleaningSummary.columnsNeedingDecision.length > 0 && (
                        <Card className="bg-amber-500/5 border-amber-500/20">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">⚠️ Columns Needing Your Decision</CardTitle>
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
                                      <Button
                                        size="sm"
                                        variant={columnDecisions[col] === 'drop' ? 'default' : 'outline'}
                                        className="text-xs h-7"
                                        onClick={() => handleColumnDecision(col, 'drop')}
                                      >
                                        A) Drop column entirely
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant={columnDecisions[col] === 'fill' ? 'default' : 'outline'}
                                        className="text-xs h-7"
                                        onClick={() => handleColumnDecision(col, 'fill')}
                                      >
                                        B) Fill with median/mode
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant={columnDecisions[col] === 'keep' ? 'default' : 'outline'}
                                        className="text-xs h-7"
                                        onClick={() => handleColumnDecision(col, 'keep')}
                                      >
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
                            {cleaningSummary.columnsNeedingDecision.some(c => !columnDecisions[c]) && (
                              <p className="text-xs text-muted-foreground mt-2 text-center">
                                Please make a choice for all {cleaningSummary.columnsNeedingDecision.length} columns to continue
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* DUPLICATES TAB */}
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
                        {/* Banner */}
                        <Card className="bg-primary/5 border-primary/20">
                          <CardContent className="py-4 text-center">
                            <p className="text-lg font-bold">╔══ DUPLICATE ANALYSIS REPORT ══╗</p>
                          </CardContent>
                        </Card>

                        {/* Summary Grid */}
                        <Card className="bg-card border-border">
                          <CardContent className="py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                              <div className="p-3 rounded-lg bg-destructive/10">
                                <p className="text-2xl font-bold text-destructive">{dr.fullDuplicates}</p>
                                <p className="text-xs text-muted-foreground">🔴 Full Duplicates</p>
                              </div>
                              <div className="p-3 rounded-lg bg-amber-500/10">
                                <p className="text-2xl font-bold text-amber-600">{Object.values(dr.partialDuplicates).reduce((a, b) => a + b, 0)}</p>
                                <p className="text-xs text-muted-foreground">🟡 Partial Duplicates</p>
                              </div>
                              <div className="p-3 rounded-lg bg-amber-500/10">
                                <p className="text-2xl font-bold text-amber-600">{dr.caseDuplicates + dr.whitespaceDuplicates + dr.formatDuplicates}</p>
                                <p className="text-xs text-muted-foreground">🟡 Case/Space/Format</p>
                              </div>
                              <div className="p-3 rounded-lg bg-amber-500/10">
                                <p className="text-2xl font-bold text-amber-600">{dr.typoDuplicates.reduce((a, t) => a + t.groups.length, 0)}</p>
                                <p className="text-xs text-muted-foreground">🟡 Typo Groups</p>
                              </div>
                              <div className="p-3 rounded-lg bg-amber-500/10">
                                <p className="text-2xl font-bold text-amber-600">{dr.duplicateColumns.length}</p>
                                <p className="text-xs text-muted-foreground">🟡 Duplicate Columns</p>
                              </div>
                              <div className="p-3 rounded-lg bg-orange-500/10">
                                <p className="text-2xl font-bold text-orange-600">{dr.nearDuplicates.length}</p>
                                <p className="text-xs text-muted-foreground">🟠 Near Duplicates</p>
                              </div>
                              <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                                <p className="text-2xl font-bold">{dr.totalIssues}</p>
                                <p className="text-xs text-muted-foreground">Total Issues Found</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Detailed Breakdown */}
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
                                    <th className="text-left p-2 font-medium text-muted-foreground">Type</th>
                                    <th className="text-right p-2 font-medium text-muted-foreground">Count</th>
                                    <th className="text-left p-2 font-medium text-muted-foreground">Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="border-b border-border/30">
                                    <td className="p-2">1. Full Duplicates</td>
                                    <td className="p-2">🔴 Exact row copies</td>
                                    <td className="p-2 text-right font-bold">{dr.fullDuplicates}</td>
                                    <td className="p-2">{dr.fullDuplicates > 0 ? '✅ Removed (kept 1 each)' : '—'}</td>
                                  </tr>
                                  {Object.entries(dr.partialDuplicates).map(([col, count]) => (
                                    <tr key={col} className="border-b border-border/30">
                                      <td className="p-2">2. Partial Duplicate</td>
                                      <td className="p-2">🟡 Same {col}</td>
                                      <td className="p-2 text-right font-bold">{count}</td>
                                      <td className="p-2">✅ Removed (keep='first')</td>
                                    </tr>
                                  ))}
                                  <tr className="border-b border-border/30">
                                    <td className="p-2">3. Case Duplicates</td>
                                    <td className="p-2">🟡 Different casing</td>
                                    <td className="p-2 text-right font-bold">{dr.caseDuplicates}</td>
                                    <td className="p-2">{dr.caseDuplicates > 0 ? '✅ Standardized + removed' : '—'}</td>
                                  </tr>
                                  <tr className="border-b border-border/30">
                                    <td className="p-2">4. Whitespace Duplicates</td>
                                    <td className="p-2">🟡 Extra spaces</td>
                                    <td className="p-2 text-right font-bold">{dr.whitespaceDuplicates}</td>
                                    <td className="p-2">{dr.whitespaceDuplicates > 0 ? '✅ Stripped + removed' : '—'}</td>
                                  </tr>
                                  {dr.typoDuplicates.map((t, i) => (
                                    <tr key={i} className="border-b border-border/30">
                                      <td className="p-2">5. Typo Duplicates</td>
                                      <td className="p-2">🟡 "{t.column}" ({t.groups.length} groups)</td>
                                      <td className="p-2 text-right font-bold">{t.groups.reduce((a, g) => a + g.similar.length, 0)}</td>
                                      <td className="p-2">✅ Merged to canonical</td>
                                    </tr>
                                  ))}
                                  <tr className="border-b border-border/30">
                                    <td className="p-2">6. Format Duplicates</td>
                                    <td className="p-2">🟡 Phone/date formats</td>
                                    <td className="p-2 text-right font-bold">{dr.formatDuplicates}</td>
                                    <td className="p-2">{dr.formatDuplicates > 0 ? '✅ Normalized + removed' : '—'}</td>
                                  </tr>
                                  {dr.duplicateColumns.map((dc, i) => (
                                    <tr key={i} className="border-b border-border/30">
                                      <td className="p-2">7. Duplicate Columns</td>
                                      <td className="p-2">🟡 "{dc.col1}" = "{dc.col2}"</td>
                                      <td className="p-2 text-right font-bold">1</td>
                                      <td className="p-2">✅ Dropped "{dc.col2}"</td>
                                    </tr>
                                  ))}
                                  <tr className="border-b border-border/30">
                                    <td className="p-2">8. Near Duplicates</td>
                                    <td className="p-2">🟠 ≥90% similar rows</td>
                                    <td className="p-2 text-right font-bold">{dr.nearDuplicates.length}</td>
                                    <td className="p-2">{dr.nearDuplicates.length > 0 ? '⚠️ Flagged for review' : '—'}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Typo Groups Detail */}
                        {dr.typoDuplicates.length > 0 && (
                          <Card className="bg-card border-border">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">🔤 Typo Groups Merged</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {dr.typoDuplicates.flatMap(t => t.groups.map((g, i) => (
                                  <div key={`${t.column}-${i}`} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/30">
                                    <Badge variant="outline" className="text-xs">{t.column}</Badge>
                                    <span className="font-medium">"{g.original}"</span>
                                    <span className="text-muted-foreground">←</span>
                                    {g.similar.map((s, j) => (
                                      <Badge key={j} variant="secondary" className="text-xs">"{s}" ({g.score}%)</Badge>
                                    ))}
                                  </div>
                                )))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Near Duplicates Detail */}
                        {dr.nearDuplicates.length > 0 && (
                          <Card className="bg-card border-border">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">🟠 Near Duplicate Rows (Needs Review)</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-xs text-muted-foreground mb-3">These rows are ≥90% similar but NOT identical. Review before removing.</p>
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
                                    {dr.nearDuplicates.map((nd, i) => (
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

                        {/* Actions Log */}
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

                {/* VALIDATION TAB */}
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
                        {/* Validation Score Banner */}
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

                        {/* Completeness */}
                        <Card className="bg-card border-border">
                          <CardHeader className="pb-3"><CardTitle className="text-base">📊 Completeness: {vr.completeness.overall}%</CardTitle></CardHeader>
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
                              <p className="text-xs text-amber-500 mt-2">⚠️ {vr.completeness.lowRows} rows have less than 50% completeness</p>
                            )}
                          </CardContent>
                        </Card>

                        {/* Validation Issues */}
                        {vr.issues.length > 0 && (
                          <Card className="bg-card border-border">
                            <CardHeader className="pb-3"><CardTitle className="text-base">🔍 Validation Issues ({vr.issues.length})</CardTitle></CardHeader>
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
                                        <td className="p-2">{iss.autoFixable ? '✅ Auto' : '⚠️ Manual'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Distribution */}
                        {vr.distribution.length > 0 && (
                          <Card className="bg-card border-border">
                            <CardHeader className="pb-3"><CardTitle className="text-base">📈 Distribution Analysis</CardTitle></CardHeader>
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

                        {/* Uniqueness */}
                        {vr.uniqueness.length > 0 && (
                          <Card className="bg-card border-border">
                            <CardHeader className="pb-3"><CardTitle className="text-base">🔑 Uniqueness Check</CardTitle></CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {vr.uniqueness.map((u, i) => (
                                  <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30 text-xs">
                                    <span className="font-medium">{u.column}</span>
                                    {u.isUnique ? (
                                      <Badge variant="secondary" className="text-xs">✅ Unique</Badge>
                                    ) : (
                                      <Badge variant="destructive" className="text-xs">❌ {u.duplicateCount} duplicates</Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Column Name Issues */}
                        {vr.columnNameIssues.length > 0 && (
                          <Card className="bg-card border-border">
                            <CardHeader className="pb-3"><CardTitle className="text-base">📝 Column Name Fixes</CardTitle></CardHeader>
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

                        {/* Auto-fix details */}
                        {cleaningSummary.validationFixDetails.length > 0 && (
                          <Card className="bg-emerald-500/5 border-emerald-500/20">
                            <CardContent className="py-4">
                              <h4 className="font-medium text-sm mb-2">✅ Auto-Fixes Applied ({cleaningSummary.validationFixCount})</h4>
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

                <TabsContent value="profile">
                  {!dataProfile ? (
                    <Card className="bg-card border-border">
                      <CardContent className="py-12 text-center">
                        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-medium">No Profile Yet</h3>
                        <p className="text-sm text-muted-foreground mt-1">Click "Profile Data" to generate a full data profile report</p>
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
                              <p className="text-2xl font-bold">{dataProfile.issuesFound}</p>
                              <p className="text-xs text-muted-foreground">Issues Found</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 text-center">
                              <p className="text-2xl font-bold">{dataProfile.memoryEstimateKB.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">~KB Memory</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 text-center col-span-2">
                              <p className={cn("text-2xl font-bold", dataProfile.issuesFound === 0 ? "text-emerald-500" : "text-amber-500")}>
                                {dataProfile.issuesFound === 0 ? '✅' : '⚠️'}
                              </p>
                              <p className="text-xs text-muted-foreground">Status</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Column Details */}
                      <Card className="bg-card border-border">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Column Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border">
                                  <th className="text-left p-2 font-medium text-muted-foreground">Column</th>
                                  <th className="text-left p-2 font-medium text-muted-foreground">Type</th>
                                  <th className="text-right p-2 font-medium text-muted-foreground">Missing</th>
                                  <th className="text-right p-2 font-medium text-muted-foreground">Unique</th>
                                  <th className="text-right p-2 font-medium text-muted-foreground">Min</th>
                                  <th className="text-right p-2 font-medium text-muted-foreground">Max</th>
                                  <th className="text-right p-2 font-medium text-muted-foreground">Mean</th>
                                  <th className="text-right p-2 font-medium text-muted-foreground">Median</th>
                                  <th className="text-right p-2 font-medium text-muted-foreground">Std Dev</th>
                                  <th className="text-right p-2 font-medium text-muted-foreground">Outliers</th>
                                  <th className="text-left p-2 font-medium text-muted-foreground">Samples</th>
                                </tr>
                              </thead>
                              <tbody>
                                {dataProfile.columns.map((col, i) => (
                                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                                    <td className="p-2 font-medium">{col.name}</td>
                                    <td className="p-2">
                                      <Badge variant="outline" className="text-xs capitalize">{col.type}</Badge>
                                    </td>
                                    <td className="p-2 text-right">
                                      {col.missingCount > 0 ? (
                                        <span className="text-destructive">{col.missingCount} ({col.missingPct}%)</span>
                                      ) : (
                                        <span className="text-emerald-500">0</span>
                                      )}
                                    </td>
                                    <td className="p-2 text-right">{col.uniqueCount}</td>
                                    <td className="p-2 text-right text-muted-foreground">
                                      {col.min !== undefined ? col.min.toLocaleString() : col.dateMin || '—'}
                                    </td>
                                    <td className="p-2 text-right text-muted-foreground">
                                      {col.max !== undefined ? col.max.toLocaleString() : col.dateMax || '—'}
                                    </td>
                                    <td className="p-2 text-right text-muted-foreground">{col.mean !== undefined ? col.mean : '—'}</td>
                                    <td className="p-2 text-right text-muted-foreground">{col.median !== undefined ? col.median : '—'}</td>
                                    <td className="p-2 text-right text-muted-foreground">{col.stdDev !== undefined ? col.stdDev : '—'}</td>
                                    <td className="p-2 text-right">
                                      {col.outlierCount !== undefined && col.outlierCount > 0 ? (
                                        <span className="text-amber-500">{col.outlierCount}</span>
                                      ) : '—'}
                                    </td>
                                    <td className="p-2 text-muted-foreground text-xs max-w-32 truncate">
                                      {col.sampleValues?.slice(0, 3).join(', ') || '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>

                      {/* First & Last 5 Rows Preview */}
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

                {/* ISSUES TAB */}
                <TabsContent value="issues">
                  {!report ? (
                    <Card className="bg-card border-border">
                      <CardContent className="py-12 text-center">
                        <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-medium">No Scan Results</h3>
                        <p className="text-sm text-muted-foreground mt-1">Click "Scan" to detect quality issues</p>
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
                    <Card className="bg-card border-border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-amber-500" />Issues ({report.issues.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {report.issues.map((issue, idx) => (
                            <div key={idx} className="p-4 rounded-lg border border-border bg-muted/30">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                  {getSeverityIcon(issue.severity)}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium">{issue.column}</span>
                                      <Badge variant="outline" className="text-xs capitalize">{issue.type}</Badge>
                                      <Badge variant="outline" className={cn("text-xs capitalize",
                                        issue.severity === 'high' ? 'border-destructive text-destructive' :
                                        issue.severity === 'medium' ? 'border-amber-500 text-amber-600' : ''
                                      )}>{issue.severity}</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">{issue.count} occurrences ({issue.percentage}%)</p>
                                    <p className="text-sm mt-2">💡 {issue.suggestion}</p>

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
                                  <Button variant="outline" size="sm" className="gap-1" onClick={() => handlePreviewFix(issue.column, issue.type)}>
                                    <Eye className="h-3 w-3" /> Preview
                                  </Button>
                                  <Button variant="outline" size="sm" className="gap-1" onClick={() => handleConfirmFix(issue.column, issue.type)}>
                                    <Wand2 className="h-3 w-3" /> Auto Fix
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* CLEANING REPORT TAB */}
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
                            <p className="text-lg font-bold">╔══ DATA CLEANING COMPLETE ✅ ══╗</p>
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

                      {/* Health Score with breakdown */}
                      <Card className="bg-card border-border">
                        <CardContent className="py-6">
                          <div className="flex items-center gap-6 mb-4">
                            <div className={cn("w-20 h-20 rounded-full flex items-center justify-center",
                              getScoreBg(cleaningSummary.healthScore))}>
                              <span className="text-3xl font-bold text-primary-foreground">{cleaningSummary.healthScore}</span>
                            </div>
                            <div>
                              <h3 className="text-lg font-bold">📈 Data Health Score: {cleaningSummary.healthScore}/100 (Grade: {cleaningSummary.letterGrade})</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {cleaningSummary.letterGrade === 'A' ? 'Excellent! Your data is analysis-ready.' :
                                 cleaningSummary.letterGrade === 'B' ? 'Good quality. Minor improvements possible.' :
                                 cleaningSummary.letterGrade === 'C' ? 'Fair quality. Review issues flagged below.' :
                                 'Needs attention. Significant issues found.'}
                              </p>
                            </div>
                          </div>
                          {/* Score breakdown */}
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

                      {/* Summary Stats */}
                      <Card className="bg-card border-border">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">📊 Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground">Rows</p>
                              <p className="font-bold">{cleaningSummary.rowsBefore} → {cleaningSummary.rowsAfter}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground">Columns</p>
                              <p className="font-bold">{cleaningSummary.colsBefore} → {cleaningSummary.colsAfter}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground">✅ Missing Fixed</p>
                              <p className="font-bold">{cleaningSummary.missingFixed} values</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground">✅ Duplicates Removed</p>
                              <p className="font-bold">{cleaningSummary.duplicatesRemoved} rows (kept 1 each)</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground">✅ Types Fixed</p>
                              <p className="font-bold">{cleaningSummary.typesFixed} values</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground">✅ Outliers Capped</p>
                              <p className="font-bold">{cleaningSummary.outliersCapped} values</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground">✅ Text Standardized</p>
                              <p className="font-bold">{cleaningSummary.textStandardized} values</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground">✅ Columns Dropped / Features Added</p>
                              <p className="font-bold">{cleaningSummary.columnsDropped} dropped / {cleaningSummary.featuresAdded.length} added</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Step-by-step Details with tables */}
                      <Card className="bg-card border-border">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">🔧 Step-by-Step Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {cleaningSummary.steps.map((step, i) => (
                              <div key={i} className="p-4 rounded-lg border border-border bg-muted/10">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-sm">
                                    {step.icon} Step {step.step}: {step.name}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {step.rowsBefore !== step.rowsAfter && (
                                      <span className="text-xs text-muted-foreground">{step.rowsBefore} → {step.rowsAfter} rows</span>
                                    )}
                                    <Badge variant={step.changesMade > 0 ? 'default' : 'outline'} className="text-xs">
                                      {step.changesMade} changes
                                    </Badge>
                                  </div>
                                </div>
                                <ul className="space-y-1 mb-2">
                                  {step.actions.map((action, j) => (
                                    <li key={j} className="text-xs text-muted-foreground">• {action}</li>
                                  ))}
                                </ul>
                                {/* Detail table */}
                                {step.details && step.details.length > 0 && (
                                  <div className="mt-2 overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-border">
                                          <th className="text-left p-1.5 font-medium text-muted-foreground">Column</th>
                                          <th className="text-left p-1.5 font-medium text-muted-foreground">Before</th>
                                          <th className="text-left p-1.5 font-medium text-muted-foreground">After</th>
                                          <th className="text-left p-1.5 font-medium text-muted-foreground">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {step.details.map((d, j) => (
                                          <tr key={j} className="border-b border-border/30">
                                            <td className="p-1.5 font-medium">{d.column}</td>
                                            <td className="p-1.5 text-destructive">{d.before}</td>
                                            <td className="p-1.5 text-emerald-500">{d.after}</td>
                                            <td className="p-1.5 text-muted-foreground">{d.action}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Flagged Rows */}
                      {cleaningSummary.flaggedRows.length > 0 && (
                        <Card className="bg-card border-border">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">⚠️ Flagged Values (Not Capped — Needs Review)</CardTitle>
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
                              <h4 className="font-medium text-sm mb-3">⚠️ Warnings</h4>
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
                            <h4 className="font-medium text-sm mb-3">💡 Recommendations for Analysis</h4>
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
                            <h4 className="font-medium text-sm mb-2">⚡ New Features Added ({cleaningSummary.featuresAdded.length})</h4>
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
