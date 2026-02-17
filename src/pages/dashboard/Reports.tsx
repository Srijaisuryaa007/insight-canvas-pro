import { FileText, Download, Plus, Calendar, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { useExport } from '@/hooks/useExport';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/hooks/use-toast';

export default function Reports() {
  const { isFeatureAvailable } = useSubscription();
  const { exportCSV, exportPDF, canExportPDF } = useExport();
  const { currentData, currentDataset } = useData();
  const canExport = isFeatureAvailable('export-pdf');

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7" />Reports
          </h1>
          <p className="text-muted-foreground">Generate and export professional reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />Export CSV
          </Button>
          <Button onClick={handleExportPDF} disabled={!canExport}>
            <FileText className="h-4 w-4 mr-2" />Export PDF
            {!canExport && <Lock className="h-4 w-4 ml-2" />}
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
                <p className="text-sm text-muted-foreground">Upgrade to Pro to create and export reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg">Export Your Data</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
            Select a dataset from the Datasets page, then use the export buttons above to download as CSV or PDF.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
