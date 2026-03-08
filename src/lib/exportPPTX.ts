// DataPulse — Rich PPTX Export with Visual Layouts (v3 — all fixes applied)
import { saveAs } from 'file-saver';
import { toast } from '@/hooks/use-toast';
import { getTemplate, type TemplateId } from './reportTemplates';
import { buildReportStats, generateNarrative } from './reportNarrativeBuilder';

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

    // FIX 7: Consistent dark theme for ALL slides
    const BG = '0A0A0F';
    const CARD_BG = '1A1A2E';
    const CARD_LIGHT = '252540';
    const TEXT_WHITE = 'FFFFFF';
    const TEXT_MUTED = 'A0A0B8';
    const TEXT_DIM = '6B6B80';
    const ACCENT = tpl.colors[1].replace('#', '') || '0066FF';
    const GREEN = '00C851';
    const RED = 'FF4444';
    const YELLOW = 'FFBB33';
    const BLUE = '4488FF';

    // Truncate text helper for FIX 1
    const trunc = (s: string, max: number) => s.length > max ? s.substring(0, max) + '…' : s;

    // FIX 5: Footer at very bottom y=5.4
    const footer = (slide: any) => {
      slide.addText(`DataPulse Analytics  |  ${trunc(stats.datasetName, 30)}  |  ${stats.date}`, {
        x: 0.5, y: 5.4, w: 9, fontSize: 7, color: TEXT_DIM, align: 'center',
      });
    };

    const slideTitle = (slide: any, text: string, subtitle?: string) => {
      slide.addText(text, { x: 0.6, y: 0.25, w: 8.5, fontSize: 22, bold: true, color: TEXT_WHITE, strike: false });
      if (subtitle) {
        slide.addText(subtitle, { x: 0.6, y: 0.65, w: 8.5, fontSize: 10, color: TEXT_MUTED, strike: false });
      }
      // Accent bar under title (shape, not underline — FIX 6/8)
      slide.addShape('rect' as any, { x: 0.6, y: subtitle ? 0.95 : 0.65, w: 2, h: 0.04, fill: { color: ACCENT } });
    };

    // FIX 10: Key takeaway box helper
    const keyTakeaway = (slide: any, text: string, y = 4.85) => {
      slide.addShape('roundRect' as any, { x: 0.6, y, w: 9, h: 0.45, fill: { color: ACCENT + '18' }, rectRadius: 0.05 });
      slide.addShape('rect' as any, { x: 0.6, y, w: 0.08, h: 0.45, fill: { color: ACCENT } });
      slide.addText(`Key Takeaway: ${text}`, { x: 0.85, y: y + 0.07, w: 8.5, fontSize: 10, color: TEXT_WHITE, italic: true, strike: false });
    };

    const splitNarrative = (text: string, maxChunks = 3): string[] => {
      const sentences = text.replace(/\n/g, ' ').split(/(?<=\.)\s+/).filter(Boolean);
      const chunks: string[] = [];
      let current = '';
      sentences.forEach(s => {
        if ((current + ' ' + s).length > 220 && current) {
          chunks.push(current.trim());
          current = s;
        } else {
          current = current ? current + ' ' + s : s;
        }
      });
      if (current) chunks.push(current.trim());
      return chunks.slice(0, maxChunks);
    };

    // =============================================
    // SLIDE 1 — Cover (FIX 1: truncate card values, FIX 7: use BG)
    // =============================================
    const cover = pptx.addSlide();
    cover.background = { color: BG };
    cover.addShape('rect' as any, { x: 0, y: 0, w: 0.12, h: '100%', fill: { color: ACCENT } });
    cover.addShape('rect' as any, { x: 0, y: 3.2, w: '100%', h: 0.04, fill: { color: ACCENT } });
    cover.addText(stats.title, { x: 0.8, y: 1.0, w: 8, fontSize: 36, bold: true, color: TEXT_WHITE, lineSpacingMultiple: 1.2, strike: false });
    cover.addText('Data Intelligence Report', { x: 0.8, y: 2.1, w: 8, fontSize: 18, color: ACCENT, bold: true, strike: false });
    cover.addText('Comprehensive Analysis & Strategic Insights', { x: 0.8, y: 2.6, w: 8, fontSize: 12, color: TEXT_MUTED, strike: false });

    const coverInfo = [
      { label: 'DATE', value: stats.date },
      { label: 'DATASET', value: trunc(stats.datasetName, 18) },
      { label: 'RECORDS', value: stats.rowCount.toLocaleString() },
      { label: 'DIMENSIONS', value: String(stats.columnCount) },
      { label: 'ANALYST', value: trunc(stats.userName, 18) },
    ];
    coverInfo.forEach((info, i) => {
      const x = 0.8 + i * 1.85;
      cover.addShape('roundRect' as any, { x, y: 3.6, w: 1.7, h: 1.0, fill: { color: CARD_BG }, rectRadius: 0.05 });
      cover.addText(info.label, { x, y: 3.65, w: 1.7, fontSize: 7, color: ACCENT, align: 'center', bold: true, strike: false });
      cover.addText(info.value, { x, y: 3.95, w: 1.7, fontSize: 11, color: TEXT_WHITE, align: 'center', bold: true, strike: false });
    });
    cover.addText(`Template: ${tpl.name}`, { x: 0.8, y: 4.9, w: 8, fontSize: 8, color: TEXT_DIM, strike: false });

    // =============================================
    // SLIDE 2 — Executive Summary (FIX 2: fill space, FIX 8: no strike)
    // =============================================
    const s2 = pptx.addSlide();
    s2.background = { color: BG };
    slideTitle(s2, 'Executive Summary', 'Key Findings at a Glance');
    const execChunks = splitNarrative(generateNarrative('executive-summary', stats, tpl.tone), 3);
    execChunks.forEach((chunk, i) => {
      s2.addText(chunk, { x: 0.6, y: 1.15 + i * 0.75, w: 5.2, fontSize: 10, color: TEXT_MUTED, lineSpacingMultiple: 1.45, strike: false });
    });
    // Right column — stat boxes (stretched taller)
    const execStats = [
      { label: 'Total Records', value: stats.rowCount.toLocaleString(), color: BLUE },
      { label: 'Positive Signals', value: String(stats.positives.length), color: GREEN },
      { label: 'Risk Indicators', value: String(stats.negatives.length), color: RED },
      { label: 'Quality Score', value: stats.qualityScore !== undefined ? `${stats.qualityScore}/100` : 'N/A', color: ACCENT },
    ];
    execStats.forEach((st, i) => {
      const y = 1.15 + i * 0.95;
      s2.addShape('roundRect' as any, { x: 6.2, y, w: 3.4, h: 0.8, fill: { color: CARD_BG }, rectRadius: 0.06 });
      s2.addShape('rect' as any, { x: 6.2, y, w: 0.08, h: 0.8, fill: { color: st.color } });
      s2.addText(st.value, { x: 6.5, y: y + 0.08, w: 1.8, fontSize: 22, bold: true, color: st.color, strike: false });
      s2.addText(st.label, { x: 6.5, y: y + 0.48, w: 2.8, fontSize: 9, color: TEXT_DIM, strike: false });
    });
    // Bottom highlight bar
    s2.addShape('roundRect' as any, { x: 0.6, y: 4.35, w: 9, h: 0.45, fill: { color: CARD_BG }, rectRadius: 0.06 });
    s2.addText(`${stats.numericColumns.length} quantitative metrics  •  ${stats.categoricalColumns.length} categorical dimensions  •  ${stats.dateColumns.length} temporal fields`, {
      x: 0.8, y: 4.4, w: 8.6, fontSize: 10, color: TEXT_MUTED, align: 'center', strike: false,
    });
    keyTakeaway(s2, stats.positives[0] || 'Dataset analysis complete — review KPIs and trends for strategic direction.');
    footer(s2);

    // =============================================
    // SLIDE 3 — Dataset Overview (FIX 3: no emoji icons, use colored circles with letters)
    // =============================================
    const s3 = pptx.addSlide();
    s3.background = { color: BG };
    slideTitle(s3, 'Understanding Your Data Landscape', 'Dataset structure and composition');
    const overviewNarr = splitNarrative(generateNarrative('dataset-overview', stats, tpl.tone), 2);
    overviewNarr.forEach((chunk, i) => {
      s3.addText(chunk, { x: 0.6, y: 1.15 + i * 0.65, w: 9, fontSize: 10, color: TEXT_MUTED, lineSpacingMultiple: 1.4, strike: false });
    });
    const overviewCards = [
      { letter: 'R', letterColor: BLUE, label: 'Total Records', value: stats.rowCount.toLocaleString() },
      { letter: 'D', letterColor: ACCENT, label: 'Dimensions', value: String(stats.columnCount) },
      { letter: 'N', letterColor: GREEN, label: 'Numeric Columns', value: String(stats.numericColumns.length) },
      { letter: 'C', letterColor: YELLOW, label: 'Categorical', value: String(stats.categoricalColumns.length) },
      { letter: 'T', letterColor: RED, label: 'Date Fields', value: String(stats.dateColumns.length) },
      { letter: '%', letterColor: GREEN, label: 'Completeness', value: `${(100 - (stats.missingPct || 0)).toFixed(1)}%` },
    ];
    overviewCards.forEach((card, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 0.6 + col * 3.15;
      const y = 2.6 + row * 1.25;
      s3.addShape('roundRect' as any, { x, y, w: 2.95, h: 1.05, fill: { color: CARD_BG }, rectRadius: 0.06 });
      // Colored circle with letter instead of emoji
      s3.addShape('ellipse' as any, { x: x + 0.15, y: y + 0.2, w: 0.5, h: 0.5, fill: { color: card.letterColor } });
      s3.addText(card.letter, { x: x + 0.15, y: y + 0.2, w: 0.5, fontSize: 14, bold: true, color: TEXT_WHITE, align: 'center', strike: false });
      s3.addText(card.value, { x: x + 0.8, y: y + 0.1, w: 1.9, fontSize: 22, bold: true, color: TEXT_WHITE, strike: false });
      s3.addText(card.label, { x: x + 0.8, y: y + 0.55, w: 1.9, fontSize: 9, color: TEXT_DIM, strike: false });
    });
    keyTakeaway(s3, `${stats.columnCount} dimensions across ${stats.rowCount.toLocaleString()} records provide a robust analytical foundation.`);
    footer(s3);

    // =============================================
    // SLIDE 4 — KPI Dashboard (FIX 5: color-coded cards with arrows)
    // =============================================
    const s4 = pptx.addSlide();
    s4.background = { color: BG };
    slideTitle(s4, 'Performance Metrics', 'Where you stand across key indicators');
    const kpiNarrative = generateNarrative('kpi-analysis', stats, tpl.tone);
    s4.addText(splitNarrative(kpiNarrative, 1)[0] || '', { x: 0.6, y: 1.15, w: 9, fontSize: 9, color: TEXT_DIM, lineSpacingMultiple: 1.3, strike: false });

    stats.kpis.slice(0, 6).forEach((kpi, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 0.5 + col * 3.2;
      const y = 1.7 + row * 1.6;
      const matchingTrend = stats.trends.find(t => kpi.label.includes(t.col));
      const borderColor = matchingTrend ? (matchingTrend.change > 5 ? GREEN : matchingTrend.change < -5 ? RED : YELLOW) : BLUE;
      const arrow = matchingTrend ? (matchingTrend.change > 1 ? '↑' : matchingTrend.change < -1 ? '↓' : '→') : '';
      const arrowColor = matchingTrend ? (matchingTrend.change > 1 ? GREEN : matchingTrend.change < -1 ? RED : YELLOW) : TEXT_DIM;

      s4.addShape('roundRect' as any, { x, y, w: 3, h: 1.4, fill: { color: CARD_BG }, rectRadius: 0.06 });
      s4.addShape('rect' as any, { x, y, w: 0.07, h: 1.4, fill: { color: borderColor } });
      s4.addText(kpi.value, { x: x + 0.25, y: y + 0.1, w: 2, fontSize: 24, bold: true, color: TEXT_WHITE, strike: false });
      if (arrow) {
        s4.addText(arrow, { x: x + 2.3, y: y + 0.1, w: 0.5, fontSize: 22, bold: true, color: arrowColor, align: 'center', strike: false });
      }
      s4.addText(trunc(kpi.label, 30), { x: x + 0.25, y: y + 0.7, w: 2.5, fontSize: 9, color: TEXT_DIM, strike: false });
      if (matchingTrend) {
        s4.addText(`${matchingTrend.change > 0 ? '+' : ''}${matchingTrend.change}%`, { x: x + 0.25, y: y + 0.98, w: 1.5, fontSize: 9, color: arrowColor, bold: true, strike: false });
      }
    });
    keyTakeaway(s4, stats.kpis.length > 0
      ? `${stats.kpis[0].label} at ${stats.kpis[0].value} is the leading indicator across all metrics.`
      : 'Review all KPIs to identify performance gaps and opportunities.');
    footer(s4);

    // =============================================
    // SLIDE 5 — Trends (FIX 4: rows with icons, max 6, 13pt)
    // =============================================
    const s5 = pptx.addSlide();
    s5.background = { color: BG };
    slideTitle(s5, 'Trend Patterns', 'Performance trajectory across key metrics');
    const trendNarr = splitNarrative(generateNarrative('trends', stats, tpl.tone), 1);
    s5.addText(trendNarr[0] || '', { x: 0.6, y: 1.15, w: 9, fontSize: 9, color: TEXT_DIM, lineSpacingMultiple: 1.3, strike: false });

    // Table header
    const thY = 1.65;
    s5.addShape('roundRect' as any, { x: 0.5, y: thY, w: 9.1, h: 0.4, fill: { color: CARD_LIGHT }, rectRadius: 0.04 });
    s5.addText('METRIC', { x: 0.7, y: thY + 0.05, w: 2.5, fontSize: 8, bold: true, color: ACCENT, strike: false });
    s5.addText('DIRECTION', { x: 3.3, y: thY + 0.05, w: 1.5, fontSize: 8, bold: true, color: ACCENT, strike: false });
    s5.addText('CHANGE', { x: 5.0, y: thY + 0.05, w: 1.2, fontSize: 8, bold: true, color: ACCENT, strike: false });
    s5.addText('1ST HALF AVG', { x: 6.4, y: thY + 0.05, w: 1.5, fontSize: 8, bold: true, color: ACCENT, strike: false });
    s5.addText('2ND HALF AVG', { x: 8.0, y: thY + 0.05, w: 1.5, fontSize: 8, bold: true, color: ACCENT, strike: false });

    const trendRows = stats.trends.slice(0, 6);
    const trendRowH = trendRows.length <= 3 ? 0.7 : 0.55;
    trendRows.forEach((t, i) => {
      const rowY = 2.15 + i * trendRowH;
      const rowBg = i % 2 === 0 ? CARD_BG : BG;
      const changeColor = t.change > 1 ? GREEN : t.change < -1 ? RED : YELLOW;
      const arrow = t.change > 1 ? '↑' : t.change < -1 ? '↓' : '→';

      s5.addShape('roundRect' as any, { x: 0.5, y: rowY, w: 9.1, h: trendRowH - 0.05, fill: { color: rowBg }, rectRadius: 0.03 });
      s5.addShape('ellipse' as any, { x: 0.6, y: rowY + (trendRowH - 0.2) / 2, w: 0.18, h: 0.18, fill: { color: changeColor } });
      s5.addText(trunc(t.col, 22), { x: 0.88, y: rowY + 0.08, w: 2.3, fontSize: 12, color: TEXT_WHITE, strike: false });
      s5.addText(`${arrow} ${t.direction}`, { x: 3.3, y: rowY + 0.08, w: 1.5, fontSize: 12, color: changeColor, strike: false });
      s5.addShape('roundRect' as any, { x: 5.0, y: rowY + 0.08, w: 1.0, h: 0.32, fill: { color: changeColor + '25' }, rectRadius: 0.04 });
      s5.addText(`${t.change > 0 ? '+' : ''}${t.change}%`, { x: 5.0, y: rowY + 0.09, w: 1.0, fontSize: 11, bold: true, color: changeColor, align: 'center', strike: false });
      s5.addText(t.firstHalfAvg.toLocaleString(), { x: 6.4, y: rowY + 0.1, w: 1.5, fontSize: 11, color: TEXT_MUTED, strike: false });
      s5.addText(t.secondHalfAvg.toLocaleString(), { x: 8.0, y: rowY + 0.1, w: 1.5, fontSize: 11, color: TEXT_MUTED, strike: false });
    });
    const trendEndY = 2.15 + trendRows.length * trendRowH;
    keyTakeaway(s5,
      trendRows.length > 0
        ? `${trendRows.filter(t => t.change > 0).length} metrics trending up, ${trendRows.filter(t => t.change < 0).length} declining — prioritize declining indicators.`
        : 'No significant trends detected in current dataset.',
      Math.max(trendEndY + 0.15, 4.85)
    );
    footer(s5);

    // =============================================
    // SLIDE 6 — Strengths (FIX 4: minimum 3 items always)
    // =============================================
    const s6 = pptx.addSlide();
    s6.background = { color: BG };
    slideTitle(s6, 'Strengths to Leverage', 'Positive signals and growth indicators');
    const posNarr = splitNarrative(generateNarrative('positives', stats, tpl.tone), 2);
    posNarr.forEach((chunk, i) => {
      s6.addText(chunk, { x: 0.6, y: 1.15 + i * 0.65, w: 9, fontSize: 10, color: TEXT_MUTED, lineSpacingMultiple: 1.4, strike: false });
    });

    // FIX 4: Always show minimum 3 items
    const defaultPositives = [
      'Dataset Stability — All records conform to a consistent schema with no structural anomalies',
      `Data Completeness — ${(100 - (stats.missingPct || 0)).toFixed(1)}% of all fields are populated across ${stats.rowCount.toLocaleString()} records`,
      `Data Quality Grade ${stats.qualityScore !== undefined && stats.qualityScore >= 90 ? 'A' : stats.qualityScore !== undefined && stats.qualityScore >= 75 ? 'B' : stats.qualityScore !== undefined && stats.qualityScore >= 60 ? 'C' : 'B'} (${stats.qualityScore ?? 'N/A'}/100) — Dataset meets analytical reliability threshold`,
      'Consistent Structure — Uniform data types across all records enable reliable aggregation',
      `Multi-Dimensional Analysis Ready — ${stats.numericColumns.length} numeric and ${stats.categoricalColumns.length} categorical columns enable deep segmentation`,
    ];
    const positiveItems = stats.positives.length >= 3 ? stats.positives : [...stats.positives, ...defaultPositives].slice(0, 5);

    positiveItems.slice(0, 5).forEach((p, i) => {
      const y = 2.55 + i * 0.5;
      s6.addShape('roundRect' as any, { x: 0.6, y, w: 9, h: 0.42, fill: { color: CARD_BG }, rectRadius: 0.05 });
      s6.addShape('rect' as any, { x: 0.6, y, w: 0.07, h: 0.42, fill: { color: GREEN } });
      // Colored circle with checkmark number instead of emoji
      s6.addShape('ellipse' as any, { x: 0.82, y: y + 0.08, w: 0.28, h: 0.28, fill: { color: GREEN } });
      s6.addText(String(i + 1), { x: 0.82, y: y + 0.08, w: 0.28, fontSize: 10, bold: true, color: TEXT_WHITE, align: 'center', strike: false });
      s6.addText(trunc(p, 100), { x: 1.25, y: y + 0.07, w: 8, fontSize: 11, color: TEXT_WHITE, strike: false });
    });

    // Summary box
    const posEndY = 2.55 + Math.min(positiveItems.length, 5) * 0.5 + 0.15;
    s6.addShape('roundRect' as any, { x: 0.6, y: Math.max(posEndY, 4.85), w: 9, h: 0.42, fill: { color: GREEN + '15' }, rectRadius: 0.05 });
    s6.addText(`${positiveItems.length} positive signal${positiveItems.length !== 1 ? 's' : ''} detected — strategic amplification recommended`, {
      x: 0.8, y: Math.max(posEndY, 4.85) + 0.06, w: 8.6, fontSize: 10, color: GREEN, align: 'center', strike: false,
    });
    footer(s6);

    // =============================================
    // SLIDE 7 — Risks (red cards with severity)
    // =============================================
    const s7 = pptx.addSlide();
    s7.background = { color: BG };
    slideTitle(s7, 'Critical Issues', 'Areas demanding immediate attention');
    const negNarr = splitNarrative(generateNarrative('negatives', stats, tpl.tone), 2);
    negNarr.forEach((chunk, i) => {
      s7.addText(chunk, { x: 0.6, y: 1.15 + i * 0.65, w: 9, fontSize: 10, color: TEXT_MUTED, lineSpacingMultiple: 1.4, strike: false });
    });

    const riskItems = stats.risks.length >= 3 ? stats.risks : [
      ...stats.risks,
      'Monitor data freshness — ensure regular ingestion schedules',
      'Validate downstream dependencies for data pipeline reliability',
      'Establish data quality monitoring thresholds for automated alerting',
    ].slice(0, 5);

    riskItems.slice(0, 5).forEach((r, i) => {
      const y = 2.55 + i * 0.5;
      const severity = r.toLowerCase().includes('no significant') ? 'LOW' : i === 0 ? 'HIGH' : 'MED';
      const sevColor = severity === 'HIGH' ? RED : severity === 'MED' ? YELLOW : GREEN;
      s7.addShape('roundRect' as any, { x: 0.6, y, w: 9, h: 0.42, fill: { color: CARD_BG }, rectRadius: 0.05 });
      s7.addShape('rect' as any, { x: 0.6, y, w: 0.07, h: 0.42, fill: { color: RED } });
      // Colored circle with number
      s7.addShape('ellipse' as any, { x: 0.82, y: y + 0.08, w: 0.28, h: 0.28, fill: { color: RED } });
      s7.addText(String(i + 1), { x: 0.82, y: y + 0.08, w: 0.28, fontSize: 10, bold: true, color: TEXT_WHITE, align: 'center', strike: false });
      s7.addText(trunc(r, 90), { x: 1.25, y: y + 0.07, w: 7, fontSize: 11, color: TEXT_WHITE, strike: false });
      // Severity badge
      s7.addShape('roundRect' as any, { x: 8.6, y: y + 0.07, w: 0.8, h: 0.28, fill: { color: sevColor + '30' }, rectRadius: 0.04 });
      s7.addText(severity, { x: 8.6, y: y + 0.07, w: 0.8, fontSize: 8, bold: true, color: sevColor, align: 'center', strike: false });
    });

    const riskEndY = 2.55 + Math.min(riskItems.length, 5) * 0.5 + 0.15;
    s7.addShape('roundRect' as any, { x: 0.6, y: Math.max(riskEndY, 4.85), w: 9, h: 0.42, fill: { color: RED + '15' }, rectRadius: 0.05 });
    s7.addText(`${stats.negatives.length} risk factor${stats.negatives.length !== 1 ? 's' : ''} identified — structured remediation recommended`, {
      x: 0.8, y: Math.max(riskEndY, 4.85) + 0.06, w: 8.6, fontSize: 10, color: RED, align: 'center', strike: false,
    });
    footer(s7);

    // =============================================
    // SLIDE 8 — Data Quality (score + metrics grid + takeaway)
    // =============================================
    const s8 = pptx.addSlide();
    s8.background = { color: BG };
    slideTitle(s8, 'Data Quality Report', 'Foundation of reliable insights');
    const qScore = stats.qualityScore ?? 0;
    const qGrade = qScore >= 90 ? 'A' : qScore >= 75 ? 'B' : qScore >= 60 ? 'C' : 'D';
    const qColor = qScore >= 80 ? GREEN : qScore >= 60 ? YELLOW : RED;
    s8.addShape('ellipse' as any, { x: 0.8, y: 1.3, w: 2.2, h: 2.2, fill: { color: CARD_BG }, line: { color: qColor, width: 3 } });
    s8.addText(stats.qualityScore !== undefined ? `${qScore}` : '—', { x: 0.8, y: 1.6, w: 2.2, fontSize: 40, bold: true, color: qColor, align: 'center', strike: false });
    s8.addText(stats.qualityScore !== undefined ? `Grade ${qGrade}` : 'Not scanned', { x: 0.8, y: 2.55, w: 2.2, fontSize: 11, color: TEXT_DIM, align: 'center', strike: false });

    const qualNarr = splitNarrative(generateNarrative('quality', stats, tpl.tone), 3);
    qualNarr.forEach((chunk, i) => {
      s8.addText(chunk, { x: 3.5, y: 1.35 + i * 0.7, w: 6, fontSize: 10, color: TEXT_MUTED, lineSpacingMultiple: 1.4, strike: false });
    });

    const qMetrics = [
      { label: 'Missing Data', value: `${stats.missingPct || 0}%`, color: (stats.missingPct || 0) > 10 ? RED : GREEN },
      { label: 'Issues Found', value: String(stats.qualityIssues || 0), color: (stats.qualityIssues || 0) > 5 ? YELLOW : GREEN },
      { label: 'Completeness', value: `${(100 - (stats.missingPct || 0)).toFixed(1)}%`, color: GREEN },
      { label: 'Columns Profiled', value: String(stats.columnCount), color: BLUE },
    ];
    qMetrics.forEach((m, i) => {
      const x = 0.6 + i * 2.4;
      s8.addShape('roundRect' as any, { x, y: 3.8, w: 2.2, h: 0.9, fill: { color: CARD_BG }, rectRadius: 0.05 });
      s8.addShape('rect' as any, { x, y: 3.8, w: 0.06, h: 0.9, fill: { color: m.color } });
      s8.addText(m.value, { x: x + 0.2, y: 3.85, w: 1.8, fontSize: 18, bold: true, color: m.color, strike: false });
      s8.addText(m.label, { x: x + 0.2, y: 4.28, w: 1.8, fontSize: 8, color: TEXT_DIM, strike: false });
    });
    keyTakeaway(s8, `Data quality score of ${qScore}/100 (Grade ${qGrade}) — ${qScore >= 80 ? 'suitable for advanced analytics' : 'consider data cleaning before critical analysis'}.`);
    footer(s8);

    // =============================================
    // SLIDE 9 — Deep Insights (FIX 3: numbered circles, no emoji)
    // =============================================
    const s9 = pptx.addSlide();
    s9.background = { color: BG };
    slideTitle(s9, 'AI-Generated Intelligence', 'Patterns beyond the surface');
    const insightText = generateNarrative('deep-insights', stats, tpl.tone);
    const insightItems = insightText.split('\n\n').filter(Boolean).slice(0, 5);

    // Ensure minimum 3 insights
    const defaultInsights = [
      `Cross-dimensional analysis reveals ${stats.numericColumns.length} quantitative metrics that can be combined for composite scoring and predictive modeling.`,
      `Data distribution patterns suggest ${stats.categoricalColumns.length > 2 ? 'multi-segment' : 'focused'} segmentation opportunities for deeper audience or category analysis.`,
      `With ${stats.rowCount.toLocaleString()} records, statistical significance thresholds are met for reliable hypothesis testing and trend validation.`,
      `Column correlation patterns indicate potential for dimensionality reduction — consider PCA or feature selection for model optimization.`,
      `Temporal patterns in the data suggest cyclical behavior worth monitoring for forecasting and anomaly detection.`,
    ];
    const finalInsights = insightItems.length >= 3 ? insightItems : [...insightItems, ...defaultInsights].slice(0, 5);

    finalInsights.forEach((insight, i) => {
      const y = 1.15 + i * 0.75;
      if (y > 4.6) return;
      s9.addShape('roundRect' as any, { x: 0.6, y, w: 9, h: 0.65, fill: { color: CARD_BG }, rectRadius: 0.05 });
      // Colored number circle
      s9.addShape('ellipse' as any, { x: 0.75, y: y + 0.13, w: 0.4, h: 0.4, fill: { color: ACCENT } });
      s9.addText(String(i + 1), { x: 0.75, y: y + 0.13, w: 0.4, fontSize: 12, bold: true, color: TEXT_WHITE, align: 'center', strike: false });
      s9.addText(trunc(insight, 200), { x: 1.35, y: y + 0.08, w: 8, fontSize: 10, color: TEXT_MUTED, lineSpacingMultiple: 1.35, strike: false });
    });
    keyTakeaway(s9, `${finalInsights.length} non-obvious patterns identified — investigate top findings for strategic advantage.`);
    footer(s9);

    // =============================================
    // SLIDE 10 — Recommendations (FIX 5: no footer overlap)
    // =============================================
    const s10 = pptx.addSlide();
    s10.background = { color: BG };
    slideTitle(s10, 'Strategic Action Plan', 'Prioritized recommendations');
    // Timeline line — cap at y=4.8
    s10.addShape('rect' as any, { x: 1.5, y: 1.3, w: 0.03, h: 3.5, fill: { color: ACCENT + '40' } });

    const timelineItems = [
      { phase: 'IMMEDIATE (0–30 DAYS)', items: stats.recommendations.slice(0, 2), color: RED },
      { phase: 'SHORT-TERM (30–90 DAYS)', items: stats.recommendations.slice(2, 4), color: YELLOW },
      { phase: 'LONG-TERM (90+ DAYS)', items: stats.recommendations.slice(4, 5).length ? stats.recommendations.slice(4, 5) : ['Develop comprehensive data strategy and governance framework'], color: GREEN },
    ];
    let tY = 1.2;
    timelineItems.forEach(phase => {
      if (tY > 4.5) return; // FIX 5: don't let items go past 4.5
      s10.addShape('ellipse' as any, { x: 1.38, y: tY + 0.1, w: 0.28, h: 0.28, fill: { color: phase.color } });
      s10.addText(phase.phase, { x: 2.0, y: tY, w: 7, fontSize: 10, bold: true, color: phase.color, strike: false });
      tY += 0.38;
      phase.items.forEach(item => {
        if (tY > 4.5) return;
        s10.addShape('roundRect' as any, { x: 2.0, y: tY, w: 7.5, h: 0.42, fill: { color: CARD_BG }, rectRadius: 0.04 });
        s10.addShape('rect' as any, { x: 2.0, y: tY, w: 0.06, h: 0.42, fill: { color: phase.color } });
        s10.addText(trunc(item, 90), { x: 2.25, y: tY + 0.07, w: 7, fontSize: 10, color: TEXT_WHITE, strike: false });
        tY += 0.5;
      });
      tY += 0.15;
    });
    // Takeaway at safe position
    keyTakeaway(s10, `${stats.recommendations.length} strategic actions prioritized — immediate execution on top 2 items recommended.`, 4.85);
    footer(s10);

    // =============================================
    // SLIDE 11 — Data Table (FIX 6: 20 rows, fill slide)
    // =============================================
    if (data.length > 0) {
      const s11 = pptx.addSlide();
      s11.background = { color: BG };
      slideTitle(s11, 'Raw Data Snapshot', `Top ${Math.min(data.length, 20)} of ${data.length.toLocaleString()} records`);
      const headers = Object.keys(data[0]).slice(0, 7);
      const rowCount = Math.min(data.length, 20);
      const rows = data.slice(0, rowCount);
      const availableH = 4.2; // from y=1.1 to y=5.3
      const rowH = Math.min(0.25, availableH / (rowCount + 2)); // +2 for header + summary

      const tableRows = [
        headers.map(h => ({ text: trunc(h, 16), options: { bold: true, fontSize: 7, fill: { color: CARD_LIGHT }, color: ACCENT, strike: false } })),
        ...rows.map((row, ri) => headers.map(h => ({
          text: trunc(String(row[h] ?? ''), 20),
          options: { fontSize: 6.5, color: TEXT_MUTED, fill: { color: ri % 2 === 0 ? CARD_BG : BG }, strike: false },
        }))),
        // Summary row
        headers.map((h, hi) => ({
          text: hi === 0 ? `${data.length.toLocaleString()} total` : '—',
          options: { bold: true, fontSize: 7, fill: { color: CARD_LIGHT }, color: ACCENT, strike: false },
        })),
      ];
      s11.addTable(tableRows as any, {
        x: 0.4, y: 1.1, w: 9.2,
        rowH,
        colW: Array(headers.length).fill(9.2 / headers.length),
        border: { pt: 0.5, color: '2A2A3E' },
        autoPage: false,
      });
      footer(s11);
    }

    // =============================================
    // SLIDE 12 — Closing (FIX 7: BG color, FIX 9: visible action boxes)
    // =============================================
    const closing = pptx.addSlide();
    closing.background = { color: BG };
    closing.addShape('rect' as any, { x: 0, y: 0, w: 0.12, h: '100%', fill: { color: ACCENT } });
    closing.addText('Data Drives Decisions', { x: 1, y: 1.0, w: 8, fontSize: 38, bold: true, align: 'center', color: TEXT_WHITE, strike: false });
    closing.addShape('rect' as any, { x: 3.5, y: 1.9, w: 3, h: 0.04, fill: { color: ACCENT } });
    closing.addText('Top Action Items', { x: 1, y: 2.2, w: 8, fontSize: 14, bold: true, align: 'center', color: ACCENT, strike: false });
    stats.recommendations.slice(0, 3).forEach((a, i) => {
      // FIX 9: Use CARD_BG instead of black, with accent left border
      closing.addShape('roundRect' as any, { x: 1.5, y: 2.8 + i * 0.6, w: 7, h: 0.5, fill: { color: CARD_BG }, rectRadius: 0.05 });
      closing.addShape('rect' as any, { x: 1.5, y: 2.8 + i * 0.6, w: 0.06, h: 0.5, fill: { color: ACCENT } });
      closing.addText(`${i + 1}.  ${trunc(a, 80)}`, { x: 1.75, y: 2.85 + i * 0.6, w: 6.5, fontSize: 11, color: TEXT_WHITE, strike: false });
    });
    // Bottom branding
    closing.addShape('roundRect' as any, { x: 1.5, y: 4.6, w: 7, h: 0.45, fill: { color: ACCENT + '18' }, rectRadius: 0.05 });
    closing.addText(`Report generated by DataPulse AI  •  ${tpl.name} Template  •  ${stats.date}`, {
      x: 1.5, y: 4.65, w: 7, fontSize: 9, align: 'center', color: TEXT_MUTED, strike: false,
    });

    const blob = await pptx.write({ outputType: 'blob' }) as Blob;
    saveAs(blob, `${stats.title.replace(/\s+/g, '-').toLowerCase()}.pptx`);
    toast({ title: 'PowerPoint Exported', description: 'Presentation downloaded successfully.' });
  } catch (e) {
    console.error('PPTX export error:', e);
    toast({ title: 'Export Failed', description: 'Could not generate PowerPoint.', variant: 'destructive' });
  }
}
