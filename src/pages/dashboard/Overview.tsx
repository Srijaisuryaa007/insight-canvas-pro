import { useEffect, useState } from 'react';
import { 
  Database, 
  BarChart3, 
  Sparkles, 
  TrendingUp,
  Plus,
  Upload
} from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { VisualizationEngine } from '@/components/charts/VisualizationEngine';
import { DatasetUploader } from '@/components/data/DatasetUploader';
import { ColumnInspector } from '@/components/data/ColumnInspector';
import { CopilotChat } from '@/components/copilot/CopilotChat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { generateMockData } from '@/lib/dataParser';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Overview() {
  const { user } = useAuth();
  const { 
    workspaces, 
    currentWorkspace, 
    datasets, 
    currentDataset,
    createWorkspace,
    qualityReports 
  } = useWorkspace();
  
  const [showUploader, setShowUploader] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [demoData, setDemoData] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    // Generate demo data for visualization
    const { data } = generateMockData();
    setDemoData(data);
  }, []);

  const handleCreateWorkspace = () => {
    if (newWorkspaceName.trim()) {
      createWorkspace(newWorkspaceName);
      setNewWorkspaceName('');
    }
  };

  // Aggregate data for charts
  const revenueByCategory = demoData.reduce((acc, row) => {
    const category = row.category as string;
    const revenue = row.revenue as number;
    const existing = acc.find(a => a.category === category);
    if (existing) {
      existing.revenue += revenue;
    } else {
      acc.push({ category, revenue });
    }
    return acc;
  }, [] as { category: string; revenue: number }[]);

  const revenueByDate = demoData.reduce((acc, row) => {
    const date = (row.date as string).slice(0, 7); // Group by month
    const revenue = row.revenue as number;
    const existing = acc.find(a => a.date === date);
    if (existing) {
      existing.revenue += revenue;
    } else {
      acc.push({ date, revenue });
    }
    return acc;
  }, [] as { date: string; revenue: number }[]).sort((a, b) => a.date.localeCompare(b.date));

  const totalRevenue = demoData.reduce((sum, row) => sum + (row.revenue as number), 0);
  const totalProfit = demoData.reduce((sum, row) => sum + (row.profit as number), 0);
  const avgRating = demoData.reduce((sum, row) => sum + (row.customer_rating as number), 0) / demoData.length;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-muted-foreground">
            Here's what's happening with your data today.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Workspace
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>Create Workspace</DialogTitle>
                <DialogDescription>
                  Create a new workspace to organize your datasets.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Workspace Name</Label>
                  <Input
                    id="workspace-name"
                    placeholder="e.g., Sales Analytics"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                  />
                </div>
                <Button onClick={handleCreateWorkspace} className="w-full">
                  Create Workspace
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={() => setShowUploader(!showUploader)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Data
          </Button>
        </div>
      </div>

      {/* Upload Section */}
      {showUploader && (
        <DatasetUploader onUploadComplete={() => setShowUploader(false)} />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue"
          value={`$${(totalRevenue / 1000).toFixed(0)}K`}
          change={12.5}
          trend="up"
          icon={TrendingUp}
        />
        <KPICard
          title="Total Profit"
          value={`$${(totalProfit / 1000).toFixed(0)}K`}
          change={8.2}
          trend="up"
          icon={BarChart3}
        />
        <KPICard
          title="Datasets"
          value={datasets.length}
          icon={Database}
        />
        <KPICard
          title="Avg. Rating"
          value={avgRating.toFixed(1)}
          change={-2.1}
          trend="down"
          icon={Sparkles}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-6">
          <VisualizationEngine
            chartType="bar"
            data={revenueByCategory}
            xAxis="category"
            yAxis="revenue"
            title="Revenue by Category"
            height={300}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <VisualizationEngine
              chartType="line"
              data={revenueByDate}
              xAxis="date"
              yAxis="revenue"
              title="Revenue Trend"
              height={250}
            />
            <VisualizationEngine
              chartType="pie"
              data={revenueByCategory.map(c => ({ name: c.category, value: c.revenue }))}
              xAxis="name"
              yAxis="value"
              title="Revenue Distribution"
              height={250}
            />
          </div>

          {/* Locked Chart Example */}
          <VisualizationEngine
            chartType="radar"
            data={revenueByCategory}
            xAxis="category"
            yAxis="revenue"
            title="Performance Radar"
            height={300}
          />
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Workspace Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Workspaces</span>
                <span className="font-medium">{workspaces.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Datasets</span>
                <span className="font-medium">{datasets.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Quality Scans</span>
                <span className="font-medium">{Object.keys(qualityReports).length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Mini Copilot */}
          <div className="h-96">
            <CopilotChat datasetId={currentDataset?.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
