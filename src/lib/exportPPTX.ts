// DataVora — PPTX Export with template-differentiated slide structures
import { saveAs } from 'file-saver';
import { toast } from '@/hooks/use-toast';
import { getTemplate, type TemplateId } from './reportTemplates';
import { buildReportStats, generateNarrative, type ReportStats } from './reportNarrativeBuilder';

// Shared palette — formal, no color, white backgrounds
const WHITE = 'FFFFFF';
const BLACK = '1A1A1A';
const DARK = '2D2D2D';
const BODY = '3C3C3C';
const MUTED = '6B6B6B';
const LIGHT = '999999';
const BORDER = 'D0D0D0';
const ROW_ALT = 'F5F5F5';

const trunc = (s: string, max: number) => s.length > max ? s.substring(0, max) + '...' : s;

// Shared helpers
function addFooter(slide: any, pageNum: number, totalSlides: number, stats: ReportStats) {
  slide.addShape('rect' as any, { x: 0.5, y: 5.38, w: 9.0, h: 0.005, fill: { color: BORDER } });
  slide.addText(`${trunc(stats.datasetName, 30)}  |  ${stats.date}`, {
    x: 0.5, y: 5.42, w: 5, fontSize: 8, color: LIGHT,
  });
  slide.addText(`Page ${pageNum} of ${totalSlides}`, {
    x: 5.5, y: 5.42, w: 4, fontSize: 8, color: LIGHT, align: 'right',
  });
}

function slideTitle(slide: any, titleText: string, subtitle?: string) {
  slide.addText(titleText, { x: 0.5, y: 0.3, w: 9, fontSize: 26, bold: true, color: BLACK, fontFace: 'Arial' });
  if (subtitle) {
    slide.addText(subtitle, { x: 0.5, y: 0.85, w: 9, fontSize: 11, color: MUTED, fontFace: 'Arial' });
  }
  slide.addShape('rect' as any, { x: 0.5, y: 1.08, w: 1.2, h: 0.02, fill: { color: BLACK } });
}

function addCoverSlide(pptx: any, stats: ReportStats, subtitle: string) {
  const cover = pptx.addSlide();
  cover.background = { color: WHITE };
  cover.addText(stats.title, {
    x: 0.8, y: 1.2, w: 8.4, fontSize: 34, bold: true, color: BLACK, fontFace: 'Arial', lineSpacingMultiple: 1.15,
  });
  cover.addShape('rect' as any, { x: 0.8, y: 2.3, w: 2, h: 0.02, fill: { color: BLACK } });
  cover.addText(subtitle, { x: 0.8, y: 2.5, w: 8, fontSize: 16, color: DARK, fontFace: 'Arial' });
  [
    `Date: ${stats.date}`,
    `Dataset: ${trunc(stats.datasetName, 40)}`,
    `Records: ${stats.rowCount.toLocaleString()}  |  Dimensions: ${stats.columnCount}`,
    `Prepared by: ${trunc(stats.userName, 30)}`,
  ].forEach((line, i) => {
    cover.addText(line, { x: 0.8, y: 3.2 + i * 0.35, w: 8, fontSize: 11, color: MUTED, fontFace: 'Arial' });
  });
  return cover;
}

function splitNarrative(text: string, maxChunks = 3): string[] {
  const sentences = text.replace(/\n\n/g, '. ').replace(/\n/g, ' ').split(/(?<=\.)\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  sentences.forEach(s => {
    if ((current + ' ' + s).length > 280 && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current = current ? current + ' ' + s : s;
    }
  });
  if (current) chunks.push(current.trim());
  return chunks.slice(0, maxChunks);
}

function addNarrativeSlide(pptx: any, stats: ReportStats, title: string, subtitle: string, section: string, tone: any, pageNum: number, totalSlides: number) {
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  slideTitle(slide, title, subtitle);
  const chunks = splitNarrative(generateNarrative(section, stats, tone), 3);
  chunks.forEach((chunk, i) => {
    slide.addText(chunk, { x: 0.5, y: 1.3 + i * 0.7, w: 9, fontSize: 11, color: BODY, lineSpacingMultiple: 1.5, fontFace: 'Arial' });
  });
  addFooter(slide, pageNum, totalSlides, stats);
  return slide;
}

function addTableSlide(pptx: any, stats: ReportStats, title: string, subtitle: string, rows: string[][], colWidths: number[], pageNum: number, totalSlides: number) {
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  slideTitle(slide, title, subtitle);
  const tableRows = rows.map((row, ri) => row.map(cell => ({
    text: cell,
    options: {
      fontSize: ri === 0 ? 8 : 9,
      bold: ri === 0,
      color: ri === 0 ? WHITE : BODY,
      fill: { color: ri === 0 ? DARK : ri % 2 === 0 ? ROW_ALT : WHITE },
      fontFace: 'Arial',
    },
  })));
  slide.addTable(tableRows as any, {
    x: 0.5, y: 1.3, w: 9, rowH: 0.32,
    colW: colWidths,
    border: { pt: 0.5, color: BORDER },
    autoPage: false,
  });
  addFooter(slide, pageNum, totalSlides, stats);
  return slide;
}

function addBulletSlide(pptx: any, stats: ReportStats, title: string, subtitle: string, items: string[], pageNum: number, totalSlides: number) {
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  slideTitle(slide, title, subtitle);
  items.slice(0, 8).forEach((item, i) => {
    slide.addText(`${i + 1}.  ${trunc(item, 120)}`, {
      x: 0.7, y: 1.3 + i * 0.42, w: 8.5, fontSize: 11, color: BODY, fontFace: 'Arial',
    });
  });
  addFooter(slide, pageNum, totalSlides, stats);
  return slide;
}

function addClosingSlide(pptx: any, stats: ReportStats, totalSlides: number) {
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  slide.addText('Summary', { x: 0.8, y: 1.0, w: 8.4, fontSize: 30, bold: true, color: BLACK, fontFace: 'Arial' });
  slide.addShape('rect' as any, { x: 0.8, y: 1.7, w: 1.5, h: 0.02, fill: { color: BLACK } });
  slide.addText('Priority Actions:', { x: 0.8, y: 2.0, w: 8, fontSize: 14, bold: true, color: DARK, fontFace: 'Arial' });
  stats.recommendations.slice(0, 3).forEach((a, i) => {
    slide.addText(`${i + 1}.  ${trunc(a, 90)}`, { x: 1.0, y: 2.5 + i * 0.45, w: 8, fontSize: 12, color: BODY, fontFace: 'Arial' });
  });
  slide.addText(`Report prepared by DataVora  |  ${stats.date}`, { x: 0.8, y: 4.5, w: 8, fontSize: 9, color: LIGHT, fontFace: 'Arial' });
  addFooter(slide, totalSlides, totalSlides, stats);
}

function addDataSampleSlide(pptx: any, data: Record<string, unknown>[], stats: ReportStats, pageNum: number, totalSlides: number) {
  if (!data.length) return;
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  slideTitle(slide, 'Data Sample', `First ${Math.min(data.length, 18)} of ${data.length.toLocaleString()} records`);
  const headers = Object.keys(data[0]).slice(0, 7);
  const rows = data.slice(0, 18);
  const tableRows = [
    headers.map(h => ({ text: trunc(h, 16), options: { bold: true, fontSize: 7, fill: { color: DARK }, color: WHITE, fontFace: 'Arial' } })),
    ...rows.map((row, ri) => headers.map(h => ({
      text: trunc(String(row[h] ?? ''), 20),
      options: { fontSize: 7, color: BODY, fill: { color: ri % 2 === 0 ? WHITE : ROW_ALT }, fontFace: 'Arial' },
    }))),
  ];
  slide.addTable(tableRows as any, {
    x: 0.5, y: 1.3, w: 9, rowH: 0.22,
    colW: Array(headers.length).fill(9 / headers.length),
    border: { pt: 0.5, color: BORDER },
    autoPage: false,
  });
  addFooter(slide, pageNum, totalSlides, stats);
}

// ─── TEMPLATE-SPECIFIC BUILDERS ─────────────────────────────────

function buildExecutive(pptx: any, stats: ReportStats, data: Record<string, unknown>[]) {
  // 7 slides: Title → Executive Summary → Decision Brief → KPI Table → Risk Register → Recommendations → Closing
  const total = 7;
  addCoverSlide(pptx, stats, 'Board-Level Intelligence Brief');
  addNarrativeSlide(pptx, stats, 'Executive Summary', 'Bottom-line findings for leadership', 'executive-summary', 'executive', 2, total);

  // Decision Brief — unique to executive
  addNarrativeSlide(pptx, stats, 'Decision Brief', 'Items requiring board action', 'decision-brief', 'executive', 3, total);

  // KPI table
  const kpiRows = [
    ['Indicator', 'Value', 'Trend'],
    ...stats.kpis.slice(0, 8).map(kpi => {
      const t = stats.trends.find(t => kpi.label.includes(t.col));
      return [kpi.label, kpi.value, t ? `${t.direction} (${t.change > 0 ? '+' : ''}${t.change}%)` : '—'];
    }),
  ];
  addTableSlide(pptx, stats, 'Key Metrics', 'Performance indicators at a glance', kpiRows, [4, 2.5, 2.5], 4, total);

  // Risk Register — unique to executive
  addNarrativeSlide(pptx, stats, 'Risk Register', 'Identified risks with severity and ownership', 'risk-register', 'executive', 5, total);

  addBulletSlide(pptx, stats, 'Recommendations', 'Prioritized actions for leadership', stats.recommendations, 6, total);
  addClosingSlide(pptx, stats, total);
}

function buildAnalyst(pptx: any, stats: ReportStats, data: Record<string, unknown>[]) {
  // 12 slides: Title → Abstract → Methodology → Dataset Structure → Statistical Summary → Distribution Analysis → Trends → KPIs → Quality → Insights → Data Sample → Closing
  const total = 12;
  addCoverSlide(pptx, stats, 'Statistical Analysis Report');
  addNarrativeSlide(pptx, stats, 'Abstract', 'Summary of dataset and analytical approach', 'executive-summary', 'technical', 2, total);

  // Methodology — unique to analyst
  addNarrativeSlide(pptx, stats, 'Methodology', 'Analytical methods and limitations', 'methodology', 'technical', 3, total);

  // Dataset structure table
  const structRows = [
    ['Metric', 'Value'],
    ['Total Records (N)', stats.rowCount.toLocaleString()],
    ['Variables (p)', String(stats.columnCount)],
    ['Continuous', String(stats.numericColumns.length)],
    ['Categorical', String(stats.categoricalColumns.length)],
    ['Temporal', String(stats.dateColumns.length)],
    ['Missing Rate', `${stats.missingPct || 0}%`],
    ['Completeness', `${(100 - (stats.missingPct || 0)).toFixed(1)}%`],
  ];
  addTableSlide(pptx, stats, 'Dataset Structure', 'Schema composition and completeness', structRows, [4.5, 4.5], 4, total);

  // Statistical summary — unique to analyst
  addNarrativeSlide(pptx, stats, 'Statistical Summary', 'Descriptive statistics for continuous variables', 'statistical-summary', 'technical', 5, total);

  // Distribution analysis — unique to analyst
  addNarrativeSlide(pptx, stats, 'Distribution Analysis', 'Dispersion and coefficient of variation', 'distribution-analysis', 'technical', 6, total);

  // Trend table
  const trendRows = [
    ['Variable', 'Direction', 'Δ%', 'μ₁ (1st half)', 'μ₂ (2nd half)'],
    ...stats.trends.map(t => [trunc(t.col, 25), t.direction, `${t.change > 0 ? '+' : ''}${t.change}%`, t.firstHalfAvg.toLocaleString(), t.secondHalfAvg.toLocaleString()]),
  ];
  addTableSlide(pptx, stats, 'Trend Analysis', 'Split-half comparison of means', trendRows, [2.5, 1.5, 1, 2, 2], 7, total);

  addNarrativeSlide(pptx, stats, 'KPI Analysis', 'Key performance metrics', 'kpi-analysis', 'technical', 8, total);
  addNarrativeSlide(pptx, stats, 'Data Quality', 'Quality assessment and reliability', 'quality', 'technical', 9, total);
  addNarrativeSlide(pptx, stats, 'Analytical Insights', 'Patterns and anomalies', 'deep-insights', 'technical', 10, total);
  addDataSampleSlide(pptx, data, stats, 11, total);
  addClosingSlide(pptx, stats, total);
}

function buildStorytelling(pptx: any, stats: ReportStats, data: Record<string, unknown>[]) {
  // 9 slides: Title → The Story → The Situation → The Turning Point → What's Working → What's Not → The Resolution → Data Evidence → Closing
  const total = 9;
  addCoverSlide(pptx, stats, 'A Data Story');

  // Story arc — unique to storytelling
  addNarrativeSlide(pptx, stats, 'The Story', 'A narrative built from the numbers', 'executive-summary', 'narrative', 2, total);
  addNarrativeSlide(pptx, stats, 'The Situation', 'Setting the scene with data', 'the-situation', 'narrative', 3, total);
  addNarrativeSlide(pptx, stats, 'The Turning Point', 'Where the numbers shift', 'the-turning-point', 'narrative', 4, total);

  addNarrativeSlide(pptx, stats, 'What\'s Working', 'Bright spots in the data', 'positives', 'narrative', 5, total);
  addNarrativeSlide(pptx, stats, 'What\'s Not', 'The challenges the data reveals', 'negatives', 'narrative', 6, total);

  // Resolution — unique to storytelling
  addNarrativeSlide(pptx, stats, 'The Resolution', 'Where the story leads — and what to do', 'the-resolution', 'narrative', 7, total);

  addDataSampleSlide(pptx, data, stats, 8, total);
  addClosingSlide(pptx, stats, total);
}

function buildOperational(pptx: any, stats: ReportStats, data: Record<string, unknown>[]) {
  // 7 slides: Title → Status Overview → RAG Status → SLA Metrics → Action Items → Quality → Closing
  const total = 7;
  addCoverSlide(pptx, stats, 'Operational Status Report');

  addNarrativeSlide(pptx, stats, 'Status Overview', 'Current operational standing', 'executive-summary', 'operational', 2, total);

  // RAG Status — unique to operational
  addNarrativeSlide(pptx, stats, 'RAG Status', 'Red / Amber / Green metric assessment', 'rag-status', 'operational', 3, total);

  // SLA Metrics — unique to operational
  addNarrativeSlide(pptx, stats, 'SLA Metrics', 'Service level agreement compliance', 'sla-metrics', 'operational', 4, total);

  // Action Items — unique to operational
  addNarrativeSlide(pptx, stats, 'Action Items', 'Prioritized tasks with owners and deadlines', 'action-items', 'operational', 5, total);

  addNarrativeSlide(pptx, stats, 'Data Quality', 'Data health and reliability metrics', 'quality', 'operational', 6, total);
  addClosingSlide(pptx, stats, total);
}

function buildInvestor(pptx: any, stats: ReportStats, data: Record<string, unknown>[]) {
  // 8 slides: Title → The Opportunity → Growth Story → Market Opportunity → KPIs → The Numbers → The Ask → Closing
  const total = 8;
  addCoverSlide(pptx, stats, 'Investment Intelligence Report');

  addNarrativeSlide(pptx, stats, 'The Opportunity', 'Why this data matters', 'executive-summary', 'bold', 2, total);

  // Growth Story — unique to investor
  addNarrativeSlide(pptx, stats, 'Growth Story', 'Performance trajectory backed by data', 'growth-story', 'bold', 3, total);

  // Market Opportunity — unique to investor
  addNarrativeSlide(pptx, stats, 'Market Opportunity', 'Segmentation and expansion signals', 'market-opportunity', 'bold', 4, total);

  // KPI table
  const kpiRows = [
    ['Metric', 'Value', 'Movement'],
    ...stats.kpis.slice(0, 8).map(kpi => {
      const t = stats.trends.find(t => kpi.label.includes(t.col));
      return [kpi.label, kpi.value, t ? `${t.change > 0 ? '↑' : t.change < 0 ? '↓' : '→'} ${Math.abs(t.change)}%` : '—'];
    }),
  ];
  addTableSlide(pptx, stats, 'The Numbers', 'Key performance indicators', kpiRows, [4, 2.5, 2.5], 5, total);

  addNarrativeSlide(pptx, stats, 'Data Confidence', 'Quality and reliability of the evidence', 'quality', 'bold', 6, total);

  // The Ask — unique to investor
  addNarrativeSlide(pptx, stats, 'The Ask', 'Investment thesis and next steps', 'the-ask', 'bold', 7, total);

  addClosingSlide(pptx, stats, total);
}

function buildAcademic(pptx: any, stats: ReportStats, data: Record<string, unknown>[]) {
  // 9 slides: Title → Abstract → Methodology → Dataset → Results → Discussion → Quality → Data Sample → References/Closing
  const total = 9;
  addCoverSlide(pptx, stats, 'Research Analysis Report');

  addNarrativeSlide(pptx, stats, '1. Abstract', 'Summary of objectives, methods, and key findings', 'executive-summary', 'academic', 2, total);

  // Methodology — unique to academic
  addNarrativeSlide(pptx, stats, '2. Methodology', 'Data collection, analytical methods, and limitations', 'methodology', 'academic', 3, total);

  // Dataset table
  const datasetRows = [
    ['Parameter', 'Value'],
    ['Sample Size (N)', stats.rowCount.toLocaleString()],
    ['Variables (p)', String(stats.columnCount)],
    ['Continuous Variables', String(stats.numericColumns.length)],
    ['Categorical Variables', String(stats.categoricalColumns.length)],
    ['Temporal Variables', String(stats.dateColumns.length)],
    ['Missing Data Rate', `${stats.missingPct || 0}%`],
  ];
  addTableSlide(pptx, stats, '3. Dataset Description', 'Sample characteristics and variable classification', datasetRows, [4.5, 4.5], 4, total);

  // Results — unique to academic
  addNarrativeSlide(pptx, stats, '4. Results', 'Descriptive statistics and trend analysis findings', 'results', 'academic', 5, total);

  // Discussion — unique to academic
  addNarrativeSlide(pptx, stats, '5. Discussion', 'Interpretation, limitations, and future directions', 'discussion', 'academic', 6, total);

  addNarrativeSlide(pptx, stats, '6. Data Quality', 'Assessment of analytical reliability', 'quality', 'academic', 7, total);
  addDataSampleSlide(pptx, data, stats, 8, total);
  addClosingSlide(pptx, stats, total);
}

// ─── MAIN EXPORT ────────────────────────────────────────────────

export async function exportRichPPTX(
  data: Record<string, unknown>[],
  datasetName: string,
  userName: string,
  title: string,
  templateId: TemplateId = 'executive',
  qualityReport?: { overallScore: number; issues: any[] } | null
) {
  try {
    const stats = buildReportStats(data, datasetName, userName, title, qualityReport);
    const tpl = getTemplate(templateId);
    const pptxgenjs = await import('pptxgenjs');
    const pptx = new pptxgenjs.default();
    pptx.layout = 'LAYOUT_WIDE';

    switch (tpl.id) {
      case 'executive':   buildExecutive(pptx, stats, data); break;
      case 'analyst':     buildAnalyst(pptx, stats, data); break;
      case 'storytelling': buildStorytelling(pptx, stats, data); break;
      case 'operational': buildOperational(pptx, stats, data); break;
      case 'investor':    buildInvestor(pptx, stats, data); break;
      case 'academic':    buildAcademic(pptx, stats, data); break;
      default:            buildExecutive(pptx, stats, data); break;
    }

    const blob = await pptx.write({ outputType: 'blob' }) as Blob;
    const filename = `${stats.title.replace(/\s+/g, '-').toLowerCase()}-${tpl.id}.pptx`;
    saveAs(blob, filename);
    toast({ title: 'Presentation Exported', description: `${tpl.name} report downloaded (${tpl.slideCount} slides).` });
  } catch (e) {
    console.error('PPTX export error:', e);
    toast({ title: 'Export Failed', description: 'Could not generate presentation.', variant: 'destructive' });
  }
}
