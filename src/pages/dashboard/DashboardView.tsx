import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Database, Users } from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { ChartRenderer } from '@/components/charts/ChartRenderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardData {
  dataset: { name: string; rowCount: number; columns: any[] };
  data: Record<string, unknown>[];
}

export default function DashboardView() {
  const [dashData, setDashData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('datapulse_dashboard_view');
    if (stored) {
      setDashData(JSON.parse(stored));
    }
  }, []);

  if (!dashData || !dashData.data.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No dashboard data. Open from Reports page.</p>
      </div>
    );
  }

  const { dataset, data } = dashData;
  const columns = Object.keys(data[0]);
  const numericCols = columns.filter(c => typeof data[0][c] === 'number');
  const stringCols = columns.filter(c => typeof data[0][c] === 'string');
  const catKey = stringCols[0] || columns[0];
  const valKey = numericCols[0] || columns[1];
  const valKey2 = numericCols[1] || valKey;

  const grouped = data.reduce((acc, row) => {
    const k = String(row[catKey]);
    const existing = acc.find(a => a[catKey] === k);
    if (existing) {
      (existing as any)[valKey] = (Number(existing[valKey]) || 0) + (Number(row[valKey]) || 0);
    } else {
      acc.push({ [catKey]: k, [valKey]: Number(row[valKey]) || 0 });
    }
    return acc;
  }, [] as Record<string, unknown>[]);

  const totalSum = data.reduce((s, r) => s + (Number(r[valKey]) || 0), 0);
  const totalSum2 = data.reduce((s, r) => s + (Number(r[valKey2]) || 0), 0);
  const avg = totalSum / data.length;

  return (
    <div className="min-h-screen bg-background p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{dataset.name}</h1>
        <p className="text-muted-foreground">Dashboard — {data.length} rows</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Total Rows" value={data.length.toLocaleString()} icon={Database} />
        <KPICard title={`Total ${valKey}`} value={totalSum.toLocaleString()} icon={TrendingUp} />
        <KPICard title={`Avg ${valKey}`} value={avg.toFixed(1)} icon={BarChart3} />
        <KPICard title="Categories" value={grouped.length} icon={Users} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartRenderer type="bar" data={grouped} xAxis={catKey} yAxis={valKey} title={`${valKey} by ${catKey}`} height={300} />
        <ChartRenderer type="pie" data={grouped.map(g => ({ name: String(g[catKey]), value: Number(g[valKey]) }))} xAxis="name" yAxis="value" title="Distribution" height={300} />
        <ChartRenderer type="line" data={grouped} xAxis={catKey} yAxis={valKey} title={`${valKey} Trend`} height={250} />
        <ChartRenderer type="area" data={grouped} xAxis={catKey} yAxis={valKey} title={`${valKey} Area`} height={250} />
      </div>
    </div>
  );
}
