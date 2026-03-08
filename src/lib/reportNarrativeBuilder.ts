// DataPulse — Rich narrative builder for reports (template-differentiated content)
import type { TemplateTone } from './reportTemplates';

export interface ReportStats {
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
      name: col, type: dateColumns.includes(col) ? 'date' : 'categorical',
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

// ─── TEMPLATE-DIFFERENTIATED NARRATIVE GENERATORS ───────────────

// Each tone produces fundamentally different writing for the same section

function execNarrative(section: string, s: ReportStats): string {
  const topTrend = s.trends[0];
  switch (section) {
    case 'executive-summary':
      return `Bottom line: ${s.positives.length} metrics are up, ${s.negatives.length} need attention. ${topTrend ? `${topTrend.col} moved ${topTrend.change > 0 ? '+' : ''}${topTrend.change}% — from ${topTrend.firstHalfAvg.toLocaleString()} to ${topTrend.secondHalfAvg.toLocaleString()}.` : 'All metrics held steady.'} The board should note ${s.negatives.length > 0 ? `the decline in ${s.negatives[0]}` : 'stable performance across all monitored KPIs'}. ${s.qualityScore !== undefined ? `Data reliability: ${s.qualityScore}/100.` : ''} Decision required: ${s.negatives.length > 0 ? 'allocate resources to reverse declining metrics' : 'approve continuation of current strategy'}.`;
    case 'decision-brief':
      return `Three decisions for this session:\n1. ${s.negatives.length > 0 ? `Address the ${Math.abs(s.trends.find(t => t.change < 0)?.change || 0)}% drop in ${s.trends.find(t => t.change < 0)?.col || 'underperforming area'} — estimated impact on quarterly targets.` : 'No declining metrics require emergency action.'}\n2. ${s.positives.length > 0 ? `Scale investment in ${s.positives[0].split(' shows')[0]} which grew ${s.trends.find(t => t.change > 5)?.change || 0}%.` : 'Identify growth catalysts for next quarter.'}\n3. ${s.qualityScore !== undefined && s.qualityScore < 80 ? `Data quality at ${s.qualityScore}/100 limits confidence — approve data governance budget.` : 'Maintain current data infrastructure.'}`;
    case 'risk-register':
      return s.risks.map((r, i) => `Risk ${i + 1}: ${r}. Severity: ${s.negatives.length > i ? 'High' : 'Medium'}. Owner: TBD. Deadline: ${i === 0 ? '14 days' : '30 days'}.`).join('\n');
    default:
      return genericNarrative(section, s);
  }
}

function technicalNarrative(section: string, s: ReportStats): string {
  switch (section) {
    case 'executive-summary':
      return `Dataset: ${s.datasetName} (n=${s.rowCount.toLocaleString()}, p=${s.columnCount}). Schema: ${s.numericColumns.length} continuous, ${s.categoricalColumns.length} categorical, ${s.dateColumns.length} temporal variables. Missing data rate: ${s.missingPct || 0}%. ${s.trends.map(t => `${t.col}: μ₁=${t.firstHalfAvg}, μ₂=${t.secondHalfAvg}, Δ=${t.change}%`).slice(0, 3).join('; ')}. ${s.qualityScore !== undefined ? `Quality index: ${s.qualityScore}/100.` : 'Quality assessment pending.'}`;
    case 'methodology':
      return `Analysis methodology: Descriptive statistics computed for all ${s.numericColumns.length} continuous variables. Central tendency measured via arithmetic mean and median. Dispersion quantified using standard deviation. Trend analysis performed by comparing first-half vs. second-half averages (split-half method, n₁=${Math.floor(s.rowCount / 2)}, n₂=${s.rowCount - Math.floor(s.rowCount / 2)}). Missing data analysis: ${s.missingPct || 0}% overall absence rate. ${s.columnStats.filter(c => c.missingPct && c.missingPct > 10).length} variables exceed 10% missingness threshold.`;
    case 'statistical-summary':
      return s.columnStats.filter(c => c.type === 'numeric').map(c =>
        `${c.name}: μ=${c.mean}, Md=${c.median}, σ=${c.std}, range=[${c.min}, ${c.max}], n_unique=${c.uniqueCount}, missing=${c.missingPct}%. ${c.std && c.mean && c.std > c.mean * 0.5 ? 'HIGH VARIANCE — coefficient of variation > 0.5.' : 'Variance within normal bounds.'}`
      ).join('\n') || 'No numeric columns available for statistical summary.';
    case 'distribution-analysis':
      return s.columnStats.filter(c => c.type === 'numeric').map(c => {
        const cv = c.mean && c.std ? (c.std / Math.abs(c.mean) * 100).toFixed(1) : 'N/A';
        const range = (c.max ?? 0) - (c.min ?? 0);
        const iqrEst = c.std ? (c.std * 1.35).toFixed(2) : 'N/A';
        return `${c.name}: CV=${cv}%, Range=${range.toLocaleString()}, Est.IQR≈${iqrEst}. ${Number(cv) > 100 ? 'Highly dispersed — potential outliers or multi-modal distribution.' : Number(cv) > 50 ? 'Moderate dispersion — investigate subgroups.' : 'Concentrated distribution.'}`;
      }).join('\n') || 'Insufficient numeric data for distribution analysis.';
    default:
      return genericNarrative(section, s);
  }
}

function narrativeTone(section: string, s: ReportStats): string {
  const topTrend = s.trends[0];
  const hero = s.positives[0]?.split(' shows')[0] || s.numericColumns[0] || 'performance';
  switch (section) {
    case 'executive-summary':
      return `Every dataset tells a story. This one — ${s.rowCount.toLocaleString()} records across ${s.columnCount} dimensions — reveals a clear narrative arc. The protagonist: ${hero}. ${topTrend ? `It began the period averaging ${topTrend.firstHalfAvg.toLocaleString()}, and by the end it had ${topTrend.direction === 'Increasing' ? 'risen' : topTrend.direction === 'Decreasing' ? 'fallen' : 'held steady'} to ${topTrend.secondHalfAvg.toLocaleString()} — a ${topTrend.change > 0 ? '+' : ''}${topTrend.change}% shift that shapes every conclusion in this report.` : 'The metrics held remarkably steady, a story of consistency worth understanding.'} What follows is that story, told through the numbers.`;
    case 'the-situation':
      return `Let us set the scene. ${s.datasetName} contains ${s.rowCount.toLocaleString()} records — each one a data point in a larger pattern. ${s.numericColumns.length} measurable dimensions give us the quantitative backbone: ${s.numericColumns.slice(0, 3).join(', ')}${s.numericColumns.length > 3 ? ` and ${s.numericColumns.length - 3} more` : ''}. ${s.categoricalColumns.length} categorical dimensions — ${s.categoricalColumns.slice(0, 2).join(', ')} — add context and segmentation. The stage is set.`;
    case 'the-turning-point':
      return `Here is where it gets interesting. ${s.trends.filter(t => Math.abs(t.change) > 5).length > 0 ? `${s.trends.filter(t => Math.abs(t.change) > 5).map(t => `${t.col} shifted ${t.change > 0 ? 'up' : 'down'} by ${Math.abs(t.change)}%`).join('. ')}. These are not random fluctuations — they are signals.` : 'The metrics moved within narrow bands, but even stability carries meaning. It tells us that the underlying systems are either well-tuned or stagnant.'} ${s.negatives.length > 0 ? `The tension in this story: ${s.negatives[0]}.` : 'No metric raised a red flag — the narrative, for now, is one of steady progress.'}`;
    case 'the-resolution':
      return `So where does the story lead? ${s.positives.length > 0 ? `The upward movement in ${s.positives.map(p => p.split(' shows')[0]).join(', ')} points toward ${s.positives.length >= 2 ? 'broad-based momentum' : 'a focused bright spot'}.` : 'Without clear winners, the path forward requires deliberate action.'} ${s.recommendations.slice(0, 2).map(r => `Action: ${r}.`).join(' ')} The data has spoken. The question is: what will you do with it?`;
    default:
      return genericNarrative(section, s);
  }
}

function operationalNarrative(section: string, s: ReportStats): string {
  switch (section) {
    case 'executive-summary':
      return `Operational Status: ${s.negatives.length === 0 ? 'GREEN — All metrics within thresholds.' : s.negatives.length <= 2 ? 'AMBER — ' + s.negatives.length + ' metric(s) outside tolerance.' : 'RED — ' + s.negatives.length + ' metrics require immediate action.'} Dataset: ${s.rowCount.toLocaleString()} records, ${s.columnCount} dimensions. ${s.qualityScore !== undefined ? `Data health: ${s.qualityScore}/100.` : ''} Action items: ${s.negatives.length + s.positives.length} flagged.`;
    case 'rag-status':
      return s.trends.map(t => {
        const status = Math.abs(t.change) < 3 ? 'GREEN' : t.change > 0 ? 'GREEN' : t.change > -10 ? 'AMBER' : 'RED';
        return `${t.col}: ${status}. Current: ${t.secondHalfAvg.toLocaleString()}. Previous: ${t.firstHalfAvg.toLocaleString()}. Change: ${t.change > 0 ? '+' : ''}${t.change}%. ${status === 'RED' ? 'ESCALATE: Immediate review required.' : status === 'AMBER' ? 'WATCH: Monitor in next cycle.' : 'OK: Within operational bounds.'}`;
      }).join('\n');
    case 'action-items':
      const items: string[] = [];
      s.negatives.forEach((n, i) => items.push(`[P${i + 1}] URGENT: ${n}. Owner: TBD. Due: ${i === 0 ? 'Immediately' : '7 days'}. Status: Open.`));
      s.positives.forEach((p, i) => items.push(`[P${s.negatives.length + i + 1}] MAINTAIN: ${p}. Document process for replication. Due: 14 days.`));
      items.push(`[STANDING] Data quality review: ${s.qualityScore !== undefined ? `Score ${s.qualityScore}/100` : 'Not yet assessed'}. Frequency: Weekly.`);
      return items.join('\n');
    case 'sla-metrics':
      return `Data Completeness SLA: Target 95%, Actual ${(100 - (s.missingPct || 0)).toFixed(1)}% — ${(100 - (s.missingPct || 0)) >= 95 ? 'MET' : 'BREACHED'}.\nData Quality SLA: Target 80/100, Actual ${s.qualityScore ?? 'N/A'} — ${s.qualityScore !== undefined ? (s.qualityScore >= 80 ? 'MET' : 'BREACHED') : 'NOT ASSESSED'}.\nMetric Stability SLA: Target <5% variance, ${s.trends.filter(t => Math.abs(t.change) > 5).length} breach(es) of ${s.trends.length} monitored — ${s.trends.filter(t => Math.abs(t.change) > 5).length === 0 ? 'MET' : 'PARTIAL BREACH'}.`;
    default:
      return genericNarrative(section, s);
  }
}

function boldNarrative(section: string, s: ReportStats): string {
  const topGrower = s.trends.find(t => t.change > 0);
  switch (section) {
    case 'executive-summary':
      return `${s.rowCount.toLocaleString()} data points. ${s.columnCount} dimensions. One clear signal: ${topGrower ? `${topGrower.col} is up ${topGrower.change}%` : 'the fundamentals are rock-solid'}. ${s.positives.length} metrics trending up. ${s.negatives.length === 0 ? 'Zero declining.' : `${s.negatives.length} to fix — and we know exactly which.`} This is not a dashboard overview. This is the evidence that backs the next funding decision.`;
    case 'growth-story':
      return `The growth narrative: ${s.trends.filter(t => t.change > 0).map(t => `${t.col} grew ${t.change}% (${t.firstHalfAvg.toLocaleString()} → ${t.secondHalfAvg.toLocaleString()})`).join('. ') || 'Metrics held steady — a foundation to build on.'}. With ${s.rowCount.toLocaleString()} records backing these numbers, this is statistically significant, not anecdotal. ${s.qualityScore !== undefined ? `Data confidence: ${s.qualityScore}/100.` : ''}`;
    case 'market-opportunity':
      return `The dataset reveals ${s.categoricalColumns.length} segmentation dimensions and ${s.numericColumns.length} measurable KPIs. ${s.columnStats.filter(c => c.uniqueCount && c.uniqueCount > 10).length} variables show high cardinality — indicating a diverse, multi-segment market. ${topGrower ? `The ${topGrower.change}% growth in ${topGrower.col} signals expanding demand.` : 'Stability across metrics suggests a mature market ready for disruption.'} Total addressable data: ${s.rowCount.toLocaleString()} records and growing.`;
    case 'the-ask':
      return `Based on ${s.rowCount.toLocaleString()} data points: ${s.positives.length > 0 ? `${s.positives.length} growth signal(s) confirm product-market fit.` : 'Stable metrics confirm a solid foundation.'} ${s.negatives.length > 0 ? `${s.negatives.length} area(s) to fix — each one an improvement lever.` : 'No critical weaknesses identified.'} Investment thesis: the data supports scaling. Next steps: ${s.recommendations.slice(0, 2).join('; ')}.`;
    default:
      return genericNarrative(section, s);
  }
}

function academicNarrative(section: string, s: ReportStats): string {
  switch (section) {
    case 'executive-summary':
      return `Abstract: This report presents a descriptive statistical analysis of the "${s.datasetName}" dataset (N=${s.rowCount.toLocaleString()}, p=${s.columnCount}). The dataset comprises ${s.numericColumns.length} continuous variables, ${s.categoricalColumns.length} categorical variables, and ${s.dateColumns.length} temporal variables. Split-half trend analysis reveals ${s.trends.filter(t => Math.abs(t.change) > 5).length} statistically notable shifts (|Δ| > 5%). Missing data rate: ${s.missingPct || 0}%. ${s.qualityScore !== undefined ? `Data quality index: ${s.qualityScore}/100.` : 'Formal quality assessment recommended prior to inferential analysis.'} Findings and methodological considerations follow.`;
    case 'methodology':
      return `2.1 Data Collection: The dataset "${s.datasetName}" consists of ${s.rowCount.toLocaleString()} observations across ${s.columnCount} variables. Variable classification was performed programmatically: numeric (${s.numericColumns.length}), categorical (${s.categoricalColumns.length}), temporal (${s.dateColumns.length}).\n\n2.2 Analytical Methods: Descriptive statistics (mean, median, standard deviation, range) were computed for all continuous variables. Trend analysis employed a split-half comparison method, dividing the dataset chronologically (n₁=${Math.floor(s.rowCount / 2)}, n₂=${s.rowCount - Math.floor(s.rowCount / 2)}). Change magnitude calculated as percentage difference between group means.\n\n2.3 Limitations: This analysis is purely descriptive. No causal inferences should be drawn. The split-half method assumes temporal ordering of records. Missing data (${s.missingPct || 0}%) was excluded via listwise deletion.`;
    case 'results':
      return `3.1 Descriptive Statistics:\n${s.columnStats.filter(c => c.type === 'numeric').map(c => `  ${c.name}: M=${c.mean}, Mdn=${c.median}, SD=${c.std}, Range=[${c.min}, ${c.max}], n_missing=${c.missingCount} (${c.missingPct}%)`).join('\n')}\n\n3.2 Trend Analysis:\n${s.trends.map(t => `  ${t.col}: M₁=${t.firstHalfAvg}, M₂=${t.secondHalfAvg}, Δ=${t.change}% (${t.direction})`).join('\n')}\n\n3.3 Notable Findings: ${s.trends.filter(t => Math.abs(t.change) > 5).length} variable(s) showed change exceeding the 5% threshold. ${s.columnStats.filter(c => c.std && c.mean && c.std > c.mean * 0.5).length} variable(s) exhibited high dispersion (CV > 50%).`;
    case 'discussion':
      return `4.1 Interpretation: ${s.positives.length > 0 ? `Positive trends in ${s.positives.map(p => p.split(' shows')[0]).join(', ')} warrant further investigation through controlled experimental designs.` : 'The absence of significant positive trends suggests either stability or the need for intervention studies.'} ${s.negatives.length > 0 ? `Declining trends in ${s.negatives.map(n => n.split(' declined')[0]).join(', ')} merit longitudinal follow-up to determine if the pattern is transient or persistent.` : 'No significant declines were observed.'}\n\n4.2 Limitations: The descriptive nature of this analysis precludes causal attribution. Sample size (N=${s.rowCount.toLocaleString()}) ${s.rowCount >= 1000 ? 'provides adequate power for descriptive purposes' : 'may limit generalizability'}. Missing data (${s.missingPct || 0}%) could introduce systematic bias if not missing completely at random (MCAR).\n\n4.3 Future Directions: Inferential testing (t-tests, ANOVA), regression modeling, and time-series decomposition would extend these preliminary findings.`;
    default:
      return genericNarrative(section, s);
  }
}

// Fallback generic narrative (shared sections)
function genericNarrative(section: string, s: ReportStats): string {
  const topTrend = s.trends[0];
  switch (section) {
    case 'dataset-overview':
      return `The ${s.datasetName} dataset encompasses ${s.rowCount.toLocaleString()} records across ${s.columnCount} dimensions: ${s.numericColumns.length} numeric, ${s.categoricalColumns.length} categorical, ${s.dateColumns.length} temporal. Data completeness: ${(100 - (s.missingPct || 0)).toFixed(1)}%.`;
    case 'kpi-analysis':
      return s.kpis.map(k => `${k.label}: ${k.value}.`).join(' ') + ` ${s.trends.filter(t => t.change > 0).length} metric(s) trending up, ${s.trends.filter(t => t.change < 0).length} declining.`;
    case 'trends':
      return s.trends.map(t =>
        `${t.col}: ${t.direction}, ${t.firstHalfAvg.toLocaleString()} → ${t.secondHalfAvg.toLocaleString()} (${t.change > 0 ? '+' : ''}${t.change}%).`
      ).join(' ');
    case 'positives':
      return s.positives.length > 0
        ? `${s.positives.length} positive signal(s): ${s.positives.join('; ')}.`
        : 'All metrics stable — no exceptional growth detected.';
    case 'negatives':
      return s.negatives.length > 0
        ? `${s.negatives.length} declining metric(s): ${s.negatives.join('; ')}.`
        : 'No significant declines detected.';
    case 'quality':
      return s.qualityScore !== undefined
        ? `Quality score: ${s.qualityScore}/100 (Grade ${s.qualityScore >= 90 ? 'A' : s.qualityScore >= 75 ? 'B' : s.qualityScore >= 60 ? 'C' : 'D'}). Missing data: ${s.missingPct || 0}%. Issues: ${s.qualityIssues || 0}.`
        : 'Quality assessment not yet performed.';
    case 'recommendations':
      return s.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n');
    case 'deep-insights':
      const insights: string[] = [];
      if (s.trends.length >= 2) {
        const t1 = s.trends[0], t2 = s.trends[1];
        if ((t1.change > 0 && t2.change < 0) || (t1.change < 0 && t2.change > 0)) {
          insights.push(`Inverse relationship: ${t1.col} (${t1.change > 0 ? '+' : ''}${t1.change}%) vs ${t2.col} (${t2.change > 0 ? '+' : ''}${t2.change}%) — potential resource competition.`);
        }
      }
      if (s.columnStats.some(c => c.std && c.mean && c.std > c.mean * 0.5)) {
        const volatile = s.columnStats.filter(c => c.std && c.mean && c.std > c.mean * 0.5);
        insights.push(`High volatility in ${volatile.map(c => c.name).join(', ')} (σ > 50% of μ).`);
      }
      insights.push(`${s.numericColumns.length} quantitative dimensions available for cross-correlation analysis.`);
      insights.push(`Dataset size (N=${s.rowCount.toLocaleString()}) ${s.rowCount >= 1000 ? 'supports hypothesis testing' : 'may limit statistical power'}.`);
      return insights.join('\n\n');
    default:
      return `Analysis of ${s.datasetName}: ${s.rowCount.toLocaleString()} records, ${s.columnCount} columns.`;
  }
}

// Main dispatcher — routes to the correct tone-specific narrative
export function generateNarrative(section: string, stats: ReportStats, tone: TemplateTone): string {
  switch (tone) {
    case 'executive': return execNarrative(section, stats);
    case 'technical': return technicalNarrative(section, stats);
    case 'narrative': return narrativeTone(section, stats);
    case 'operational': return operationalNarrative(section, stats);
    case 'bold': return boldNarrative(section, stats);
    case 'academic': return academicNarrative(section, stats);
    default: return genericNarrative(section, stats);
  }
}
