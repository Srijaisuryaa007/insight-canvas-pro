// Local Insights Generation Engine
// Runs entirely in the browser — no backend required

import { Insight } from '@/lib/api';

export function generateLocalInsights(
  datasetId: string,
  data: Record<string, unknown>[]
): Insight[] {
  if (!data || data.length === 0) return [];

  const columns = Object.keys(data[0]);
  const numericCols = columns.filter(c => typeof data[0][c] === 'number');
  const stringCols = columns.filter(c => typeof data[0][c] === 'string');
  const insights: Insight[] = [];

  // 1. Trend detection
  if (numericCols.length > 0) {
    const col = numericCols[0];
    const vals = data.map(r => Number(r[col])).filter(v => !isNaN(v));
    if (vals.length > 4) {
      const firstHalf = vals.slice(0, Math.floor(vals.length / 2));
      const secondHalf = vals.slice(Math.floor(vals.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const change = ((secondAvg - firstAvg) / (firstAvg || 1)) * 100;

      insights.push({
        id: `insight_trend_${Date.now()}`,
        datasetId,
        type: 'trend',
        title: `${col} ${change > 0 ? 'Increasing' : 'Decreasing'} Trend`,
        description: `${col} shows a ${Math.abs(change).toFixed(1)}% ${change > 0 ? 'increase' : 'decrease'} from the first half to the second half of data.`,
        confidence: 0.87,
        chartType: 'line',
        config: { xAxis: stringCols[0] || 'index', yAxis: col },
        reasoning: `Compared average of first ${firstHalf.length} records (${firstAvg.toFixed(2)}) vs last ${secondHalf.length} records (${secondAvg.toFixed(2)}).`,
        suggestedActions: ['Investigate the root cause', 'Create a time-series forecast', 'Monitor trend direction'],
      });
    }
  }

  // 2. Distribution analysis
  if (stringCols.length > 0 && numericCols.length > 0) {
    const catCol = stringCols[0];
    const valCol = numericCols[0];
    const grouped: Record<string, number> = {};
    data.forEach(row => {
      const key = String(row[catCol]);
      grouped[key] = (grouped[key] || 0) + (Number(row[valCol]) || 0);
    });
    const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    const top = entries[0];

    if (top) {
      insights.push({
        id: `insight_dist_${Date.now()}`,
        datasetId,
        type: 'distribution',
        title: `${catCol} Distribution Analysis`,
        description: `"${top[0]}" dominates with ${((top[1] / (total || 1)) * 100).toFixed(1)}% of total ${valCol}. ${entries.length} unique categories found.`,
        confidence: 0.94,
        chartType: 'pie',
        config: { xAxis: catCol, yAxis: valCol },
        reasoning: `Aggregated ${valCol} by ${catCol}. Top category: ${top[1].toFixed(0)} out of ${total.toFixed(0)} total.`,
        suggestedActions: ['Drill into top categories', 'Analyze underperformers', 'Check resource allocation'],
      });
    }
  }

  // 3. Correlation analysis
  if (numericCols.length >= 2) {
    const col1 = numericCols[0];
    const col2 = numericCols[1];
    const v1 = data.map(r => Number(r[col1])).filter(v => !isNaN(v));
    const v2 = data.map(r => Number(r[col2])).filter(v => !isNaN(v));
    const len = Math.min(v1.length, v2.length);

    if (len > 3) {
      const m1 = v1.slice(0, len).reduce((a, b) => a + b, 0) / len;
      const m2 = v2.slice(0, len).reduce((a, b) => a + b, 0) / len;
      let num = 0, d1 = 0, d2 = 0;
      for (let i = 0; i < len; i++) {
        num += (v1[i] - m1) * (v2[i] - m2);
        d1 += (v1[i] - m1) ** 2;
        d2 += (v2[i] - m2) ** 2;
      }
      const corr = d1 && d2 ? num / Math.sqrt(d1 * d2) : 0;

      if (Math.abs(corr) > 0.3) {
        insights.push({
          id: `insight_corr_${Date.now()}`,
          datasetId,
          type: 'correlation',
          title: `${col1} & ${col2} Correlation`,
          description: `${Math.abs(corr) > 0.7 ? 'Strong' : 'Moderate'} ${corr > 0 ? 'positive' : 'negative'} correlation (r=${corr.toFixed(2)}).`,
          confidence: 0.85,
          chartType: 'scatter',
          config: { xAxis: col1, yAxis: col2 },
          reasoning: `Pearson correlation coefficient computed over ${len} data points.`,
          suggestedActions: ['Run regression analysis', 'Check for confounding variables', 'Validate causal relationship'],
        });
      }
    }
  }

  // 4. Anomaly detection
  if (numericCols.length > 0) {
    const col = numericCols[0];
    const vals = data.map(r => Number(r[col])).filter(v => !isNaN(v));
    if (vals.length > 4) {
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
      const anomalies = vals.filter(v => Math.abs(v - mean) > 2 * std);

      if (anomalies.length > 0 && anomalies.length < vals.length * 0.1) {
        insights.push({
          id: `insight_anom_${Date.now()}`,
          datasetId,
          type: 'anomaly',
          title: `Anomalies in ${col}`,
          description: `${anomalies.length} anomalous values detected (beyond 2σ from mean ${mean.toFixed(1)}).`,
          confidence: 0.79,
          chartType: 'bar',
          config: { xAxis: stringCols[0] || 'index', yAxis: col },
          reasoning: `Values outside [${(mean - 2 * std).toFixed(1)}, ${(mean + 2 * std).toFixed(1)}].`,
          suggestedActions: ['Investigate anomalous records', 'Validate data entry', 'Consider outlier treatment'],
        });
      }
    }
  }

  // 5. Key driver analysis (if multiple numeric cols + categories)
  if (stringCols.length > 0 && numericCols.length >= 2) {
    const target = numericCols[0];
    const driver = numericCols[1];
    const catCol = stringCols[0];
    
    const catGroups: Record<string, { targetSum: number; driverSum: number; count: number }> = {};
    data.forEach(row => {
      const cat = String(row[catCol]);
      if (!catGroups[cat]) catGroups[cat] = { targetSum: 0, driverSum: 0, count: 0 };
      catGroups[cat].targetSum += Number(row[target]) || 0;
      catGroups[cat].driverSum += Number(row[driver]) || 0;
      catGroups[cat].count++;
    });

    const sorted = Object.entries(catGroups).sort((a, b) => b[1].targetSum - a[1].targetSum);
    if (sorted.length > 1) {
      const topCat = sorted[0];
      const bottomCat = sorted[sorted.length - 1];
      insights.push({
        id: `insight_driver_${Date.now()}`,
        datasetId,
        type: 'distribution',
        title: `Key Driver: ${catCol} on ${target}`,
        description: `"${topCat[0]}" leads ${target} (avg ${(topCat[1].targetSum / topCat[1].count).toFixed(0)}) while "${bottomCat[0]}" trails (avg ${(bottomCat[1].targetSum / bottomCat[1].count).toFixed(0)}).`,
        confidence: 0.82,
        chartType: 'bar',
        config: { xAxis: catCol, yAxis: target },
        reasoning: `Grouped ${target} by ${catCol} categories to identify top and bottom performers.`,
        suggestedActions: ['Focus on top-performing segments', 'Investigate underperformers', 'Allocate resources accordingly'],
      });
    }
  }

  return insights;
}
