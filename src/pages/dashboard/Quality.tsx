import { useState } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  Wand2,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useDataQuality } from '@/hooks/useDataQuality';
import { useCredits } from '@/hooks/useCredits';
import { cn } from '@/lib/utils';

export default function Quality() {
  const { currentDataset, datasets, selectDataset, qualityReports } = useWorkspace();
  const { isScanning, scanDataset } = useDataQuality();
  const { getCreditCost } = useCredits();

  const report = currentDataset ? qualityReports[currentDataset.id] : null;

  const handleScan = async () => {
    if (!currentDataset) return;
    
    // Get stored data
    const storedData = localStorage.getItem(`datapulse_data_${currentDataset.id}`);
    if (storedData) {
      const data = JSON.parse(storedData);
      await scanDataset(currentDataset, data);
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
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Quality</h1>
          <p className="text-muted-foreground">
            Scan and improve your data quality
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dataset Selection */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Dataset</CardTitle>
          </CardHeader>
          <CardContent>
            {datasets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No datasets available. Upload one first.
              </p>
            ) : (
              <div className="space-y-2">
                {datasets.map(ds => (
                  <button
                    key={ds.id}
                    onClick={() => selectDataset(ds.id)}
                    className={cn(
                      "w-full p-3 rounded-lg text-left transition-colors",
                      currentDataset?.id === ds.id 
                        ? "bg-primary/10 border border-primary/20" 
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">{ds.name}</span>
                      </div>
                      {qualityReports[ds.id] && (
                        <Badge 
                          variant="outline"
                          className={cn("font-mono", getScoreColor(qualityReports[ds.id].overallScore))}
                        >
                          {qualityReports[ds.id].overallScore}%
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quality Report */}
        <div className="lg:col-span-2 space-y-6">
          {!currentDataset ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg">Select a Dataset</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Choose a dataset to view or run a quality scan
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Scan Button / Score Overview */}
              <Card className="bg-card border-border">
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center",
                        report ? getScoreBg(report.overallScore) : "bg-muted"
                      )}>
                        {report ? (
                          <span className="text-2xl font-bold text-primary-foreground">
                            {report.overallScore}
                          </span>
                        ) : (
                          <Shield className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {currentDataset.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {report 
                            ? `Quality Score: ${report.overallScore}% • ${report.issues.length} issues found`
                            : 'Not scanned yet'
                          }
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={handleScan} 
                      disabled={isScanning}
                      className="gap-2"
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4" />
                          Scan ({getCreditCost('quality-scan')} credits)
                        </>
                      )}
                    </Button>
                  </div>

                  {report && (
                    <div className="mt-4">
                      <Progress 
                        value={report.overallScore} 
                        className="h-2"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Issues List */}
              {report && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Quality Issues ({report.issues.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {report.issues.length === 0 ? (
                      <div className="py-8 text-center">
                        <CheckCircle className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
                        <h3 className="font-medium">No Issues Found!</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your data quality is excellent
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {report.issues.map((issue, idx) => (
                          <div 
                            key={idx}
                            className="p-4 rounded-lg border border-border bg-muted/30"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                {getSeverityIcon(issue.severity)}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{issue.column}</span>
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {issue.type}
                                    </Badge>
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        "text-xs capitalize",
                                        issue.severity === 'high' ? 'border-destructive text-destructive' :
                                        issue.severity === 'medium' ? 'border-amber-500 text-amber-600' :
                                        'border-muted-foreground'
                                      )}
                                    >
                                      {issue.severity}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {issue.count} occurrences ({issue.percentage}%)
                                  </p>
                                  <p className="text-sm mt-2">
                                    💡 {issue.suggestion}
                                  </p>
                                </div>
                              </div>
                              <Button variant="outline" size="sm" className="gap-1">
                                <Wand2 className="h-3 w-3" />
                                Auto Fix
                              </Button>
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
