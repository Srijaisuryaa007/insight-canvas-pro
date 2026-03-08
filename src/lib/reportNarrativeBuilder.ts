// DataPulse — Rich narrative builder for reports (no AI dependency, pure data-driven)
import type { TemplateTone } from './reportTemplates';

interface ReportStats {
  title: string;
  datasetName: string;
  userName: string;
  date: string;
  rowCount: number;
  columnCount: number;
  numericColumns: string[];
  categoricalColumns: string[];
  dateColumns: string[];
  kpis: Array<{ label: string; value: string; raw?: number }>;
  trends: Array<{ col: string; change: number; direction: string; firstHalfAvg: number; secondHalfAvg: number }>;
  positives: string[];
  negatives: string[];
  risks: string[];
  opportunities: string[];
  recommendations: string[];
  qualityScore?: number;
  qualityIssues?: number;
  missingPct?: number;
  duplicateCount?: number;
  outlierCount?: number;
  columnStats: Array<{
    name: string;
    type: string;
    mean?: number;
    median?: number;
    std?: number;
    min?: number;
    max?: number;
    uniqueCount?: number;
    missingCount?: number;
    missingPct?: number;
  }>;
}

// Build comprehensive stats from raw data
export function buildReportStats(
  data: Record<string, unknown>[],
  datasetName: string,
  userName: string,
  title: string,
  qualityReport?: { overallScore: number; issues: any[] } | null
): ReportStats {
  if (!data.length) throw new Error('No data');
  const cols = Object.keys(data[0]);
  const numericColumns: string[] = [];
  const categoricalColumns: string[] = [];
  const dateColumns: string[] = [];

  cols.forEach(col => {
    const sample = data.slice(0, 50).map(r => r[col]).filter(v => v != null);
    const numCount = sample.filter(v => typeof v === 'number' || (!isNaN(Number(v)) && v !== '')).length;
    const dateCount = sample.filter(v => typeof v === 'string' && !isNaN(Date.parse(String(v))) && String(v).length > 6).length;
    if (numCount > sample.length * 0.6) numericColumns.push(col);
    else if (dateCount > sample.length * 0.5) dateColumns.push(col);
    else categoricalColumns.push(col);
  });

  const columnStats = cols.map(col => {
    const values = data.map(r => r[col]);
    const nonNull = values.filter(v => v != null && v !== '');
    const missingCount = values.length - nonNull.length;
    const missingPct = Math.round((missingCount / values.length) * 100);

    if (numericColumns.includes(col)) {
      const nums = nonNull.map(v => Number(v)).filter(n => !isNaN(n));
      const sorted = [...nums].sort((a, b) => a - b);
      const mean = nums.reduce((a, b) => a + b, 0) / (nums.length || 1);
      const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
      const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (nums.length || 1);
      const std = Math.sqrt(variance);
      return {
        name: col, type: 'numeric', mean: Math.round(mean * 100) / 100,
        median: Math.round(median * 100) / 100, std: Math.round(std * 100) / 100,
        min: sorted[0], max: sorted[sorted.length - 1],
        uniqueCount: new Set(nums).size, missingCount, missingPct,
      };
    }
    return {
      name: col, type: numericColumns.includes(col) ? 'numeric' : dateColumns.includes(col) ? 'date' : 'categorical',
      uniqueCount: new Set(nonNull.map(String)).size, missingCount, missingPct,
    };
  });

  // KPIs
  const kpis: ReportStats['kpis'] = [
    { label: 'Total Records', value: data.length.toLocaleString(), raw: data.length },
    { label: 'Dimensions', value: cols.length.toString(), raw: cols.length },
  ];
  numericColumns.slice(0, 6).forEach(col => {
    const vals = data.map(r => Number(r[col]) || 0);
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / vals.length;
    const isAvg = /rate|score|rating|pct|percent/i.test(col);
    kpis.push({
      label: isAvg ? `Avg ${col}` : `Total ${col}`,
      value: isAvg ? avg.toFixed(1) : sum.toLocaleString(),
      raw: isAvg ? avg : sum,
    });
  });

  // Trends
  const trends: ReportStats['trends'] = [];
  numericColumns.slice(0, 5).forEach(col => {
    const vals = data.map(r => Number(r[col]) || 0);
    const half = Math.floor(vals.length / 2);
    const fAvg = vals.slice(0, half).reduce((a, b) => a + b, 0) / (half || 1);
    const sAvg = vals.slice(half).reduce((a, b) => a + b, 0) / ((vals.length - half) || 1);
    const change = fAvg ? Math.round(((sAvg - fAvg) / fAvg) * 1000) / 10 : 0;
    trends.push({
      col, change, direction: change > 1 ? 'Increasing' : change < -1 ? 'Decreasing' : 'Stable',
      firstHalfAvg: Math.round(fAvg * 100) / 100, secondHalfAvg: Math.round(sAvg * 100) / 100,
    });
  });

  const positives = trends.filter(t => t.change > 5).map(t => `${t.col} shows ${t.change}% growth`);
  const negatives = trends.filter(t => t.change < -5).map(t => `${t.col} declined by ${Math.abs(t.change)}%`);

  const totalMissing = columnStats.reduce((a, c) => a + (c.missingCount || 0), 0);
  const totalCells = data.length * cols.length;
  const missingPct = Math.round((totalMissing / totalCells) * 100 * 10) / 10;

  return {
    title: title || `${datasetName} Analytics Report`,
    datasetName, userName, date: new Date().toLocaleDateString(),
    rowCount: data.length, columnCount: cols.length,
    numericColumns, categoricalColumns, dateColumns,
    kpis, trends, positives, negatives,
    risks: negatives.length > 0 ? negatives.map(n => `Monitor: ${n}`) : ['No significant risks detected'],
    opportunities: positives.length > 0 ? positives.map(p => `Capitalize on: ${p}`) : ['Maintain current trajectory'],
    recommendations: [
      ...(positives.length ? ['Continue investing in top-performing areas'] : []),
      ...(negatives.length ? ['Investigate declining metrics and identify root causes'] : []),
      'Schedule regular data quality reviews',
      'Establish automated monitoring for key performance thresholds',
      'Develop data governance protocols for sustained accuracy',
    ],
    qualityScore: qualityReport?.overallScore,
    qualityIssues: qualityReport?.issues?.length,
    missingPct, duplicateCount: 0, outlierCount: 0,
    columnStats,
  };
}

// Generate narrative paragraphs for different report sections
export function generateNarrative(section: string, stats: ReportStats, tone: TemplateTone): string {
  const toneAdj = {
    executive: { open: 'Analysis indicates', style: 'concise, impact-driven' },
    technical: { open: 'Statistical analysis reveals', style: 'detailed, methodical' },
    narrative: { open: 'The data tells a compelling story:', style: 'engaging, story-driven' },
    operational: { open: 'Operational review identifies', style: 'action-oriented' },
    bold: { open: 'The numbers speak clearly:', style: 'confident, high-impact' },
    academic: { open: 'Empirical analysis demonstrates', style: 'formal, rigorous' },
  }[tone];

  const topTrend = stats.trends[0];
  const topPositive = stats.positives[0] || 'stable performance across metrics';
  const topNegative = stats.negatives[0] || 'no significant declines observed';
  const bestKpi = stats.kpis[2] || stats.kpis[0];
  const worstTrend = stats.trends.find(t => t.change < 0) || stats.trends[stats.trends.length - 1];

  switch (section) {
    case 'executive-summary':
      return `${toneAdj.open} that the ${stats.datasetName} dataset, comprising ${stats.rowCount.toLocaleString()} records across ${stats.columnCount} dimensions, reveals significant patterns warranting strategic attention. ${stats.numericColumns.length} quantitative metrics and ${stats.categoricalColumns.length} categorical dimensions provide a multi-faceted view of performance. ${topTrend ? `The primary metric, ${topTrend.col}, is ${topTrend.direction.toLowerCase()} at ${topTrend.change > 0 ? '+' : ''}${topTrend.change}%, shifting from an average of ${topTrend.firstHalfAvg.toLocaleString()} to ${topTrend.secondHalfAvg.toLocaleString()}.` : 'Metrics remain broadly stable across the analysis period.'} ${stats.positives.length} indicator${stats.positives.length !== 1 ? 's' : ''} show positive momentum while ${stats.negatives.length} require attention. ${stats.qualityScore !== undefined ? `Data quality stands at ${stats.qualityScore}/100, ${stats.qualityScore >= 80 ? 'indicating reliable analytical foundations' : 'suggesting data governance improvements are needed'}.` : 'A data quality assessment is recommended to ensure analytical reliability.'} Overall, the dataset presents ${stats.positives.length > stats.negatives.length ? 'a predominantly positive trajectory with targeted areas for improvement' : stats.negatives.length > stats.positives.length ? 'several areas requiring strategic intervention alongside stable fundamentals' : 'a balanced profile with opportunities for optimization'}.`;

    case 'dataset-overview':
      return `The ${stats.datasetName} dataset encompasses ${stats.rowCount.toLocaleString()} records structured across ${stats.columnCount} dimensions. The schema comprises ${stats.numericColumns.length} numeric variable${stats.numericColumns.length !== 1 ? 's' : ''} (${stats.numericColumns.slice(0, 4).join(', ')}${stats.numericColumns.length > 4 ? ` and ${stats.numericColumns.length - 4} more` : ''}), ${stats.categoricalColumns.length} categorical dimension${stats.categoricalColumns.length !== 1 ? 's' : ''}, and ${stats.dateColumns.length} temporal field${stats.dateColumns.length !== 1 ? 's' : ''}. Data completeness stands at ${(100 - (stats.missingPct || 0)).toFixed(1)}%, with ${stats.missingPct || 0}% of total cell values absent. ${stats.columnStats.filter(c => c.missingPct && c.missingPct > 20).length > 0 ? `${stats.columnStats.filter(c => c.missingPct && c.missingPct > 20).length} column(s) exhibit significant missingness (>20%) and warrant targeted data collection improvements.` : 'All columns demonstrate acceptable data population levels, supporting robust analytical outcomes.'} The numeric dimensions enable quantitative trend analysis, while categorical fields facilitate segmentation and cohort-based insights.`;

    case 'kpi-analysis':
      return stats.kpis.map(k => `${k.label} stands at ${k.value}.`).join(' ') + ` ${bestKpi ? `${bestKpi.label} at ${bestKpi.value} represents a key performance benchmark.` : ''} Across the ${stats.numericColumns.length} quantitative metrics analyzed, ${stats.trends.filter(t => t.change > 0).length} show upward movement while ${stats.trends.filter(t => t.change < 0).length} exhibit decline. ${worstTrend && worstTrend.change < -2 ? `${worstTrend.col} requires attention with a ${worstTrend.change}% shift, dropping from ${worstTrend.firstHalfAvg.toLocaleString()} to ${worstTrend.secondHalfAvg.toLocaleString()}.` : 'No metrics show critical-level deterioration.'} The aggregate performance profile indicates ${stats.positives.length >= stats.negatives.length ? 'healthy operational status with opportunities for further optimization' : 'mixed signals warranting a structured review of underperforming areas'}.`;

    case 'trends':
      return stats.trends.map(t =>
        `${t.col} is ${t.direction.toLowerCase()}, moving from an average of ${t.firstHalfAvg.toLocaleString()} in the first half to ${t.secondHalfAvg.toLocaleString()} in the second half — a ${t.change > 0 ? '+' : ''}${t.change}% change. ${t.change > 10 ? 'This significant upward trajectory suggests strong positive momentum that should be reinforced.' : t.change < -10 ? 'This notable decline warrants immediate investigation into contributing factors.' : t.change > 2 ? 'The modest improvement indicates a positive direction.' : t.change < -2 ? 'A minor downward trend worth monitoring in subsequent periods.' : 'Performance remains consistent, suggesting stable underlying conditions.'}`
      ).join(' ');

    case 'positives':
      return stats.positives.length > 0
        ? `Analysis identified ${stats.positives.length} significant positive pattern${stats.positives.length !== 1 ? 's' : ''}: ${stats.positives.join('; ')}. These strengths represent actionable opportunities for amplification. ${stats.positives.length >= 3 ? 'The breadth of positive signals across multiple metrics suggests systemic health rather than isolated outperformance.' : 'Focused investment in these areas could yield compounding returns.'} Strategic recommendation: allocate resources to reinforce and scale these positive trajectories.`
        : 'All metrics remain within stable parameters. While no exceptional growth signals were detected, the absence of volatility indicates operational consistency. Consider establishing stretch targets to catalyze improvement.';

    case 'negatives':
      return stats.negatives.length > 0
        ? `${stats.negatives.length} metric${stats.negatives.length !== 1 ? 's' : ''} show concerning decline: ${stats.negatives.join('; ')}. ${stats.negatives.length >= 3 ? 'The concentration of negative signals across multiple indicators suggests a systemic issue that requires a holistic remediation strategy rather than isolated fixes.' : 'Targeted intervention on these specific metrics is recommended within the next 30 days.'} Failure to address these trends could compound over subsequent reporting periods, potentially impacting ${stats.negatives.length >= 2 ? 'multiple business dimensions' : 'operational performance'}.`
        : 'No significant declines were detected across the analyzed metrics. The dataset reflects stable or improving performance across all measured dimensions. Continued monitoring is recommended to maintain this trajectory.';

    case 'quality':
      return stats.qualityScore !== undefined
        ? `Data quality assessment yields an overall score of ${stats.qualityScore}/100 (Grade ${stats.qualityScore >= 90 ? 'A' : stats.qualityScore >= 75 ? 'B' : stats.qualityScore >= 60 ? 'C' : 'D'}). ${stats.qualityIssues || 0} issue${(stats.qualityIssues || 0) !== 1 ? 's' : ''} were identified during the quality audit. Missing data accounts for ${stats.missingPct || 0}% of total cell values. ${stats.qualityScore >= 80 ? 'The dataset meets reliability thresholds for advanced analytical applications including predictive modeling and statistical inference.' : 'Data quality improvements are recommended before proceeding with advanced analytics. Key areas for improvement include addressing missing values and validating data type consistency.'}`
        : 'A formal data quality assessment has not yet been performed on this dataset. It is recommended to run the DataPulse 8-Step Data Quality Engine to establish a baseline quality score and identify potential issues before drawing strategic conclusions from the analysis.';

    case 'recommendations':
      return `Based on comprehensive analysis of the ${stats.datasetName} dataset, the following strategic recommendations are prioritized by impact and feasibility:\n\nImmediate Actions (0–30 Days): ${stats.negatives.length > 0 ? `Investigate and remediate declining metrics (${stats.negatives.slice(0, 2).join(', ')}).` : 'Establish performance monitoring dashboards for all KPIs.'} ${stats.qualityScore !== undefined && stats.qualityScore < 80 ? 'Address data quality issues to improve analytical reliability.' : 'Maintain current data governance practices.'}\n\nShort-Term Initiatives (30–90 Days): ${stats.positives.length > 0 ? `Develop amplification strategies for high-performing areas (${stats.positives.slice(0, 2).join(', ')}).` : 'Implement targeted improvement programs across all metrics.'} Establish automated alerting for key threshold breaches.\n\nLong-Term Strategy (90+ Days): Build predictive models to anticipate metric shifts. Develop a comprehensive data strategy aligned with organizational objectives. Implement continuous monitoring and automated reporting cadence.`;

    case 'deep-insights':
      const insights: string[] = [];
      if (stats.trends.length >= 2) {
        const t1 = stats.trends[0];
        const t2 = stats.trends[1];
        if ((t1.change > 0 && t2.change < 0) || (t1.change < 0 && t2.change > 0)) {
          insights.push(`An inverse relationship exists between ${t1.col} (${t1.change > 0 ? '+' : ''}${t1.change}%) and ${t2.col} (${t2.change > 0 ? '+' : ''}${t2.change}%), suggesting these metrics may be competing for the same underlying resources or responding to the same driver in opposite directions.`);
        }
      }
      if (stats.columnStats.some(c => c.std && c.mean && c.std > c.mean * 0.5)) {
        const volatile = stats.columnStats.filter(c => c.std && c.mean && c.std > c.mean * 0.5);
        insights.push(`High volatility detected in ${volatile.map(c => c.name).join(', ')} — the standard deviation exceeds 50% of the mean, indicating inconsistent performance that could mask underlying trends.`);
      }
      if (stats.columnStats.some(c => c.missingPct && c.missingPct > 15)) {
        insights.push(`Data gaps in ${stats.columnStats.filter(c => c.missingPct && c.missingPct > 15).map(c => `${c.name} (${c.missingPct}%)`).join(', ')} may introduce analytical bias. Imputation strategies or improved data collection should be considered.`);
      }
      insights.push(`The dataset's ${stats.numericColumns.length} numeric dimensions provide a ${stats.numericColumns.length >= 5 ? 'rich' : 'focused'} quantitative foundation. Cross-dimensional analysis could uncover latent patterns not visible in univariate examination.`);
      insights.push(`With ${stats.rowCount.toLocaleString()} records, the dataset ${stats.rowCount >= 1000 ? 'provides sufficient statistical power for confidence intervals and hypothesis testing' : 'may benefit from additional data collection to strengthen statistical significance'}.`);
      return insights.join('\n\n');

    default:
      return `Analysis of the ${stats.datasetName} dataset across ${stats.rowCount.toLocaleString()} records and ${stats.columnCount} columns.`;
  }
}
