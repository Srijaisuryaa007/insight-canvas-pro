import { useState, useMemo } from 'react';
import { FileText, Download, CheckSquare, FileDown, Presentation, File, Layers, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSubscription } from '@/hooks/useSubscription';
import { useExport } from '@/hooks/useExport';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/contexts/DashboardContext';
import { useDataQuality } from '@/hooks/useDataQuality';
import { buildReportData, exportPDF, exportPPTX, exportDOCX } from '@/lib/exportEngine';
import { toast } from '@/hooks/use-toast';
import ScheduledReports from '@/components/reports/ScheduledReports';
import DashboardComments from '@/components/collaboration/DashboardComments';
import VersionHistory from '@/components/collaboration/VersionHistory';

const REPORT_SECTIONS = [
  { id: 'title', label: 'Cover Page', default: true },
  { id: 'executive-summary', label: 'Executive Summary', default: true },
  { id: 'summary', label: 'Dataset Overview', default: true },
  { id: 'kpis', label: 'KPI Performance', default: true },
  { id: 'trends', label: 'Trends Analysis', default: true },
  { id: 'positives', label: 'Positive Findings', default: true },
  { id: 'negatives', label: 'Negative Findings', default: true },
  { id: 'risks', label: 'Risks', default: true },
  { id: 'opportunities', label: 'Opportunities', default: true },
  { id: 'recommendations', label: 'Recommendations', default: true },
  { id: 'quality', label: 'Data Quality Summary', default: true },
  { id: 'data-table', label: 'Data Table (Top 50)', default: false },
];

export default function Reports() {
  const { isFeatureAvailable } = useSubscription();
  const { exportCSV } = useExport();
  const { currentData, currentDataset } = useData();
  const { user } = useAuth();
  const { dashboard } = useDashboard();
  const { report: qualityReport } = useDataQuality();
  const [sections, setSections] = useState<string[]>(REPORT_SECTIONS.filter(s => s.default).map(s => s.id));
  const [reportTitle, setReportTitle] = useState('');
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const title = reportTitle || currentDataset?.name || 'Analytics Report';

  const getReportData = () => {
    return buildReportData(
      currentData,
      currentDataset?.name || 'Dataset',
      user?.name || 'User',
      title,
      qualityReport
    );
  };

  const handleExport = async (format: 'pdf' | 'pptx' | 'docx') => {
    if (!currentData.length) { toast({ title: 'No data', variant: 'destructive' }); return; }
    setIsExporting(format);
    try {
      const report = getReportData();
      switch (format) {
        case 'pdf': await exportPDF(report); break;
        case 'pptx': await exportPPTX(report); break;
        case 'docx': await exportDOCX(report); break;
      }
    } catch (e) {
      toast({ title: 'Export Failed', variant: 'destructive' });
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportCleanedCSV = () => {
    if (!currentData.length) { toast({ title: 'No data', variant: 'destructive' }); return; }
    exportCSV(currentData, `${currentDataset?.name || 'data'}-cleaned`);
  };

  const reportData = useMemo(() => {
    if (!currentData.length) return null;
    try { return getReportData(); } catch { return null; }
  }, [currentData, title, qualityReport]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-7 w-7" />Reports</h1>
          <p className="text-muted-foreground">Generate professional reports in PDF, PowerPoint, and Word</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCleanedCSV} disabled={!currentData.length}>
            <FileDown className="h-4 w-4 mr-2" />Cleaned CSV
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={!currentData.length}>
                <Download className="h-4 w-4 mr-2" />Export Dashboard
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover">
              <DropdownMenuItem onClick={() => handleExport('pdf')} disabled={isExporting === 'pdf'}>
                {isExporting === 'pdf' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <File className="h-4 w-4 mr-2" />}
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pptx')} disabled={isExporting === 'pptx'}>
                {isExporting === 'pptx' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Presentation className="h-4 w-4 mr-2" />}
                Download PowerPoint
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('docx')} disabled={isExporting === 'docx'}>
                {isExporting === 'docx' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                Download Word
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><CheckSquare className="h-5 w-5" />Report Sections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Report Title</Label>
              <Input value={reportTitle} onChange={e => setReportTitle(e.target.value)} placeholder={currentDataset?.name || 'Report Title'} className="h-8 text-sm" />
            </div>
            <div className="space-y-2">
              {REPORT_SECTIONS.map(s => (
                <div key={s.id} className="flex items-center gap-2">
                  <Checkbox id={s.id} checked={sections.includes(s.id)} onCheckedChange={() => toggleSection(s.id)} />
                  <Label htmlFor={s.id} className="text-sm cursor-pointer">{s.label}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {!currentData.length ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg">No Data</h3>
                <p className="text-muted-foreground text-sm">Upload or select a dataset to generate reports</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card border-border hover:shadow-md transition-shadow">
                  <CardContent className="py-6 text-center">
                    <File className="h-8 w-8 mx-auto text-primary mb-2" />
                    <h3 className="font-medium">PDF Report</h3>
                    <p className="text-xs text-muted-foreground mt-1">A4 format, high-resolution PDF with KPIs, trends, and AI narrative.</p>
                    <Button className="mt-3 w-full" onClick={() => handleExport('pdf')} disabled={!!isExporting}>
                      {isExporting === 'pdf' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border hover:shadow-md transition-shadow">
                  <CardContent className="py-6 text-center">
                    <Presentation className="h-8 w-8 mx-auto text-primary mb-2" />
                    <h3 className="font-medium">PowerPoint</h3>
                    <p className="text-xs text-muted-foreground mt-1">Board-ready slides: KPIs, trends, risks, strategy, and AI insights.</p>
                    <Button className="mt-3 w-full" variant="outline" onClick={() => handleExport('pptx')} disabled={!!isExporting}>
                      {isExporting === 'pptx' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Layers className="h-4 w-4 mr-2" />}
                      Download PPTX
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border hover:shadow-md transition-shadow">
                  <CardContent className="py-6 text-center">
                    <FileText className="h-8 w-8 mx-auto text-primary mb-2" />
                    <h3 className="font-medium">Word Document</h3>
                    <p className="text-xs text-muted-foreground mt-1">Professional DOCX with executive summary, KPIs, risks, and recommendations.</p>
                    <Button className="mt-3 w-full" variant="outline" onClick={() => handleExport('docx')} disabled={!!isExporting}>
                      {isExporting === 'docx' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                      Download DOCX
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Report Preview */}
              {reportData && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3"><CardTitle className="text-base">Report Preview</CardTitle></CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-4 pr-4">
                        {sections.includes('title') && (
                          <div className="text-center py-6 border-b border-border">
                            <h2 className="text-xl font-bold">{reportData.title}</h2>
                            <p className="text-xs text-muted-foreground mt-1">{reportData.generatedDate} • {reportData.rowCount} rows • {reportData.userName}</p>
                          </div>
                        )}
                        {sections.includes('executive-summary') && (
                          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                            <h3 className="text-sm font-semibold mb-2 text-primary">Executive Summary</h3>
                            <p className="text-sm text-muted-foreground">{reportData.aiSummary}</p>
                          </div>
                        )}
                        {sections.includes('kpis') && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2">KPI Performance</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {reportData.kpis.map((k, i) => (
                                <div key={i} className="p-3 rounded-lg bg-muted/50">
                                  <p className="text-[10px] text-muted-foreground uppercase">{k.label}</p>
                                  <p className="text-lg font-bold">{k.value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {sections.includes('trends') && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2">Trends</h3>
                            <div className="space-y-1">
                              {reportData.trends.map((t, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                  <span>{t.col}</span>
                                  <span className={t.change > 1 ? 'text-emerald-500 font-medium' : t.change < -1 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                                    {t.direction} ({t.change > 0 ? '+' : ''}{t.change}%)
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {sections.includes('positives') && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2 text-emerald-500">✅ Positives</h3>
                            <ul className="space-y-1">{(reportData.positives.length ? reportData.positives : ['Metrics stable']).map((p, i) => <li key={i} className="text-sm text-emerald-600">✓ {p}</li>)}</ul>
                          </div>
                        )}
                        {sections.includes('negatives') && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2 text-destructive">⚠️ Concerns</h3>
                            <ul className="space-y-1">{(reportData.negatives.length ? reportData.negatives : ['No declines']).map((n, i) => <li key={i} className="text-sm text-destructive">⚠ {n}</li>)}</ul>
                          </div>
                        )}
                        {sections.includes('risks') && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2">🔴 Risks</h3>
                            <ul className="space-y-1">{reportData.risks.map((r, i) => <li key={i} className="text-sm text-muted-foreground">{r}</li>)}</ul>
                          </div>
                        )}
                        {sections.includes('recommendations') && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2">💡 Recommendations</h3>
                            <ul className="space-y-1">{reportData.recommendations.map((r, i) => <li key={i} className="text-sm text-muted-foreground">→ {r}</li>)}</ul>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
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
