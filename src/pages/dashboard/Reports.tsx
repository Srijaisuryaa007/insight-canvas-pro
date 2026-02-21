import { useState } from 'react';
import { FileText, Download, Lock, CheckSquare, BarChart3, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { useExport } from '@/hooks/useExport';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/hooks/use-toast';

const CHART_OPTIONS = [
  { id: 'bar', label: 'Bar Chart' },
  { id: 'pie', label: 'Pie / Donut' },
  { id: 'line', label: 'Line Chart' },
  { id: 'area', label: 'Area Chart' },
  { id: 'scatter', label: 'Scatter Plot' },
  { id: 'table', label: 'Data Table' },
  { id: 'kpis', label: 'KPI Cards' },
  { id: 'waterfall', label: 'Waterfall' },
  { id: 'radar', label: 'Radar Chart' },
  { id: 'treemap', label: 'Treemap' },
];

export default function Reports() {
  const { isFeatureAvailable } = useSubscription();
  const { exportCSV, exportPDF, canExportPDF } = useExport();
  const { currentData, currentDataset } = useData();
  const canExport = isFeatureAvailable('export-pdf');
  const [selectedCharts, setSelectedCharts] = useState<string[]>(['bar', 'pie', 'kpis', 'table']);

  const toggleChart = (id: string) => {
    setSelectedCharts(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleExportCSV = () => {
    if (currentData.length === 0) {
      toast({ title: 'No data', description: 'Select a dataset first.', variant: 'destructive' });
      return;
    }
    exportCSV(currentData, currentDataset?.name || 'export');
  };

  const handleExportPDF = () => {
    if (!canExportPDF) {
      toast({ title: 'Pro Feature', description: 'Upgrade to Pro for PDF export.', variant: 'destructive' });
      return;
    }
    exportPDF({
      title: currentDataset?.name || 'DataPulse Report',
      sections: [{ title: 'Data Summary', data: currentData.slice(0, 50) }]
    }, currentDataset?.name || 'report');
  };

  const handleDownloadHTML = () => {
    if (currentData.length === 0) {
      toast({ title: 'No data', description: 'Select a dataset first.', variant: 'destructive' });
      return;
    }

    const columns = Object.keys(currentData[0]);
    const numCols = columns.filter(c => typeof currentData[0][c] === 'number');
    const strCols = columns.filter(c => typeof currentData[0][c] === 'string');
    const catKey = strCols[0] || columns[0];
    const valKey = numCols[0] || columns[1];

    const grouped: Record<string, number> = {};
    currentData.forEach(row => {
      const k = String(row[catKey]);
      grouped[k] = (grouped[k] || 0) + (Number(row[valKey]) || 0);
    });

    const totalSum = Object.values(grouped).reduce((a, b) => a + b, 0);
    const avgVal = totalSum / Object.keys(grouped).length;

    const showKPIs = selectedCharts.includes('kpis');
    const showBar = selectedCharts.includes('bar');
    const showPie = selectedCharts.includes('pie');
    const showLine = selectedCharts.includes('line');
    const showArea = selectedCharts.includes('area');
    const showTable = selectedCharts.includes('table');

    const chartScripts: string[] = [];
    if (showBar) chartScripts.push(`new Chart(document.getElementById('barChart'),{type:'bar',data:{labels,datasets:[{label:'${valKey}',data:values,backgroundColor:colors}]},options:{responsive:true,plugins:{legend:{display:false,position:'bottom'}}}});`);
    if (showPie) chartScripts.push(`new Chart(document.getElementById('pieChart'),{type:'doughnut',data:{labels,datasets:[{data:values,backgroundColor:colors}]},options:{responsive:true,plugins:{legend:{position:'bottom'}}}});`);
    if (showLine) chartScripts.push(`new Chart(document.getElementById('lineChart'),{type:'line',data:{labels,datasets:[{label:'${valKey}',data:values,borderColor:colors[0],tension:0.3,fill:false}]},options:{responsive:true,plugins:{legend:{position:'bottom'}}}});`);
    if (showArea) chartScripts.push(`new Chart(document.getElementById('areaChart'),{type:'line',data:{labels,datasets:[{label:'${valKey}',data:values,borderColor:colors[0],backgroundColor:colors[0]+'33',tension:0.3,fill:true}]},options:{responsive:true,plugins:{legend:{position:'bottom'}}}});`);

    const chartCanvases = [
      showBar ? '<div class="chart-card"><h3>Bar Chart</h3><canvas id="barChart"></canvas></div>' : '',
      showPie ? '<div class="chart-card"><h3>Distribution</h3><canvas id="pieChart"></canvas></div>' : '',
      showLine ? '<div class="chart-card"><h3>Trend</h3><canvas id="lineChart"></canvas></div>' : '',
      showArea ? '<div class="chart-card"><h3>Area</h3><canvas id="areaChart"></canvas></div>' : '',
    ].filter(Boolean).join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${currentDataset?.name || 'Dashboard'} — DataPulse Report</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#fafafa;padding:2rem}
h1{font-size:1.5rem;margin-bottom:1.5rem}
h3{font-size:.9rem;margin-bottom:.75rem;color:#888}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:2rem}
.kpi{background:#1a1a2e;border-radius:12px;padding:1.5rem;border:1px solid #2a2a3e}
.kpi-label{font-size:.75rem;color:#888;text-transform:uppercase;letter-spacing:.05em}
.kpi-value{font-size:2rem;font-weight:700;margin-top:.5rem}
.charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(400px,1fr));gap:1.5rem}
.chart-card{background:#1a1a2e;border-radius:12px;padding:1.5rem;border:1px solid #2a2a3e}
canvas{max-height:300px}
table{width:100%;border-collapse:collapse;margin-top:2rem}
th,td{padding:.5rem 1rem;text-align:left;border-bottom:1px solid #2a2a3e;font-size:.8rem}
th{color:#888;text-transform:uppercase;font-size:.7rem;letter-spacing:.05em}
.footer{margin-top:3rem;text-align:center;color:#555;font-size:.7rem}
</style>
</head>
<body>
<h1>📊 ${currentDataset?.name || 'Dashboard'}</h1>
${showKPIs ? `<div class="kpis">
  <div class="kpi"><div class="kpi-label">Total Rows</div><div class="kpi-value">${currentData.length.toLocaleString()}</div></div>
  <div class="kpi"><div class="kpi-label">Total ${valKey}</div><div class="kpi-value">${totalSum.toLocaleString()}</div></div>
  <div class="kpi"><div class="kpi-label">Average ${valKey}</div><div class="kpi-value">${avgVal.toFixed(1)}</div></div>
  <div class="kpi"><div class="kpi-label">Categories</div><div class="kpi-value">${Object.keys(grouped).length}</div></div>
</div>` : ''}
<div class="charts">${chartCanvases}</div>
${showTable ? `<table>
<thead><tr>${columns.slice(0, 8).map(c => `<th>${c}</th>`).join('')}</tr></thead>
<tbody>${currentData.slice(0, 30).map(r => `<tr>${columns.slice(0, 8).map(c => `<td>${r[c] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>
</table>` : ''}
<div class="footer">Generated by DataPulse Analytics • ${new Date().toLocaleDateString()}</div>
<script>
const labels=${JSON.stringify(Object.keys(grouped).slice(0, 15))};
const values=${JSON.stringify(Object.values(grouped).slice(0, 15))};
const colors=['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe','#ede9fe','#f5f3ff','#818cf8','#4f46e5','#4338ca','#3730a3','#312e81','#e0e7ff','#c7d2fe','#a5b4fc'];
${chartScripts.join('\n')}
<\/script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${currentDataset?.name || 'dashboard'}.html`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: 'Dashboard Downloaded', description: 'Open the HTML file in any browser to view your interactive dashboard.' });
  };

  const handleConnectPowerBI = () => {
    toast({ 
      title: 'Power BI Integration', 
      description: 'Export your data as CSV and import into Power BI Desktop, or use the REST API endpoint for DirectQuery.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7" />Reports & Export
          </h1>
          <p className="text-muted-foreground">Export data, generate reports, and download dashboards</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />CSV
          </Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={!canExport}>
            <FileText className="h-4 w-4 mr-2" />PDF
            {!canExport && <Lock className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>

      {!canExport && (
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-600">PDF Export is a Pro Feature</p>
                <p className="text-sm text-muted-foreground">Upgrade to Pro to create and export PDF reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Component Selection */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Select Dashboard Components
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Choose which components to include in the downloaded dashboard</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {CHART_OPTIONS.map(opt => (
              <div key={opt.id} className="flex items-center gap-2">
                <Checkbox
                  id={opt.id}
                  checked={selectedCharts.includes(opt.id)}
                  onCheckedChange={() => toggleChart(opt.id)}
                />
                <Label htmlFor={opt.id} className="text-sm cursor-pointer">{opt.label}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardContent className="py-8 text-center">
            <Download className="h-10 w-10 mx-auto text-primary mb-3" />
            <h3 className="font-medium text-lg">Download Dashboard</h3>
            <p className="text-muted-foreground text-sm mt-1">Download a self-contained HTML file with interactive charts. Opens in any browser.</p>
            <Badge variant="outline" className="mt-2 text-xs">{selectedCharts.length} components selected</Badge>
            <Button className="mt-4 w-full" onClick={handleDownloadHTML}>
              <Download className="h-4 w-4 mr-2" />Download HTML Dashboard
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="py-8 text-center">
            <Link2 className="h-10 w-10 mx-auto text-primary mb-3" />
            <h3 className="font-medium text-lg">Connect to Power BI</h3>
            <p className="text-muted-foreground text-sm mt-1">Export your data for use in Power BI Desktop or connect via REST API</p>
            <Badge variant="outline" className="mt-2 text-xs">Enterprise Feature</Badge>
            <Button className="mt-4 w-full" variant="outline" onClick={handleConnectPowerBI}>
              <BarChart3 className="h-4 w-4 mr-2" />Connect Power BI
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
