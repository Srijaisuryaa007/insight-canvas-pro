import { CopilotChat } from '@/components/copilot/CopilotChat';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Database, Lightbulb, BarChart3 } from 'lucide-react';

export default function Copilot() {
  const { currentDataset, datasets } = useWorkspace();

  const features = [
    {
      icon: Lightbulb,
      title: 'Data Insights',
      description: 'Get AI-powered insights about trends, patterns, and anomalies'
    },
    {
      icon: BarChart3,
      title: 'Chart Recommendations',
      description: 'Receive suggestions for the best visualization types'
    },
    {
      icon: Database,
      title: 'Query Your Data',
      description: 'Ask natural language questions about your datasets'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />
            AI Copilot
          </h1>
          <p className="text-muted-foreground">
            Your intelligent data analysis assistant
          </p>
        </div>
        <Badge variant="outline">5 credits per query</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chat */}
        <div className="lg:col-span-2 h-[calc(100vh-14rem)]">
          <CopilotChat datasetId={currentDataset?.id} />
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Current Dataset */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Active Dataset</CardTitle>
            </CardHeader>
            <CardContent>
              {currentDataset ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{currentDataset.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {currentDataset.rowCount} rows • {currentDataset.columns.length} columns
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Select a dataset to enable context-aware analysis
                </p>
              )}
            </CardContent>
          </Card>

          {/* Capabilities */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Capabilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {features.map((feature, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <feature.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{feature.title}</p>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Datasets */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Your Datasets</CardTitle>
            </CardHeader>
            <CardContent>
              {datasets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No datasets uploaded yet
                </p>
              ) : (
                <div className="space-y-2">
                  {datasets.slice(0, 5).map(ds => (
                    <div 
                      key={ds.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                    >
                      <span className="text-sm">{ds.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {ds.rowCount} rows
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
