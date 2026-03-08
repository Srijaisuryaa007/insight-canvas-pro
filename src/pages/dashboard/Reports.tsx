import { useState, useMemo, useEffect } from 'react';
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
import { exportRichPDF } from '@/lib/exportPDF';
import { exportRichPPTX } from '@/lib/exportPPTX';
import { exportRichDOCX } from '@/lib/exportDOCX';
import { buildReportStats, generateNarrative } from '@/lib/reportNarrativeBuilder';
import { getTemplate, type TemplateId } from '@/lib/reportTemplates';
import { toast } from '@/hooks/use-toast';
import ScheduledReports from '@/components/reports/ScheduledReports';
import TemplateSelector from '@/components/reports/TemplateSelector';
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
  { id: 'quality', label: 'Data Quality Summary', default: true },
  { id: 'deep-insights', label: 'Deep Insights', default: true },
  { id: 'recommendations', label: 'Recommendations', default: true },
  { id: 'data-table', label: 'Data Table (Top 50)', default: false },
];

const TEMPLATE_STORAGE_KEY = 'datapulse_report_template';

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
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(() => {
    return (localStorage.getItem(TEMPLATE_STORAGE_KEY) as TemplateId) || 'executive';
  });

  useEffect(() => {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, selectedTemplate);
  }, [selectedTemplate]);

  const toggleSection = (id: string) => {
    setSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const title = reportTitle || currentDataset?.name || 'Analytics Report';
  const tpl = getTemplate(selectedTemplate);

  const handleExport = async (format: 'pdf' | 'pptx' | 'docx') => {
    if (!currentData.length) { toast({ title: 'No data available', variant: 'destructive' }); return; }
    setIsExporting(format);
    try {
      const args = [currentData, currentDataset?.name || 'Dataset', user?.name || 'Analyst', title, selectedTemplate, qualityReport] as const;
      switch (format) {
        case 'pdf': await exportRichPDF(...args); break;
        case 'pptx': await exportRichPPTX(...args); break;
        case 'docx': await exportRichDOCX(...args); break;
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

  const reportStats = useMemo(() => {
    if (!currentData.length) return null;
    try { return buildReportStats(currentData, currentDataset?.name || 'Dataset', user?.name || 'Analyst', title, qualityReport); } catch { return null; }
  }, [currentData, title, qualityReport, user?.name, currentDataset?.name]);

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
              <Button disabled={!currentData.length || !!isExporting}>
                {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Export Report
                <Badge variant="outline" className="ml-2 text-[9px]">{tpl.name}</Badge>
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

      {/* Template Selector */}
      <TemplateSelector selected={selectedTemplate} onSelect={setSelectedTemplate} />

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
                    <p className="text-xs text-muted-foreground mt-1">Professional multi-page PDF with KPIs, trends, insights, and narrative analysis.</p>
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
                    <p className="text-xs text-muted-foreground mt-1">12-slide storytelling deck with executive summary, KPIs, trends, and strategic recommendations.</p>
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
                    <p className="text-xs text-muted-foreground mt-1">10-section professional report with deep narrative, quality analysis, and data appendix.</p>
                    <Button className="mt-3 w-full" variant="outline" onClick={() => handleExport('docx')} disabled={!!isExporting}>
                      {isExporting === 'docx' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                      Download DOCX
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Report Preview */}
              {reportStats && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Report Preview</CardTitle>
                      <Badge variant="outline" className="text-[10px]">{tpl.icon} {tpl.name}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-4 pr-4">
                        {sections.includes('title') && (
                          <div className="text-center py-6 border-b border-border">
                            <div className="flex gap-0.5 mx-auto w-32 rounded overflow-hidden h-2 mb-4">
                              {tpl.colors.map((c, i) => <div key={i} className="flex-1" style={{ backgroundColor: c }} />)}
                            </div>
                            <h2 className="text-xl font-bold">{reportStats.title}</h2>
                            <p className="text-xs text-primary font-medium mt-1">Data Intelligence Report</p>
                            <p className="text-xs text-muted-foreground mt-1">{reportStats.date} • {reportStats.rowCount.toLocaleString()} rows • {reportStats.userName}</p>
                          </div>
                        )}
                        {sections.includes('executive-summary') && (
                          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                            <h3 className="text-sm font-semibold mb-2 text-primary">Executive Summary</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{generateNarrative('executive-summary', reportStats, tpl.tone).substring(0, 500)}...</p>
                          </div>
                        )}
                        {sections.includes('summary') && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2">Dataset Overview</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{generateNarrative('dataset-overview', reportStats, tpl.tone).substring(0, 400)}...</p>
                          </div>
                        )}
                        {sections.includes('kpis') && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2">KPI Performance</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {reportStats.kpis.map((k, i) => (
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
                              {reportStats.trends.map((t, i) => (
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
                            <h3 className="text-sm font-semibold mb-2 text-emerald-500">Positive Findings</h3>
                            <p className="text-xs text-muted-foreground mb-1">{generateNarrative('positives', reportStats, tpl.tone).substring(0, 200)}...</p>
                            <ul className="space-y-1">{(reportStats.positives.length ? reportStats.positives : ['Metrics stable']).map((p, i) => <li key={i} className="text-sm text-emerald-600">• {p}</li>)}</ul>
                          </div>
                        )}
                        {sections.includes('negatives') && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2 text-destructive">Risks & Concerns</h3>
                            <p className="text-xs text-muted-foreground mb-1">{generateNarrative('negatives', reportStats, tpl.tone).substring(0, 200)}...</p>
                            <ul className="space-y-1">{reportStats.risks.map((r, i) => <li key={i} className="text-sm text-destructive">• {r}</li>)}</ul>
                          </div>
                        )}
                        {sections.includes('deep-insights') && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2">Deep Insights</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{generateNarrative('deep-insights', reportStats, tpl.tone).substring(0, 400)}...</p>
                          </div>
                        )}
                        {sections.includes('recommendations') && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2">Recommendations</h3>
                            <p className="text-xs text-muted-foreground mb-1">{generateNarrative('recommendations', reportStats, tpl.tone).substring(0, 200)}...</p>
                            <ul className="space-y-1">{reportStats.recommendations.map((r, i) => <li key={i} className="text-sm text-muted-foreground">→ {r}</li>)}</ul>
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

      <Separator />
      <ScheduledReports />

      <Separator />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardComments dashboardId={dashboard?.id || 'default'} />
        <VersionHistory dashboardId={dashboard?.id || 'default'} />
      </div>
    </div>
  );
}
