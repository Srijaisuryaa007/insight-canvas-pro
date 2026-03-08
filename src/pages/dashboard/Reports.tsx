import { useState, useMemo, useEffect, useCallback } from 'react';
import { FileText, Download, CheckSquare, FileDown, Presentation, File, Layers, Loader2, Star, ChevronLeft, ChevronRight, GripVertical, Sparkles, Clock, Trash2, FolderOpen, Share2, Link, Mail, Lock, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import TemplateSelector from '@/components/reports/TemplateSelector';
import { cn } from '@/lib/utils';

// ── Helpers ──

function formatDatasetName(name: string) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).trim();
}

function generateReportTitle(datasetName: string, templateName: string) {
  const clean = formatDatasetName(datasetName);
  const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  return `${clean} — ${templateName} | ${month}`;
}

function generateSuggestions(datasetName: string) {
  const clean = formatDatasetName(datasetName);
  const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const q = `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`;
  return [
    `${clean} Analysis — ${month}`,
    `Operational Review: ${clean}`,
    `${clean} Executive Briefing ${q}`,
  ];
}

// ── Sections Config ──

const REPORT_SECTIONS = [
  { id: 'title', label: 'Cover Page', icon: '#64748B', slides: 1, required: false },
  { id: 'executive-summary', label: 'Executive Summary', icon: '#3B82F6', slides: 1, required: false },
  { id: 'summary', label: 'Dataset Overview', icon: '#7C3AED', slides: 1, required: false },
  { id: 'kpis', label: 'KPI Performance', icon: '#0891B2', slides: 2, required: false },
  { id: 'trends', label: 'Trends Analysis', icon: '#EF4444', slides: 2, required: false },
  { id: 'positives', label: 'Positive Findings', icon: '#10B981', slides: 1, required: false },
  { id: 'negatives', label: 'Critical Issues', icon: '#DC2626', slides: 1, required: false },
  { id: 'risks', label: 'Risks', icon: '#F59E0B', slides: 1, required: false },
  { id: 'opportunities', label: 'Opportunities', icon: '#8B5CF6', slides: 1, required: false },
  { id: 'quality', label: 'Data Quality Summary', icon: '#D97706', slides: 1, required: false },
  { id: 'deep-insights', label: 'AI Insights', icon: '#7C3AED', slides: 1, required: false },
  { id: 'recommendations', label: 'Recommendations', icon: '#0891B2', slides: 1, required: false },
  { id: 'data-table', label: 'Data Table (Top 50)', icon: '#64748B', slides: 1, required: false },
];

const CREDIT_COSTS: Record<string, number> = { pdf: 5, pptx: 8, docx: 5 };
const TEMPLATE_STORAGE_KEY = 'datapulse_report_template';
const HISTORY_KEY = 'datapulse_report_history';
const NOTES_KEY = 'datapulse_report_notes';

interface ReportHistoryItem {
  id: string;
  format: 'pdf' | 'pptx' | 'docx';
  templateName: string;
  datasetName: string;
  sectionCount: number;
  generatedAt: string;
}

// ── Progress Modal ──

interface ProgressStep { label: string; done: boolean; active: boolean }

function GenerationModal({ open, format, templateName, datasetName, rowCount, progress, steps, onCancel, onClose, isComplete }: {
  open: boolean; format: string; templateName: string; datasetName: string; rowCount: number;
  progress: number; steps: ProgressStep[]; onCancel: () => void; onClose: () => void; isComplete: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border">
        <DialogTitle className="sr-only">Generating Report</DialogTitle>
        {!isComplete ? (
          <div className="py-4 space-y-5">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
              <h3 className="text-lg font-bold">Generating your {format.toUpperCase()} report...</h3>
              <p className="text-xs text-muted-foreground mt-1">{templateName} template</p>
            </div>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  {step.done ? (
                    <span className="text-emerald-500 text-xs">✓</span>
                  ) : step.active ? (
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  ) : (
                    <span className="w-3 h-3 rounded-full border border-border" />
                  )}
                  <span className={cn(step.done ? 'text-muted-foreground' : step.active ? 'text-foreground font-medium' : 'text-muted-foreground/50')}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{Math.round(progress)}% complete</span>
                <span>~{Math.max(1, Math.round((100 - progress) / 12))}s remaining</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={onCancel}>Cancel</Button>
          </div>
        ) : (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
              <span className="text-2xl">✓</span>
            </div>
            <div>
              <h3 className="text-lg font-bold">Your report is ready!</h3>
              <p className="text-xs text-muted-foreground mt-1">{formatDatasetName(datasetName)} • {rowCount} rows</p>
            </div>
            <Button className="w-full" onClick={onClose}>
              <Download className="h-4 w-4 mr-2" />Download Now
            </Button>
            <Button variant="outline" className="w-full" onClick={onClose}>Generate Another</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main ──

export default function Reports() {
  const { isFeatureAvailable, consumeCredits } = useSubscription();
  const { exportCSV } = useExport();
  const { currentData, currentDataset, datasets, selectDataset } = useData();
  const { user } = useAuth();
  const { dashboard } = useDashboard();
  const { report: qualityReport } = useDataQuality();

  const [sections, setSections] = useState<string[]>(REPORT_SECTIONS.filter(s => s.id !== 'data-table').map(s => s.id));
  const [reportTitle, setReportTitle] = useState('');
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(() =>
    (localStorage.getItem(TEMPLATE_STORAGE_KEY) as TemplateId) || 'executive'
  );
  const [history, setHistory] = useState<ReportHistoryItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
  });
  const [previewSlide, setPreviewSlide] = useState(0);

  // Progress modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProgress, setModalProgress] = useState(0);
  const [modalSteps, setModalSteps] = useState<ProgressStep[]>([]);
  const [modalComplete, setModalComplete] = useState(false);
  const [modalFormat, setModalFormat] = useState('');

  useEffect(() => { localStorage.setItem(TEMPLATE_STORAGE_KEY, selectedTemplate); }, [selectedTemplate]);
  useEffect(() => { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20))); }, [history]);

  // Auto-generate title when dataset/template changes
  const tpl = getTemplate(selectedTemplate);
  useEffect(() => {
    if (currentDataset?.name && !reportTitle) {
      setReportTitle(generateReportTitle(currentDataset.name, tpl.name));
    }
  }, [currentDataset?.name, tpl.name]);

  const toggleSection = (id: string) => {
    setSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };
  const toggleAll = () => {
    if (sections.length === REPORT_SECTIONS.length) setSections([]);
    else setSections(REPORT_SECTIONS.map(s => s.id));
  };

  const title = reportTitle || currentDataset?.name || 'Analytics Report';
  const suggestions = useMemo(() => currentDataset?.name ? generateSuggestions(currentDataset.name) : [], [currentDataset?.name]);

  const handleExport = useCallback(async (format: 'pdf' | 'pptx' | 'docx') => {
    if (!currentData.length) { toast({ title: 'No data available', variant: 'destructive' }); return; }

    const credits = CREDIT_COSTS[format];
    if (!consumeCredits(`export-${format}` as any)) {
      toast({ title: 'Not enough credits', description: `This export requires ${credits} credits.`, variant: 'destructive' });
      return;
    }

    // Start progress modal
    setModalFormat(format);
    setModalComplete(false);
    setModalProgress(0);
    const stepLabels = [
      `Analyzing dataset (${currentData.length} rows)`,
      `Applying ${tpl.name} template`,
      'Generating Executive Summary',
      'Building KPI slides',
      'Creating trend analysis',
      'Adding AI insights',
      'Finalizing report',
    ];
    setModalSteps(stepLabels.map((label, i) => ({ label, done: false, active: i === 0 })));
    setModalOpen(true);

    // Simulate progress
    let currentStep = 0;
    const interval = setInterval(() => {
      setModalProgress(prev => {
        const next = Math.min(prev + Math.random() * 18 + 5, 95);
        const newStep = Math.min(Math.floor(next / (100 / stepLabels.length)), stepLabels.length - 1);
        if (newStep > currentStep) {
          currentStep = newStep;
          setModalSteps(stepLabels.map((label, i) => ({
            label, done: i < newStep, active: i === newStep,
          })));
        }
        return next;
      });
    }, 400);

    setIsExporting(format);
    try {
      const args = [currentData, currentDataset?.name || 'Dataset', user?.name || 'Analyst', title, selectedTemplate, qualityReport] as const;
      switch (format) {
        case 'pdf': await exportRichPDF(...args); break;
        case 'pptx': await exportRichPPTX(...args); break;
        case 'docx': await exportRichDOCX(...args); break;
      }

      // Add to history
      setHistory(prev => [{
        id: crypto.randomUUID(), format, templateName: tpl.name,
        datasetName: currentDataset?.name || 'Dataset',
        sectionCount: sections.length,
        generatedAt: new Date().toISOString(),
      }, ...prev]);

      clearInterval(interval);
      setModalProgress(100);
      setModalSteps(stepLabels.map(label => ({ label, done: true, active: false })));
      setModalComplete(true);
    } catch {
      clearInterval(interval);
      setModalOpen(false);
      toast({ title: 'Export Failed', variant: 'destructive' });
    } finally {
      setIsExporting(null);
    }
  }, [currentData, currentDataset, user, title, selectedTemplate, qualityReport, tpl, sections, consumeCredits]);

  const handleExportCleanedCSV = () => {
    if (!currentData.length) { toast({ title: 'No data', variant: 'destructive' }); return; }
    exportCSV(currentData, `${currentDataset?.name || 'data'}-cleaned`);
  };

  const deleteHistory = (id: string) => setHistory(prev => prev.filter(h => h.id !== id));

  const reportStats = useMemo(() => {
    if (!currentData.length) return null;
    try { return buildReportStats(currentData, currentDataset?.name || 'Dataset', user?.name || 'Analyst', title, qualityReport); } catch { return null; }
  }, [currentData, title, qualityReport, user?.name, currentDataset?.name]);

  const previewSections = useMemo(() => sections.filter(s => REPORT_SECTIONS.find(rs => rs.id === s)), [sections]);
  const totalSlides = useMemo(() => sections.reduce((sum, s) => sum + (REPORT_SECTIONS.find(rs => rs.id === s)?.slides || 1), 0), [sections]);

  const formatBadge: Record<string, { color: string; label: string }> = {
    pdf: { color: '#DC2626', label: 'PDF' },
    pptx: { color: '#3B82F6', label: 'PPTX' },
    docx: { color: '#1D4ED8', label: 'DOCX' },
  };

  return (
    <div className="space-y-6">
      {/* Progress Modal */}
      <GenerationModal
        open={modalOpen} format={modalFormat} templateName={tpl.name}
        datasetName={currentDataset?.name || ''} rowCount={currentData.length}
        progress={modalProgress} steps={modalSteps}
        onCancel={() => setModalOpen(false)} onClose={() => setModalOpen(false)}
        isComplete={modalComplete}
      />

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-muted-foreground text-sm">Generate boardroom-ready reports from your data in one click</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {datasets.length > 1 && (
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={currentDataset?.id || ''} onChange={e => selectDataset(e.target.value)}>
              {datasets.map(ds => <option key={ds.id} value={ds.id}>{formatDatasetName(ds.name)}</option>)}
            </select>
          )}
          <Button variant="outline" onClick={handleExportCleanedCSV} disabled={!currentData.length}>
            <FileDown className="h-4 w-4 mr-2" />Cleaned CSV
          </Button>
        </div>
      </div>

      {/* ── Template Selector ── */}
      <TemplateSelector selected={selectedTemplate} onSelect={setSelectedTemplate} />

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Sections Panel */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />Report Sections
              </CardTitle>
              <button onClick={toggleAll} className="text-[10px] text-primary hover:underline">
                {sections.length === REPORT_SECTIONS.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Report Title */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Report Title</Label>
              <Input value={reportTitle} onChange={e => setReportTitle(e.target.value)}
                placeholder={currentDataset?.name ? generateReportTitle(currentDataset.name, tpl.name) : 'Report Title'}
                className="h-8 text-sm" />
              {suggestions.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">Suggested titles:</span>
                  <div className="flex flex-wrap gap-1">
                    {suggestions.map((s, i) => (
                      <Badge key={i} variant="outline" className="text-[9px] cursor-pointer hover:bg-primary/10 transition-colors"
                        onClick={() => setReportTitle(s)}>{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Section list */}
            <TooltipProvider>
              <div className="space-y-1">
                {REPORT_SECTIONS.map(s => {
                  const hasData = currentData.length > 0;
                  return (
                    <Tooltip key={s.id}>
                      <TooltipTrigger asChild>
                        <div className={cn(
                          'flex items-center gap-2 py-1.5 px-1 rounded-md transition-colors',
                          !hasData && 'opacity-40'
                        )}>
                          <GripVertical className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                          <Checkbox id={s.id} checked={sections.includes(s.id)}
                            onCheckedChange={() => toggleSection(s.id)} disabled={!hasData} />
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.icon }} />
                          <Label htmlFor={s.id} className="text-sm cursor-pointer flex-1">{s.label}</Label>
                          <span className="text-[10px] text-muted-foreground">{s.slides} slide{s.slides > 1 ? 's' : ''}</span>
                        </div>
                      </TooltipTrigger>
                      {!hasData && (
                        <TooltipContent side="right" className="text-xs">No data available for this section</TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>

            <div className="text-[10px] text-muted-foreground text-center pt-1">
              {sections.length} sections • ~{totalSlides} slides
            </div>
          </CardContent>
        </Card>

        {/* Right: Downloads + Preview */}
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
              {/* Download Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* PPTX - Primary */}
                <Card className="bg-card border-border hover:shadow-md transition-all relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 to-purple-500" />
                  <CardContent className="py-5 text-center">
                    <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20 mb-2">Most Popular</Badge>
                    <Presentation className="h-8 w-8 mx-auto text-primary mb-2" />
                    <h3 className="font-semibold">PowerPoint</h3>
                    <p className="text-[10px] text-muted-foreground mt-1">12-slide storytelling deck with executive summary, KPIs, and recommendations.</p>
                    <Button className="mt-3 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      onClick={() => handleExport('pptx')} disabled={!!isExporting}>
                      {isExporting === 'pptx' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Layers className="h-4 w-4 mr-2" />}
                      Download PPTX
                    </Button>
                    <p className="text-[10px] text-muted-foreground mt-2">{CREDIT_COSTS.pptx} credits per report</p>
                  </CardContent>
                </Card>

                {/* PDF */}
                <Card className="bg-card border-border hover:shadow-md transition-all relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: '#DC2626' }} />
                  <CardContent className="py-5 text-center pt-7">
                    <File className="h-8 w-8 mx-auto mb-2" style={{ color: '#DC2626' }} />
                    <h3 className="font-semibold">PDF Report</h3>
                    <p className="text-[10px] text-muted-foreground mt-1">Professional multi-page PDF with KPIs, trends, insights, and narrative analysis.</p>
                    <Button className="mt-3 w-full text-white" style={{ backgroundColor: '#DC2626' }}
                      onClick={() => handleExport('pdf')} disabled={!!isExporting}>
                      {isExporting === 'pdf' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                      Download PDF
                    </Button>
                    <p className="text-[10px] text-muted-foreground mt-2">{CREDIT_COSTS.pdf} credits per report</p>
                  </CardContent>
                </Card>

                {/* DOCX */}
                <Card className="bg-card border-border hover:shadow-md transition-all relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: '#1D4ED8' }} />
                  <CardContent className="py-5 text-center pt-7">
                    <FileText className="h-8 w-8 mx-auto mb-2" style={{ color: '#1D4ED8' }} />
                    <h3 className="font-semibold">Word Document</h3>
                    <p className="text-[10px] text-muted-foreground mt-1">10-section professional report with deep narrative, quality analysis, and data appendix.</p>
                    <Button className="mt-3 w-full text-white" style={{ backgroundColor: '#1D4ED8' }}
                      onClick={() => handleExport('docx')} disabled={!!isExporting}>
                      {isExporting === 'docx' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                      Download DOCX
                    </Button>
                    <p className="text-[10px] text-muted-foreground mt-2">{CREDIT_COSTS.docx} credits per report</p>
                  </CardContent>
                </Card>
              </div>

              {/* Report Preview */}
              {reportStats && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />Report Preview
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{tpl.icon} {tpl.name}</Badge>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => setPreviewSlide(Math.max(0, previewSlide - 1))} disabled={previewSlide <= 0}>
                            <ChevronLeft className="h-3 w-3" />
                          </Button>
                          <span className="text-[10px] text-muted-foreground">
                            {previewSlide + 1} of {previewSections.length}
                          </span>
                          <Button variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => setPreviewSlide(Math.min(previewSections.length - 1, previewSlide + 1))}
                            disabled={previewSlide >= previewSections.length - 1}>
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {/* Slide thumbnails */}
                    <ScrollArea className="w-full">
                      <div className="flex gap-1.5 pt-2">
                        {previewSections.map((sid, i) => {
                          const sec = REPORT_SECTIONS.find(s => s.id === sid);
                          return (
                            <button key={sid} onClick={() => setPreviewSlide(i)}
                              className={cn(
                                'shrink-0 px-2 py-1 rounded text-[9px] border transition-colors',
                                i === previewSlide
                                  ? 'bg-primary/10 border-primary/40 text-primary font-medium'
                                  : 'border-border text-muted-foreground hover:bg-muted/50'
                              )}>
                              {i + 1}. {sec?.label || sid}
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[420px]">
                      <div className="space-y-4 pr-4">
                        {previewSections[previewSlide] === 'title' && (
                          <div className="text-center py-8 border rounded-lg border-border bg-muted/20">
                            <div className="flex gap-0.5 mx-auto w-32 rounded overflow-hidden h-2 mb-4">
                              {tpl.colors.map((c, i) => <div key={i} className="flex-1" style={{ backgroundColor: c }} />)}
                            </div>
                            <h2 className="text-xl font-bold">{formatDatasetName(reportStats.title)}</h2>
                            <p className="text-xs text-primary font-medium mt-1">Data Intelligence Report</p>
                            <p className="text-xs text-muted-foreground mt-1">{reportStats.date} • {reportStats.rowCount.toLocaleString()} rows • {reportStats.userName}</p>
                          </div>
                        )}
                        {previewSections[previewSlide] === 'executive-summary' && (
                          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                            <h3 className="text-sm font-semibold mb-2 text-primary">Executive Summary</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{generateNarrative('executive-summary', reportStats, tpl.tone).substring(0, 500)}...</p>
                          </div>
                        )}
                        {previewSections[previewSlide] === 'summary' && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2">Dataset Overview</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{generateNarrative('dataset-overview', reportStats, tpl.tone).substring(0, 400)}...</p>
                          </div>
                        )}
                        {previewSections[previewSlide] === 'kpis' && (
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
                        {previewSections[previewSlide] === 'trends' && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2">Trends</h3>
                            <div className="space-y-1">
                              {reportStats.trends.map((t, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                  <span>{formatDatasetName(t.col)}</span>
                                  <span className={t.change > 1 ? 'text-emerald-500 font-medium' : t.change < -1 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                                    {t.direction} ({t.change > 0 ? '+' : ''}{t.change}%)
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {previewSections[previewSlide] === 'positives' && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2 text-emerald-500">Positive Findings</h3>
                            <p className="text-xs text-muted-foreground mb-1">{generateNarrative('positives', reportStats, tpl.tone).substring(0, 200)}...</p>
                            <ul className="space-y-1">{(reportStats.positives.length ? reportStats.positives : ['Metrics stable']).map((p, i) => <li key={i} className="text-sm text-emerald-600">• {p}</li>)}</ul>
                          </div>
                        )}
                        {previewSections[previewSlide] === 'negatives' && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2 text-destructive">Critical Issues</h3>
                            <p className="text-xs text-muted-foreground mb-1">{generateNarrative('negatives', reportStats, tpl.tone).substring(0, 200)}...</p>
                            <ul className="space-y-1">{reportStats.risks.map((r, i) => <li key={i} className="text-sm text-destructive">• {r}</li>)}</ul>
                          </div>
                        )}
                        {previewSections[previewSlide] === 'deep-insights' && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2">AI Insights</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{generateNarrative('deep-insights', reportStats, tpl.tone).substring(0, 400)}...</p>
                          </div>
                        )}
                        {previewSections[previewSlide] === 'recommendations' && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2">Recommendations</h3>
                            <p className="text-xs text-muted-foreground mb-1">{generateNarrative('recommendations', reportStats, tpl.tone).substring(0, 200)}...</p>
                            <ul className="space-y-1">{reportStats.recommendations.map((r, i) => <li key={i} className="text-sm text-muted-foreground">→ {r}</li>)}</ul>
                          </div>
                        )}
                        {/* Fallback for sections not explicitly handled */}
                        {!['title', 'executive-summary', 'summary', 'kpis', 'trends', 'positives', 'negatives', 'deep-insights', 'recommendations'].includes(previewSections[previewSlide] || '') && (
                          <div className="py-8 text-center text-muted-foreground">
                            <p className="text-sm">Preview for "{REPORT_SECTIONS.find(s => s.id === previewSections[previewSlide])?.label}" section</p>
                            <p className="text-xs mt-1">Content will be generated in the exported report</p>
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

      {/* ── Report History ── */}
      {history.length > 0 && (
        <>
          <Separator />
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4" />Previously Generated Reports</h3>
            </div>
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-2">
                {history.map(h => (
                  <Card key={h.id} className="bg-card border-border shrink-0 w-[220px]">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className="text-[9px] text-white px-1.5 py-0" style={{ backgroundColor: formatBadge[h.format]?.color }}>
                          {formatBadge[h.format]?.label}
                        </Badge>
                        <span className="text-xs font-semibold truncate">{h.templateName}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground space-y-0.5">
                        <p className="truncate">{formatDatasetName(h.datasetName)}</p>
                        <p>{h.sectionCount} sections</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(h.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' • '}
                        {new Date(h.generatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                      <Button variant="ghost" size="sm" className="w-full h-7 text-[10px] text-destructive hover:text-destructive"
                        onClick={() => deleteHistory(h.id)}>
                        <Trash2 className="h-3 w-3 mr-1" />Remove
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </>
      )}

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
