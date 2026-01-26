import { FileText, Download, Plus, Calendar, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVisuals } from '@/hooks/useVisuals';

export default function Reports() {
  const { isFeatureAvailable } = useVisuals();
  const canExport = isFeatureAvailable('export-pdf');

  const sampleReports = [
    {
      id: '1',
      name: 'Monthly Sales Summary',
      createdAt: '2024-01-15',
      pages: 12,
    },
    {
      id: '2',
      name: 'Data Quality Report',
      createdAt: '2024-01-10',
      pages: 5,
    },
    {
      id: '3',
      name: 'Customer Analytics',
      createdAt: '2024-01-08',
      pages: 8,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7" />
            Reports
          </h1>
          <p className="text-muted-foreground">
            Generate and export professional reports
          </p>
        </div>
        <Button disabled={!canExport}>
          <Plus className="h-4 w-4 mr-2" />
          Create Report
          {!canExport && <Lock className="h-4 w-4 ml-2" />}
        </Button>
      </div>

      {!canExport && (
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-600">PDF Export is a Pro Feature</p>
                <p className="text-sm text-muted-foreground">
                  Upgrade to Pro to create and export reports
                </p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto">
                Upgrade
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sampleReports.map(report => (
          <Card key={report.id} className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{report.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {report.createdAt}
                  </div>
                  <Badge variant="outline" className="mt-2">
                    {report.pages} pages
                  </Badge>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  disabled={!canExport}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
