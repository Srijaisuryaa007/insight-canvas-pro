import { useState } from 'react';
import { Dataset, QualityReport, QualityIssue } from '@/types';
import { useCredits } from './useCredits';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export function useDataQuality() {
  const [isScanning, setIsScanning] = useState(false);
  const { consumeCredits } = useCredits();
  const { setQualityReport } = useWorkspace();

  const scanDataset = async (dataset: Dataset, data: Record<string, unknown>[]): Promise<QualityReport | null> => {
    if (!consumeCredits('quality-scan')) {
      return null;
    }

    setIsScanning(true);

    // Simulate scanning delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const issues: QualityIssue[] = [];
    let totalIssues = 0;

    // Analyze each column
    dataset.columns.forEach(column => {
      const values = data.map(row => row[column.name]);
      const totalRows = values.length;

      // Check for missing values
      const missingCount = values.filter(v => v === null || v === undefined || v === '').length;
      if (missingCount > 0) {
        issues.push({
          column: column.name,
          type: 'missing',
          severity: missingCount / totalRows > 0.2 ? 'high' : missingCount / totalRows > 0.05 ? 'medium' : 'low',
          count: missingCount,
          percentage: Math.round((missingCount / totalRows) * 100),
          suggestion: `Fill missing values with ${column.type === 'number' ? 'mean/median' : 'mode or a default value'}`,
        });
        totalIssues += missingCount;
      }

      // Check for duplicates
      const uniqueValues = new Set(values.filter(v => v !== null && v !== undefined));
      const duplicateCount = values.length - uniqueValues.size;
      if (duplicateCount > totalRows * 0.5 && column.type !== 'boolean') {
        issues.push({
          column: column.name,
          type: 'duplicate',
          severity: 'medium',
          count: duplicateCount,
          percentage: Math.round((duplicateCount / totalRows) * 100),
          suggestion: 'Consider if duplicates are expected or if deduplication is needed',
        });
      }

      // Check for outliers (numeric columns only)
      if (column.type === 'number') {
        const numericValues = values.filter(v => typeof v === 'number') as number[];
        if (numericValues.length > 0) {
          const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
          const std = Math.sqrt(numericValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numericValues.length);
          const outlierCount = numericValues.filter(v => Math.abs(v - mean) > 3 * std).length;
          
          if (outlierCount > 0) {
            issues.push({
              column: column.name,
              type: 'outlier',
              severity: outlierCount / totalRows > 0.1 ? 'high' : 'low',
              count: outlierCount,
              percentage: Math.round((outlierCount / totalRows) * 100),
              suggestion: 'Review outliers - they may be errors or valid extreme values',
            });
            totalIssues += outlierCount;
          }
        }
      }
    });

    // Calculate overall score (0-100)
    const maxPossibleIssues = dataset.rowCount * dataset.columns.length;
    const issueRatio = totalIssues / maxPossibleIssues;
    const overallScore = Math.max(0, Math.round((1 - issueRatio) * 100));

    const report: QualityReport = {
      datasetId: dataset.id,
      overallScore,
      issues,
      scannedAt: new Date().toISOString(),
    };

    setQualityReport(dataset.id, report);
    setIsScanning(false);

    return report;
  };

  return {
    isScanning,
    scanDataset,
  };
}
