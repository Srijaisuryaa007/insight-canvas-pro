import { useState } from 'react';
import { 
  Shield, AlertTriangle, CheckCircle, Loader2, Wand2, Database, Eye, Play, Undo2, Redo2, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useData } from '@/contexts/DataContext';
import { useDataQuality } from '@/hooks/useDataQuality';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export default function Quality() {
  const { datasets, currentDataset, currentData, selectDataset, updateCurrentData, undo, redo, canUndo, canRedo } = useData();
  const { isScanning, report, scanDataset, getFixPreview, applyFix } = useDataQuality();
  const { getCreditCost } = useSubscription();
  const [previewFix, setPreviewFix] = useState<{ column: string; type: string; description: string; before: string; after: string; affectedRows: number } | null>(null);
  const [confirmFix, setConfirmFix] = useState<{ column: string; type: string } | null>(null);
  const [confirmFixAll, setConfirmFixAll] = useState(false);
  const [aiCleaningPreview, setAiCleaningPreview] = useState<string | null>(null);

  // Missing value strategy state
  const [missingStrategy, setMissingStrategy] = useState<Record<string, string>>({});

  const handleScan = async () => {
    if (!currentDataset) return;
    await scanDataset(currentDataset.id, currentData);
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

  const handleApplyFix = async (column: string, type: string) => {
    const newData = applyFix(currentData, column, type);
    updateCurrentData(newData);
    setPreviewFix(null);
    setConfirmFix(null);
    toast({ title: 'Fix Applied', description: `Fixed ${type} issues in "${column}". Re-scanning...` });
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
    toast({ title: 'Missing Values Fixed', description: `Applied "${strategy}" strategy to "${column}". Re-scanning...` });
    if (currentDataset) await scanDataset(currentDataset.id, newData);
  };

  const handleFixAll = async () => {
    if (!report || !currentDataset) return;
    let data = [...currentData];
    for (const issue of report.issues) {
      data = applyFix(data, issue.column, issue.type);
    }
    updateCurrentData(data);
    setConfirmFixAll(false);
    toast({ title: 'All Fixes Applied', description: `Fixed ${report.issues.length} issue types. Re-scanning...` });
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
          <p className="text-muted-foreground">Scan, analyze, and fix your data quality issues</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={undo} disabled={!canUndo} title="Undo">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={redo} disabled={!canRedo} title="Redo">
            <Redo2 className="h-4 w-4" />
          </Button>
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
                        <p className="text-xs text-muted-foreground mt-1">{previewFix.description}</p>
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

              {report && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />Issues ({report.issues.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {report.issues.length === 0 ? (
                      <div className="py-8 text-center">
                        <CheckCircle className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
                        <h3 className="font-medium">No Issues Found!</h3>
                        <p className="text-sm text-muted-foreground mt-1">Your data quality is excellent.</p>
                      </div>
                    ) : (
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
                    )}
                  </CardContent>
                </Card>
              )}
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
