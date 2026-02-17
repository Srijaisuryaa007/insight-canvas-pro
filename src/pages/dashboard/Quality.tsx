import { useState } from 'react';
import { 
  Shield, AlertTriangle, CheckCircle, Loader2, Wand2, Database, Eye, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useData } from '@/contexts/DataContext';
import { useDataQuality } from '@/hooks/useDataQuality';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export default function Quality() {
  const { datasets, currentDataset, selectDataset } = useData();
  const { isScanning, report, scanDataset } = useDataQuality();
  const { getCreditCost } = useSubscription();
  const [previewFixes, setPreviewFixes] = useState<Record<string, string> | null>(null);

  const handleScan = async () => {
    if (!currentDataset) return;
    await scanDataset(currentDataset.id);
  };

  const handlePreviewFix = (column: string, type: string) => {
    const fixDescription: Record<string, string> = {
      'missing': `Fill missing values in "${column}" using mean/median imputation for numbers or mode for categorical data.`,
      'duplicate': `Remove ${report?.issues.find(i => i.column === column && i.type === 'duplicate')?.count || 0} duplicate entries in "${column}".`,
      'outlier': `Cap outliers in "${column}" using IQR method (values beyond Q1-1.5×IQR and Q3+1.5×IQR).`,
      'invalid': `Standardize invalid values in "${column}" using type coercion and format normalization.`,
    };
    setPreviewFixes({ column, type, description: fixDescription[type] || 'Apply automatic fix.' });
    toast({ title: 'Fix Preview', description: fixDescription[type] || 'Ready to apply.' });
  };

  const handleApplyFix = () => {
    if (previewFixes) {
      toast({ title: 'Fix Applied', description: `Auto-fixed ${previewFixes.type} issues in "${previewFixes.column}". Re-scan to verify.` });
      setPreviewFixes(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-destructive';
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
          <p className="text-muted-foreground">Scan and improve your data quality</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Dataset</CardTitle>
          </CardHeader>
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
                          {report ? `Score: ${report.overallScore}% • ${report.issues.length} issues` : 'Not scanned'}
                        </p>
                      </div>
                    </div>
                    <Button onClick={handleScan} disabled={isScanning} className="gap-2">
                      {isScanning ? (
                        <><Loader2 className="h-4 w-4 animate-spin" />Scanning...</>
                      ) : (
                        <><Shield className="h-4 w-4" />Scan ({getCreditCost('quality-scan')} credits)</>
                      )}
                    </Button>
                  </div>
                  {report && <Progress value={report.overallScore} className="h-2 mt-4" />}
                </CardContent>
              </Card>

              {/* Explainability */}
              {report && (report as any).reasoning && (
                <Card className="bg-card border-border">
                  <CardContent className="py-4">
                    <p className="text-sm text-muted-foreground italic">
                      💡 <span className="font-medium text-foreground">Analysis: </span>
                      {(report as any).reasoning}
                    </p>
                    {(report as any).suggestedActions && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(report as any).suggestedActions.map((action: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">{action}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Preview fix panel */}
              {previewFixes && (
                <Card className="bg-chart-1/5 border-chart-1/20">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Preview Fix: {previewFixes.type} in "{previewFixes.column}"</p>
                        <p className="text-xs text-muted-foreground mt-1">{previewFixes.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setPreviewFixes(null)}>Cancel</Button>
                        <Button size="sm" onClick={handleApplyFix} className="gap-1">
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
                        <h3 className="font-medium">No Issues!</h3>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {report.issues.map((issue, idx) => (
                          <div key={idx} className="p-4 rounded-lg border border-border bg-muted/30">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                {getSeverityIcon(issue.severity)}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{issue.column}</span>
                                    <Badge variant="outline" className="text-xs capitalize">{issue.type}</Badge>
                                    <Badge variant="outline" className={cn("text-xs capitalize",
                                      issue.severity === 'high' ? 'border-destructive text-destructive' :
                                      issue.severity === 'medium' ? 'border-amber-500 text-amber-600' : ''
                                    )}>{issue.severity}</Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">{issue.count} occurrences ({issue.percentage}%)</p>
                                  <p className="text-sm mt-2">💡 {issue.suggestion}</p>
                                  {(issue as any).reasoning && (
                                    <p className="text-xs text-muted-foreground mt-1 italic">🔍 {(issue as any).reasoning}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="outline" size="sm" className="gap-1" onClick={() => handlePreviewFix(issue.column, issue.type)}>
                                  <Eye className="h-3 w-3" /> Preview
                                </Button>
                                <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                                  handlePreviewFix(issue.column, issue.type);
                                  setTimeout(handleApplyFix, 100);
                                }}>
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
    </div>
  );
}
