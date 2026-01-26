import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Plus,
  Lock,
  Sparkles
} from 'lucide-react';
import { VisualizationEngine } from '@/components/charts/VisualizationEngine';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useVisuals } from '@/hooks/useVisuals';
import { ChartType, CHART_LABELS } from '@/types';
import { cn } from '@/lib/utils';
import { generateMockData } from '@/lib/dataParser';

export default function Visualizations() {
  const { currentDataset, datasets, selectDataset } = useWorkspace();
  const { getAllCharts, getAvailableCharts, isChartAvailable, plan } = useVisuals();
  
  const [selectedChart, setSelectedChart] = useState<ChartType>('bar');
  const [xAxis, setXAxis] = useState<string>('');
  const [yAxis, setYAxis] = useState<string>('');
  const [chartData, setChartData] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    // Load demo data or actual dataset data
    if (currentDataset) {
      const storedData = localStorage.getItem(`datapulse_data_${currentDataset.id}`);
      if (storedData) {
        const data = JSON.parse(storedData);
        setChartData(data);
        if (currentDataset.columns.length > 0) {
          const stringCol = currentDataset.columns.find(c => c.type === 'string');
          const numCol = currentDataset.columns.find(c => c.type === 'number');
          if (stringCol) setXAxis(stringCol.name);
          if (numCol) setYAxis(numCol.name);
        }
      }
    } else {
      const { data } = generateMockData();
      setChartData(data);
      setXAxis('category');
      setYAxis('revenue');
    }
  }, [currentDataset]);

  const availableCharts = getAvailableCharts();
  const allCharts = getAllCharts();

  // Get columns for axis selection
  const columns = currentDataset?.columns || [
    { name: 'category', type: 'string' },
    { name: 'region', type: 'string' },
    { name: 'revenue', type: 'number' },
    { name: 'quantity', type: 'number' },
    { name: 'profit', type: 'number' },
  ];

  // Aggregate data for visualization
  const getAggregatedData = () => {
    if (!xAxis || !yAxis) return [];
    
    const aggregated = chartData.reduce((acc, row) => {
      const key = String(row[xAxis]);
      const value = Number(row[yAxis]) || 0;
      const existing = acc.find(a => a[xAxis] === key);
      if (existing) {
        (existing as Record<string, unknown>)[yAxis] = (Number(existing[yAxis]) || 0) + value;
      } else {
        acc.push({ [xAxis]: key, [yAxis]: value });
      }
      return acc;
    }, [] as Record<string, unknown>[]);

    return aggregated;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Visualizations</h1>
          <p className="text-muted-foreground">
            Create stunning charts from your data
          </p>
        </div>
        <Badge variant="outline" className="capitalize">
          {plan} Plan
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chart Type Selection */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Chart Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {allCharts.map(chart => {
              const available = isChartAvailable(chart);
              return (
                <button
                  key={chart}
                  onClick={() => setSelectedChart(chart)}
                  disabled={!available}
                  className={cn(
                    "w-full p-3 rounded-lg text-left transition-colors flex items-center justify-between",
                    selectedChart === chart
                      ? "bg-primary/10 border border-primary/20"
                      : available
                        ? "hover:bg-muted"
                        : "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-sm">{CHART_LABELS[chart]}</span>
                  </div>
                  {!available && <Lock className="h-4 w-4 text-muted-foreground" />}
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Chart Configuration & Preview */}
        <div className="lg:col-span-3 space-y-6">
          {/* Configuration */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Configure Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Dataset</Label>
                  <Select 
                    value={currentDataset?.id || 'demo'} 
                    onValueChange={(v) => v !== 'demo' && selectDataset(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select dataset" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="demo">Demo Data</SelectItem>
                      {datasets.map(ds => (
                        <SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>X Axis</Label>
                  <Select value={xAxis} onValueChange={setXAxis}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {columns.map(col => (
                        <SelectItem key={col.name} value={col.name}>
                          {col.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Y Axis</Label>
                  <Select value={yAxis} onValueChange={setYAxis}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {columns.filter(c => c.type === 'number').map(col => (
                        <SelectItem key={col.name} value={col.name}>
                          {col.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chart Preview */}
          <VisualizationEngine
            chartType={selectedChart}
            data={getAggregatedData()}
            xAxis={xAxis}
            yAxis={yAxis}
            title={`${CHART_LABELS[selectedChart]}: ${yAxis} by ${xAxis}`}
            height={400}
          />

          {/* Available Charts Grid */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                More Visualizations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {allCharts.filter(c => c !== selectedChart).slice(0, 4).map(chart => (
                  <div key={chart} className="aspect-video">
                    <VisualizationEngine
                      chartType={chart}
                      data={getAggregatedData().slice(0, 5)}
                      xAxis={xAxis}
                      yAxis={yAxis}
                      height={120}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
