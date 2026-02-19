import { useState } from 'react';
import { runQualityScan, QualityReport } from '@/lib/api';
import { runLocalQualityScan, generateFix, QualityFix } from '@/lib/qualityEngine';
import { useSubscription } from './useSubscription';
import { toast } from '@/hooks/use-toast';

export function useDataQuality() {
  const [isScanning, setIsScanning] = useState(false);
  const [report, setReport] = useState<QualityReport | null>(null);
  const { consumeCredits } = useSubscription();

  const scanDataset = async (datasetId: string, data?: Record<string, unknown>[]): Promise<QualityReport | null> => {
    if (!consumeCredits('quality-scan')) {
      return null;
    }

    setIsScanning(true);

    try {
      // Try backend first
      const result = await runQualityScan(datasetId);
      
      if (result.report) {
        setReport(result.report);
        toast({
          title: 'Quality Scan Complete',
          description: `Score: ${result.report.overallScore}% | ${result.report.issues.length} issues found`
        });
        return result.report;
      }
      
      // Fall through to local analysis
      throw new Error('Backend unavailable');
    } catch {
      // Local fallback - run comprehensive analysis in the browser
      if (data && data.length > 0) {
        const localReport = runLocalQualityScan(datasetId, data);
        setReport(localReport);
        toast({
          title: 'Quality Scan Complete',
          description: `Score: ${localReport.overallScore}% | ${localReport.issues.length} issues found`
        });
        return localReport;
      }
      
      toast({
        title: 'Scan Failed',
        description: 'No data available for analysis.',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsScanning(false);
    }
  };

  const getFixPreview = (data: Record<string, unknown>[], column: string, issueType: string): QualityFix => {
    return generateFix(data, column, issueType);
  };

  const applyFix = (data: Record<string, unknown>[], column: string, issueType: string): Record<string, unknown>[] => {
    const fix = generateFix(data, column, issueType);
    return fix.apply(data);
  };

  return {
    isScanning,
    report,
    scanDataset,
    setReport,
    getFixPreview,
    applyFix,
  };
}
