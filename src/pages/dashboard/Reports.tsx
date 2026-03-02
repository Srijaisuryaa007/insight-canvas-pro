import { useState, useMemo } from 'react';
import { FileText, Download, Lock, CheckSquare, FileDown, Presentation, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSubscription } from '@/hooks/useSubscription';
import { useExport } from '@/hooks/useExport';
import { useData } from '@/contexts/DataContext';
import { useDataQuality } from '@/hooks/useDataQuality';
import { toast } from '@/hooks/use-toast';

const REPORT_SECTIONS = [
  { id: 'title', label: 'Title Page', default: true },
  { id: 'summary', label: 'Dataset Summary', default: true },
  { id: 'kpis', label: 'KPI Overview', default: true },
  { id: 'trends', label: 'Trends Analysis', default: true },
  { id: 'positives', label: 'Positive Findings', default: true },
  { id: 'negatives', label: 'Negative Findings', default: true },
  { id: 'risks', label: 'Risks', default: true },
  { id: 'recommendations', label: 'Recommendations', default: true },
  { id: 'quality', label: 'Data Quality Summary', default: true },
  { id: 'data-table', label: 'Data Table (Top 50)', default: false },
];

export default function Reports() {
  const { isFeatureAvailable } = useSubscription();
  const { exportCSV } = useExport();
  const { currentData, currentDataset } = useData();
  const { report: qualityReport } = useDataQuality();
  const canExport = isFeatureAvailable('export-pdf');
  const [sections, setSections] = useState<string[]>(REPORT_SECTIONS.filter(s => s.default).map(s => s.id));
  const [reportTitle, setReportTitle] = useState('');

  const toggleSection = (id: string) => {
    setSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  // Compute report data
  const reportData = useMemo(() => {
    if (!currentData.length) return null;
    const columns = Object.keys(currentData[0]);
    const numCols = columns.filter(c => typeof currentData[0][c] === 'number');
    const strCols = columns.filter(c => typeof currentData[0][c] === 'string');

    const kpis: Array<{ label: string; value: string }> = [
      { label: 'Total Rows', value: currentData.length.toLocaleString() },
      { label: 'Columns', value: columns.length.toString() },
    ];
    numCols.slice(0, 4).forEach(col => {
      const vals = currentData.map(r => Number(r[col]) || 0);
      const sum = vals.reduce((a, b) => a + b, 0);
      const avg = sum / vals.length;
      const isAvg = col.toLowerCase().includes('rate') || col.toLowerCase().includes('score') || col.toLowerCase().includes('rating');
      kpis.push({ label: isAvg ? `Avg ${col}` : `Total ${col}`, value: isAvg ? avg.toFixed(1) : sum.toLocaleString() });
    });

    // Trends: compare first/second half
    const trends: Array<{ col: string; change: number; direction: string }> = [];
    numCols.slice(0, 3).forEach(col => {
      const vals = currentData.map(r => Number(r[col]) || 0);
      const first = vals.slice(0, Math.floor(vals.length / 2));
      const second = vals.slice(Math.floor(vals.length / 2));
      const fAvg = first.reduce((a, b) => a + b, 0) / (first.length || 1);
      const sAvg = second.reduce((a, b) => a + b, 0) / (second.length || 1);
      const change = fAvg ? ((sAvg - fAvg) / fAvg) * 100 : 0;
      trends.push({ col, change: Math.round(change * 10) / 10, direction: change > 1 ? 'Increasing' : change < -1 ? 'Decreasing' : 'Stable' });
    });

    const positives = trends.filter(t => t.change > 5).map(t => `${t.col} shows ${t.change}% growth`);
    const negatives = trends.filter(t => t.change < -5).map(t => `${t.col} declined by ${Math.abs(t.change)}%`);
    const risks = negatives.length > 0 ? negatives.map(n => `Monitor: ${n}`) : ['No significant risks detected'];
    const recommendations = [
      ...positives.length ? ['Continue investing in top-performing areas'] : [],
      ...negatives.length ? ['Investigate declining metrics and take corrective action'] : [],
      'Schedule regular data quality scans',
      'Review outlier data points for accuracy',
    ];

    return { kpis, trends, positives, negatives, risks, recommendations };
  }, [currentData]);

  const title = reportTitle || currentDataset?.name || 'Analytics Report';

  const handleExportCSV = () => {
    if (!currentData.length) { toast({ title: 'No data', variant: 'destructive' }); return; }
    exportCSV(currentData, currentDataset?.name || 'export');
  };

  const handleExportCleanedCSV = () => {
    if (!currentData.length) { toast({ title: 'No data', variant: 'destructive' }); return; }
    exportCSV(currentData, `${currentDataset?.name || 'data'}-cleaned`);
    toast({ title: 'Cleaned CSV Downloaded', description: 'CSV reflects all applied data quality fixes.' });
  };

  const generateReportHTML = () => {
    if (!currentData.length || !reportData) return '';
    const cols = Object.keys(currentData[0]);
    const numCols = cols.filter(c => typeof currentData[0][c] === 'number');
    const catKey = cols.find(c => typeof currentData[0][c] === 'string') || cols[0];
    const valKey = numCols[0] || cols[1];

    const grouped: Record<string, number> = {};
    currentData.forEach(r => { const k = String(r[catKey]); grouped[k] = (grouped[k] || 0) + (Number(r[valKey]) || 0); });

    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,sans-serif;background:#09090b;color:#fafafa;max-width:900px;margin:0 auto;padding:3rem 2rem}
h1{font-size:2rem;margin-bottom:.5rem}h2{font-size:1.2rem;margin:2rem 0 1rem;color:#a1a1aa;border-bottom:1px solid #27272a;padding-bottom:.5rem}
.subtitle{color:#71717a;font-size:.85rem;margin-bottom:2rem}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-bottom:2rem}
.kpi{background:#18181b;border:1px solid #27272a;border-radius:12px;padding:1.25rem}
.kpi-label{font-size:.7rem;color:#71717a;text-transform:uppercase;letter-spacing:.05em}
.kpi-value{font-size:1.8rem;font-weight:700;margin-top:.25rem}
.section{background:#18181b;border:1px solid #27272a;border-radius:12px;padding:1.5rem;margin-bottom:1.5rem}
.section h3{font-size:.9rem;margin-bottom:.75rem;color:#d4d4d8}
ul{padding-left:1.5rem}li{margin:.3rem 0;font-size:.85rem;color:#a1a1aa}
.positive{color:#22c55e}.negative{color:#ef4444}.neutral{color:#71717a}
.chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:2rem}
.chart-card{background:#18181b;border:1px solid #27272a;border-radius:12px;padding:1.25rem}
.chart-card h3{font-size:.8rem;color:#71717a;margin-bottom:.75rem}
canvas{max-height:250px}
table{width:100%;border-collapse:collapse;font-size:.8rem;margin-top:1rem}
th,td{padding:.5rem;text-align:left;border-bottom:1px solid #27272a}th{color:#71717a;font-size:.7rem;text-transform:uppercase}
.footer{text-align:center;color:#3f3f46;font-size:.7rem;margin-top:3rem;padding-top:1rem;border-top:1px solid #27272a}
.badge{display:inline-block;padding:.15rem .5rem;border-radius:6px;font-size:.65rem;font-weight:600}
.badge-good{background:#22c55e20;color:#22c55e}.badge-warn{background:#f59e0b20;color:#f59e0b}.badge-bad{background:#ef444420;color:#ef4444}
@media print{body{background:#fff;color:#000}h2{color:#333}.section{border-color:#e5e5e5;background:#fafafa}.kpi{background:#fafafa;border-color:#e5e5e5}}
</style></head><body>
${sections.includes('title') ? `<h1>📊 ${title}</h1><p class="subtitle">Generated ${new Date().toLocaleDateString()} • ${currentData.length} rows • ${cols.length} columns</p>` : ''}
${sections.includes('summary') ? `<div class="section"><h3>Dataset Summary</h3><p style="font-size:.85rem;color:#a1a1aa">${currentDataset?.name || 'Dataset'} contains ${currentData.length.toLocaleString()} rows across ${cols.length} columns. Numeric columns: ${numCols.join(', ') || 'None'}.</p></div>` : ''}
${sections.includes('kpis') ? `<h2>Key Performance Indicators</h2><div class="kpis">${reportData.kpis.map(k => `<div class="kpi"><div class="kpi-label">${k.label}</div><div class="kpi-value">${k.value}</div></div>`).join('')}</div>` : ''}
${sections.includes('trends') ? `<h2>Trend Analysis</h2><div class="chart-grid"><div class="chart-card"><h3>Distribution</h3><canvas id="barChart"></canvas></div><div class="chart-card"><h3>Composition</h3><canvas id="pieChart"></canvas></div></div><div class="section">${reportData.trends.map(t => `<p style="margin:.3rem 0;font-size:.85rem"><span class="${t.change > 1 ? 'positive' : t.change < -1 ? 'negative' : 'neutral'}">${t.direction}</span>: ${t.col} (${t.change > 0 ? '+' : ''}${t.change}%)</p>`).join('')}</div>` : ''}
${sections.includes('positives') ? `<h2>Positive Findings</h2><div class="section"><ul>${(reportData.positives.length ? reportData.positives : ['All metrics appear stable']).map(p => `<li class="positive">✓ ${p}</li>`).join('')}</ul></div>` : ''}
${sections.includes('negatives') ? `<h2>Areas of Concern</h2><div class="section"><ul>${(reportData.negatives.length ? reportData.negatives : ['No significant declines detected']).map(n => `<li class="negative">⚠ ${n}</li>`).join('')}</ul></div>` : ''}
${sections.includes('risks') ? `<h2>Risks</h2><div class="section"><ul>${reportData.risks.map(r => `<li>🔍 ${r}</li>`).join('')}</ul></div>` : ''}
${sections.includes('recommendations') ? `<h2>Recommendations</h2><div class="section"><ul>${reportData.recommendations.map(r => `<li>→ ${r}</li>`).join('')}</ul></div>` : ''}
${sections.includes('quality') ? `<h2>Data Quality</h2><div class="section">${qualityReport ? `<p style="font-size:.85rem">Score: <span class="badge ${qualityReport.overallScore >= 80 ? 'badge-good' : qualityReport.overallScore >= 50 ? 'badge-warn' : 'badge-bad'}">${qualityReport.overallScore}%</span> • ${qualityReport.issues.length} issues detected</p><ul>${qualityReport.issues.slice(0, 5).map(i => `<li>${i.column}: ${i.type} (${i.count} occurrences)</li>`).join('')}</ul>` : '<p style="font-size:.85rem;color:#71717a">No quality scan performed yet.</p>'}</div>` : ''}
${sections.includes('data-table') ? `<h2>Data Sample</h2><div style="overflow-x:auto"><table><thead><tr>${cols.slice(0, 8).map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${currentData.slice(0, 50).map(r => `<tr>${cols.slice(0, 8).map(c => `<td>${r[c] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}
<div class="footer">DataPulse Analytics Report • ${new Date().toLocaleDateString()}</div>
<script>
const labels=${JSON.stringify(Object.keys(grouped).slice(0, 12))};
const values=${JSON.stringify(Object.values(grouped).slice(0, 12))};
const colors=['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#22c55e','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16','#14b8a6','#f97316'];
${sections.includes('trends') ? `
try{
new Chart(document.getElementById('barChart'),{type:'bar',data:{labels,datasets:[{label:'${valKey}',data:values,backgroundColor:colors}]},options:{responsive:true,plugins:{legend:{display:false}}}});
new Chart(document.getElementById('pieChart'),{type:'doughnut',data:{labels,datasets:[{data:values,backgroundColor:colors}]},options:{responsive:true,plugins:{legend:{position:'bottom',labels:{font:{size:10}}}}}});
}catch(e){}
` : ''}
<\/script></body></html>`;
  };

  const handleDownloadReport = () => {
    if (!currentData.length) { toast({ title: 'No data', variant: 'destructive' }); return; }
    const html = generateReportHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-report.html`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: 'Report Downloaded', description: 'Open in any browser to view and print.' });
  };

  // Preview
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7" />Reports
          </h1>
          <p className="text-muted-foreground">Generate professional reports from your data</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={!currentData.length}>
            <Download className="h-4 w-4 mr-2" />CSV
          </Button>
          <Button variant="outline" onClick={handleExportCleanedCSV} disabled={!currentData.length}>
            <FileDown className="h-4 w-4 mr-2" />Cleaned CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config panel */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="h-5 w-5" /> Report Sections
            </CardTitle>
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

        {/* Main area */}
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
              {/* Download options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-card border-border">
                  <CardContent className="py-6 text-center">
                    <Presentation className="h-8 w-8 mx-auto text-primary mb-2" />
                    <h3 className="font-medium">Download Report</h3>
                    <p className="text-xs text-muted-foreground mt-1">Professional HTML report with charts, KPIs, trends, and recommendations. Printable as PDF from browser.</p>
                    <Badge variant="outline" className="text-xs mt-2">{sections.length} sections selected</Badge>
                    <Button className="mt-3 w-full" onClick={handleDownloadReport}>
                      <Download className="h-4 w-4 mr-2" />Download Report
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="py-6 text-center">
                    <File className="h-8 w-8 mx-auto text-primary mb-2" />
                    <h3 className="font-medium">Preview Report</h3>
                    <p className="text-xs text-muted-foreground mt-1">Preview what the report will contain before downloading.</p>
                    <Badge variant="outline" className="text-xs mt-2">HTML + Charts</Badge>
                    <Button className="mt-3 w-full" variant="outline" onClick={() => setShowPreview(!showPreview)}>
                      {showPreview ? 'Hide Preview' : 'Show Preview'}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Preview panel */}
              {showPreview && reportData && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Report Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-4 pr-4">
                        {sections.includes('title') && (
                          <div className="text-center py-6 border-b border-border">
                            <h2 className="text-xl font-bold">{title}</h2>
                            <p className="text-xs text-muted-foreground mt-1">{new Date().toLocaleDateString()} • {currentData.length} rows</p>
                          </div>
                        )}
                        {sections.includes('kpis') && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2">Key Performance Indicators</h3>
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
                                <p key={i} className="text-xs">
                                  <span className={t.change > 1 ? 'text-emerald-500' : t.change < -1 ? 'text-destructive' : 'text-muted-foreground'}>
                                    {t.direction}
                                  </span>
                                  : {t.col} ({t.change > 0 ? '+' : ''}{t.change}%)
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                        {sections.includes('positives') && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2">Positive Findings</h3>
                            <ul className="text-xs space-y-1 text-emerald-500">
                              {(reportData.positives.length ? reportData.positives : ['All metrics appear stable']).map((p, i) => <li key={i}>✓ {p}</li>)}
                            </ul>
                          </div>
                        )}
                        {sections.includes('negatives') && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2">Areas of Concern</h3>
                            <ul className="text-xs space-y-1 text-destructive">
                              {(reportData.negatives.length ? reportData.negatives : ['No declines detected']).map((n, i) => <li key={i}>⚠ {n}</li>)}
                            </ul>
                          </div>
                        )}
                        {sections.includes('recommendations') && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2">Recommendations</h3>
                            <ul className="text-xs space-y-1 text-muted-foreground">
                              {reportData.recommendations.map((r, i) => <li key={i}>→ {r}</li>)}
                            </ul>
                          </div>
                        )}
                        {sections.includes('quality') && (
                          <div>
                            <h3 className="text-sm font-semibold mb-2">Data Quality</h3>
                            <p className="text-xs text-muted-foreground">
                              {qualityReport ? `Score: ${qualityReport.overallScore}% • ${qualityReport.issues.length} issues` : 'No scan performed'}
                            </p>
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
