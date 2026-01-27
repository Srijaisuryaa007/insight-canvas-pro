import { useState } from 'react';
import { runQualityScan, QualityReport } from '@/lib/api';
import { useSubscription } from './useSubscription';
import { toast } from '@/hooks/use-toast';

export function useDataQuality() {
  const [isScanning, setIsScanning] = useState(false);
  const [report, setReport] = useState<QualityReport | null>(null);
  const { consumeCredits } = useSubscription();

  const scanDataset = async (datasetId: string): Promise<QualityReport | null> => {
    if (!consumeCredits('quality-scan')) {
      return null;
    }

    setIsScanning(true);

    try {
      const result = await runQualityScan(datasetId);
      
      if (result.report) {
        setReport(result.report);
        toast({
          title: 'Quality Scan Complete',
          description: `Score: ${result.report.overallScore}% | ${result.report.issues.length} issues found`
        });
        return result.report;
      } else {
        toast({
          title: 'Scan Failed',
          description: result.error || 'Unknown error',
          variant: 'destructive'
        });
        return null;
      }
    } catch (error) {
      console.error('Quality scan error:', error);
      toast({
        title: 'Scan Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsScanning(false);
    }
  };

  return {
    isScanning,
    report,
    scanDataset,
    setReport,
  };
}
