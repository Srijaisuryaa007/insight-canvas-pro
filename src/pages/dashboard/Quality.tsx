import { useState } from 'react';
import { 
  Shield, AlertTriangle, CheckCircle, Loader2, Wand2, Database, Eye, Play, Undo2, Redo2, Sparkles,
  BarChart3, FileText, Zap, ClipboardCheck
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
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export default function Quality() {
  const { datasets, currentDataset, currentData, selectDataset, updateCurrentData, undo, redo, canUndo, canRedo } = useData();
  const { isScanning, report, scanDataset, getFixPreview, applyFix, setReport } = useDataQuality();
  const { getCreditCost } = useSubscription();
  const [previewFix, setPreviewFix] = useState<{ column: string; type: string; description: string; before: string; after: string; affectedRows: number } | null>(null);
  const [confirmFix, setConfirmFix] = useState<{ column: string; type: string } | null>(null);
  const [confirmFixAll, setConfirmFixAll] = useState(false);
  const [aiCleaningPreview, setAiCleaningPreview] = useState<string | null>(null);
  const [dataProfile, setDataProfile] = useState<DataProfile | null>(null);
  const [cleaningSummary, setCleaningSummary] = useState<CleaningSummary | null>(null);
  const [isProfileRunning, setIsProfileRunning] = useState(false);
  const [isCleaningRunning, setIsCleaningRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('issues');

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
      toast({ title: '📊 Data Profile Complete', description: `${profile.totalRows} rows, ${profile.totalColumns} columns, ${profile.issuesFound} issues found` });
    }, 300);
  };

  const handleFullClean = () => {
    if (!currentData || currentData.length === 0) {
      toast({ title: 'No Data', description: 'Upload a dataset first.', variant: 'destructive' });
      return;
    }
    setIsCleaningRunning(true);
    setTimeout(() => {
      const { cleanedData, summary } = runFullCleaningPipeline(currentData);
      updateCurrentData(cleanedData);
      setCleaningSummary(summary);
      setIsCleaningRunning(false);
      setActiveTab('summary');
      // Re-profile after cleaning
      setDataProfile(profileData(cleanedData));
      toast({ title: '✅ Full Cleaning Complete', description: `Health Score: ${summary.healthScore}/100 | ${summary.steps.reduce((a, s) => a + s.changesMade, 0)} changes made` });
      // Re-scan
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
      title: '✅ Fix Applied', 
      description: remaining > 0 
        ? `Fixed ${type} in "${column}". ${remaining} issue${remaining > 1 ? 's' : ''} remaining.`
        : `Fixed ${type} in "${column}". All issues resolved! 🎉`
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
      title: '✅ Missing Values Fixed', 
      description: remaining > 0
        ? `Applied "${strategy}" to "${column}". ${remaining} issue${remaining > 1 ? 's' : ''} remaining.`
        : `Applied "${strategy}" to "${column}". All issues resolved! 🎉`
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
    toast({ title: '✅ All Fixes Applied', description: `Fixed ${count} issue types. All clean! 🎉` });
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
          <p className="text-muted-foreground">Profile, scan, clean, and fix your data with an expert 8-step pipeline</p>
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

              {/* Tabs for Profile / Issues / Summary */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="profile" className="gap-1">
                    <BarChart3 className="h-3 w-3" /> Profile
                  </TabsTrigger>
                  <TabsTrigger value="issues" className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> Issues {report ? `(${report.issues.length})` : ''}
                  </TabsTrigger>
                  <TabsTrigger value="summary" className="gap-1">
                    <ClipboardCheck className="h-3 w-3" /> Cleaning Report
                  </TabsTrigger>
                </TabsList>

                {/* PROFILE TAB */}
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
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
                                  <th className="text-right p-2 font-medium text-muted-foreground">Outliers</th>
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
                                    <td className="p-2 text-right">
                                      {col.outlierCount !== undefined && col.outlierCount > 0 ? (
                                        <span className="text-amber-500">{col.outlierCount}</span>
                                      ) : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
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
                        <CardContent className="py-4 text-center">
                          <p className="text-lg font-bold">╔══ DATA CLEANING COMPLETE ✅ ══╗</p>
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
                              <h3 className="text-lg font-bold">📈 Data Health Score: {cleaningSummary.healthScore}/100</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {cleaningSummary.healthScore >= 90 ? 'Excellent! Your data is analysis-ready.' :
                                 cleaningSummary.healthScore >= 70 ? 'Good quality. Minor improvements possible.' :
                                 'Needs attention. Review warnings below.'}
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
