// DataPulse — Rich PPTX Export with Visual Layouts
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

    // Dark theme colors for all content slides
    const BG = '0A0A0F';
    const CARD_BG = '1A1A2E';
    const CARD_LIGHT = '252540';
    const TEXT_WHITE = 'FFFFFF';
    const TEXT_MUTED = 'A0A0B8';
    const TEXT_DIM = '6B6B80';
    const ACCENT = tpl.colors[1].replace('#', '') || '0066FF';
    const PRI = tpl.colors[0].replace('#', '') || '0A1628';
    const GREEN = '00C851';
    const RED = 'FF4444';
    const YELLOW = 'FFBB33';
    const BLUE = '4488FF';

    const footer = (slide: any) => {
      slide.addText(`DataPulse Analytics  |  ${stats.datasetName}  |  ${stats.date}`, {
        x: 0.5, y: 5.25, w: 9, fontSize: 7, color: TEXT_DIM, align: 'center',
      });
    };

    const slideTitle = (slide: any, text: string, subtitle?: string) => {
      slide.addText(text, { x: 0.6, y: 0.25, w: 8.5, fontSize: 22, bold: true, color: TEXT_WHITE });
      if (subtitle) {
        slide.addText(subtitle, { x: 0.6, y: 0.65, w: 8.5, fontSize: 10, color: TEXT_MUTED });
      }
      // Accent bar under title
      slide.addShape('rect' as any, { x: 0.6, y: subtitle ? 0.95 : 0.65, w: 2, h: 0.04, fill: { color: ACCENT } });
    };

    // Sentence splitter: max ~2 sentences per block
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
    // SLIDE 1 — Cover (dark with template colors)
    // =============================================
    const cover = pptx.addSlide();
    cover.background = { color: PRI };
    // Decorative shapes
    cover.addShape('rect' as any, { x: 0, y: 0, w: 0.12, h: '100%', fill: { color: ACCENT } });
    cover.addShape('rect' as any, { x: 0, y: 3.2, w: '100%', h: 0.04, fill: { color: ACCENT } });
    cover.addText(stats.title, { x: 0.8, y: 1.0, w: 8, fontSize: 36, bold: true, color: TEXT_WHITE, lineSpacingMultiple: 1.2 });
    cover.addText('Data Intelligence Report', { x: 0.8, y: 2.1, w: 8, fontSize: 18, color: ACCENT, bold: true });
    cover.addText('Comprehensive Analysis & Strategic Insights', { x: 0.8, y: 2.6, w: 8, fontSize: 12, color: TEXT_MUTED });
    // Info cards at bottom
    const coverInfo = [
      { label: 'DATE', value: stats.date },
      { label: 'DATASET', value: stats.datasetName },
      { label: 'RECORDS', value: stats.rowCount.toLocaleString() },
      { label: 'DIMENSIONS', value: String(stats.columnCount) },
      { label: 'ANALYST', value: stats.userName },
    ];
    coverInfo.forEach((info, i) => {
      const x = 0.8 + i * 1.85;
      cover.addShape('roundRect' as any, { x, y: 3.6, w: 1.7, h: 1.0, fill: { color: ACCENT + '18' }, rectRadius: 0.05 });
      cover.addText(info.label, { x, y: 3.65, w: 1.7, fontSize: 7, color: ACCENT, align: 'center', bold: true });
      cover.addText(info.value, { x, y: 3.95, w: 1.7, fontSize: 12, color: TEXT_WHITE, align: 'center', bold: true });
    });
    cover.addText(`Template: ${tpl.name}`, { x: 0.8, y: 4.9, w: 8, fontSize: 8, color: TEXT_DIM });

    // =============================================
    // SLIDE 2 — Executive Summary (2 col + stat boxes)
    // =============================================
    const s2 = pptx.addSlide();
    s2.background = { color: BG };
    slideTitle(s2, 'Executive Summary', 'Key Findings at a Glance');
    const execChunks = splitNarrative(generateNarrative('executive-summary', stats, tpl.tone), 3);
    // Left column — narrative
    execChunks.forEach((chunk, i) => {
      s2.addText(chunk, { x: 0.6, y: 1.15 + i * 0.85, w: 5.2, fontSize: 10, color: TEXT_MUTED, lineSpacingMultiple: 1.45 });
    });
    // Right column — stat boxes
    const execStats = [
      { label: 'Total Records', value: stats.rowCount.toLocaleString(), color: BLUE },
      { label: 'Positive Signals', value: String(stats.positives.length), color: GREEN },
      { label: 'Risk Indicators', value: String(stats.negatives.length), color: RED },
      { label: 'Quality Score', value: stats.qualityScore !== undefined ? `${stats.qualityScore}/100` : 'N/A', color: ACCENT },
    ];
    execStats.forEach((st, i) => {
      const y = 1.15 + i * 0.9;
      s2.addShape('roundRect' as any, { x: 6.2, y, w: 3.4, h: 0.75, fill: { color: CARD_BG }, rectRadius: 0.06 });
      s2.addShape('rect' as any, { x: 6.2, y, w: 0.08, h: 0.75, fill: { color: st.color } });
      s2.addText(st.value, { x: 6.5, y: y + 0.05, w: 1.8, fontSize: 20, bold: true, color: st.color });
      s2.addText(st.label, { x: 6.5, y: y + 0.42, w: 2.8, fontSize: 9, color: TEXT_DIM });
    });
    // Bottom highlight bar
    s2.addShape('roundRect' as any, { x: 0.6, y: 4.6, w: 9, h: 0.5, fill: { color: CARD_BG }, rectRadius: 0.06 });
    s2.addText(`${stats.numericColumns.length} quantitative metrics  •  ${stats.categoricalColumns.length} categorical dimensions  •  ${stats.dateColumns.length} temporal fields`, {
      x: 0.8, y: 4.65, w: 8.6, fontSize: 10, color: TEXT_MUTED, align: 'center',
    });
    footer(s2);

    // =============================================
    // SLIDE 3 — Dataset Overview (icon grid)
    // =============================================
    const s3 = pptx.addSlide();
    s3.background = { color: BG };
    slideTitle(s3, 'Understanding Your Data Landscape', 'Dataset structure and composition');
    const overviewNarr = splitNarrative(generateNarrative('dataset-overview', stats, tpl.tone), 2);
    overviewNarr.forEach((chunk, i) => {
      s3.addText(chunk, { x: 0.6, y: 1.15 + i * 0.7, w: 9, fontSize: 10, color: TEXT_MUTED, lineSpacingMultiple: 1.4 });
    });
    // Grid cards
    const overviewCards = [
      { icon: '📊', label: 'Total Records', value: stats.rowCount.toLocaleString() },
      { icon: '📐', label: 'Dimensions', value: String(stats.columnCount) },
      { icon: '🔢', label: 'Numeric Columns', value: String(stats.numericColumns.length) },
      { icon: '🏷️', label: 'Categorical', value: String(stats.categoricalColumns.length) },
      { icon: '📅', label: 'Date Fields', value: String(stats.dateColumns.length) },
      { icon: '✅', label: 'Completeness', value: `${(100 - (stats.missingPct || 0)).toFixed(1)}%` },
    ];
    overviewCards.forEach((card, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 0.6 + col * 3.15;
      const y = 2.8 + row * 1.15;
      s3.addShape('roundRect' as any, { x, y, w: 2.95, h: 0.95, fill: { color: CARD_BG }, rectRadius: 0.06 });
      s3.addText(card.icon, { x: x + 0.15, y: y + 0.12, w: 0.5, fontSize: 18 });
      s3.addText(card.value, { x: x + 0.6, y: y + 0.08, w: 2, fontSize: 20, bold: true, color: TEXT_WHITE });
      s3.addText(card.label, { x: x + 0.6, y: y + 0.5, w: 2, fontSize: 9, color: TEXT_DIM });
    });
    footer(s3);

    // =============================================
    // SLIDE 4 — KPI Dashboard (color-coded cards)
    // =============================================
    const s4 = pptx.addSlide();
    s4.background = { color: BG };
    slideTitle(s4, 'Performance Metrics', 'Where you stand across key indicators');
    const kpiNarrative = generateNarrative('kpi-analysis', stats, tpl.tone);
    s4.addText(splitNarrative(kpiNarrative, 1)[0] || '', { x: 0.6, y: 1.15, w: 9, fontSize: 9, color: TEXT_DIM, lineSpacingMultiple: 1.3 });

    stats.kpis.slice(0, 6).forEach((kpi, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 0.5 + col * 3.2;
      const y = 1.75 + row * 1.55;
      // Determine color coding
      const matchingTrend = stats.trends.find(t => kpi.label.includes(t.col));
      const borderColor = matchingTrend ? (matchingTrend.change > 5 ? GREEN : matchingTrend.change < -5 ? RED : YELLOW) : BLUE;
      const arrow = matchingTrend ? (matchingTrend.change > 1 ? '↑' : matchingTrend.change < -1 ? '↓' : '→') : '';
      const arrowColor = matchingTrend ? (matchingTrend.change > 1 ? GREEN : matchingTrend.change < -1 ? RED : YELLOW) : TEXT_DIM;

      s4.addShape('roundRect' as any, { x, y, w: 3, h: 1.35, fill: { color: CARD_BG }, rectRadius: 0.06 });
      // Left color border
      s4.addShape('rect' as any, { x, y, w: 0.07, h: 1.35, fill: { color: borderColor } });
      s4.addText(kpi.value, { x: x + 0.25, y: y + 0.1, w: 2, fontSize: 24, bold: true, color: TEXT_WHITE });
      if (arrow) {
        s4.addText(arrow, { x: x + 2.3, y: y + 0.1, w: 0.5, fontSize: 22, bold: true, color: arrowColor, align: 'center' });
      }
      s4.addText(kpi.label, { x: x + 0.25, y: y + 0.7, w: 2.5, fontSize: 9, color: TEXT_DIM });
      if (matchingTrend) {
        s4.addText(`${matchingTrend.change > 0 ? '+' : ''}${matchingTrend.change}%`, { x: x + 0.25, y: y + 0.98, w: 1.5, fontSize: 8, color: arrowColor });
      }
    });
    footer(s4);

    // =============================================
    // SLIDE 5 — Trends (table rows with indicators)
    // =============================================
    const s5 = pptx.addSlide();
    s5.background = { color: BG };
    slideTitle(s5, 'Trend Patterns', 'Performance trajectory across key metrics');
    const trendNarr = splitNarrative(generateNarrative('trends', stats, tpl.tone), 1);
    s5.addText(trendNarr[0] || '', { x: 0.6, y: 1.15, w: 9, fontSize: 9, color: TEXT_DIM, lineSpacingMultiple: 1.3 });

    // Table header
    const thY = 1.7;
    s5.addShape('roundRect' as any, { x: 0.5, y: thY, w: 9.1, h: 0.4, fill: { color: CARD_LIGHT }, rectRadius: 0.04 });
    s5.addText('METRIC', { x: 0.7, y: thY + 0.05, w: 2.5, fontSize: 8, bold: true, color: ACCENT });
    s5.addText('DIRECTION', { x: 3.3, y: thY + 0.05, w: 1.5, fontSize: 8, bold: true, color: ACCENT });
    s5.addText('CHANGE', { x: 5.0, y: thY + 0.05, w: 1.2, fontSize: 8, bold: true, color: ACCENT });
    s5.addText('1ST HALF AVG', { x: 6.4, y: thY + 0.05, w: 1.5, fontSize: 8, bold: true, color: ACCENT });
    s5.addText('2ND HALF AVG', { x: 8.0, y: thY + 0.05, w: 1.5, fontSize: 8, bold: true, color: ACCENT });

    stats.trends.slice(0, 6).forEach((t, i) => {
      const rowY = 2.2 + i * 0.55;
      const rowBg = i % 2 === 0 ? CARD_BG : BG;
      const changeColor = t.change > 1 ? GREEN : t.change < -1 ? RED : YELLOW;
      const arrow = t.change > 1 ? '↑' : t.change < -1 ? '↓' : '→';

      s5.addShape('roundRect' as any, { x: 0.5, y: rowY, w: 9.1, h: 0.45, fill: { color: rowBg }, rectRadius: 0.03 });
      // Color indicator dot
      s5.addShape('ellipse' as any, { x: 0.6, y: rowY + 0.14, w: 0.15, h: 0.15, fill: { color: changeColor } });
      s5.addText(t.col, { x: 0.85, y: rowY + 0.05, w: 2.3, fontSize: 11, color: TEXT_WHITE });
      s5.addText(`${arrow} ${t.direction}`, { x: 3.3, y: rowY + 0.05, w: 1.5, fontSize: 11, color: changeColor });
      // Change badge
      s5.addShape('roundRect' as any, { x: 5.0, y: rowY + 0.05, w: 1.0, h: 0.32, fill: { color: changeColor + '25' }, rectRadius: 0.04 });
      s5.addText(`${t.change > 0 ? '+' : ''}${t.change}%`, { x: 5.0, y: rowY + 0.06, w: 1.0, fontSize: 10, bold: true, color: changeColor, align: 'center' });
      s5.addText(t.firstHalfAvg.toLocaleString(), { x: 6.4, y: rowY + 0.07, w: 1.5, fontSize: 10, color: TEXT_MUTED });
      s5.addText(t.secondHalfAvg.toLocaleString(), { x: 8.0, y: rowY + 0.07, w: 1.5, fontSize: 10, color: TEXT_MUTED });
    });
    footer(s5);

    // =============================================
    // SLIDE 6 — Positive Findings (green cards)
    // =============================================
    const s6 = pptx.addSlide();
    s6.background = { color: BG };
    slideTitle(s6, 'Strengths to Leverage', 'Positive signals and growth indicators');
    const posNarr = splitNarrative(generateNarrative('positives', stats, tpl.tone), 2);
    posNarr.forEach((chunk, i) => {
      s6.addText(chunk, { x: 0.6, y: 1.15 + i * 0.7, w: 9, fontSize: 10, color: TEXT_MUTED, lineSpacingMultiple: 1.4 });
    });
    const positiveItems = stats.positives.length ? stats.positives : ['All metrics remain stable — no significant declines detected'];
    positiveItems.slice(0, 5).forEach((p, i) => {
      const y = 2.7 + i * 0.55;
      s6.addShape('roundRect' as any, { x: 0.6, y, w: 9, h: 0.45, fill: { color: CARD_BG }, rectRadius: 0.05 });
      s6.addShape('rect' as any, { x: 0.6, y, w: 0.07, h: 0.45, fill: { color: GREEN } });
      s6.addText('✓', { x: 0.85, y: y + 0.05, w: 0.4, fontSize: 14, color: GREEN, bold: true });
      s6.addText(p, { x: 1.25, y: y + 0.07, w: 8, fontSize: 11, color: TEXT_WHITE });
    });
    // Summary box
    s6.addShape('roundRect' as any, { x: 0.6, y: 4.65, w: 9, h: 0.45, fill: { color: GREEN + '15' }, rectRadius: 0.05 });
    s6.addText(`${stats.positives.length} positive signal${stats.positives.length !== 1 ? 's' : ''} detected — strategic amplification recommended`, {
      x: 0.8, y: 4.7, w: 8.6, fontSize: 10, color: GREEN, align: 'center',
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
      s7.addText(chunk, { x: 0.6, y: 1.15 + i * 0.7, w: 9, fontSize: 10, color: TEXT_MUTED, lineSpacingMultiple: 1.4 });
    });
    stats.risks.slice(0, 5).forEach((r, i) => {
      const y = 2.7 + i * 0.55;
      const severity = r.toLowerCase().includes('no significant') ? 'LOW' : i === 0 ? 'HIGH' : 'MED';
      const sevColor = severity === 'HIGH' ? RED : severity === 'MED' ? YELLOW : GREEN;
      s7.addShape('roundRect' as any, { x: 0.6, y, w: 9, h: 0.45, fill: { color: CARD_BG }, rectRadius: 0.05 });
      s7.addShape('rect' as any, { x: 0.6, y, w: 0.07, h: 0.45, fill: { color: RED } });
      s7.addText('⚠', { x: 0.85, y: y + 0.04, w: 0.4, fontSize: 14, color: RED });
      s7.addText(r, { x: 1.25, y: y + 0.07, w: 7, fontSize: 11, color: TEXT_WHITE });
      // Severity badge
      s7.addShape('roundRect' as any, { x: 8.6, y: y + 0.07, w: 0.8, h: 0.28, fill: { color: sevColor + '30' }, rectRadius: 0.04 });
      s7.addText(severity, { x: 8.6, y: y + 0.07, w: 0.8, fontSize: 8, bold: true, color: sevColor, align: 'center' });
    });
    s7.addShape('roundRect' as any, { x: 0.6, y: 4.65, w: 9, h: 0.45, fill: { color: RED + '15' }, rectRadius: 0.05 });
    s7.addText(`${stats.negatives.length} risk factor${stats.negatives.length !== 1 ? 's' : ''} identified — structured remediation recommended`, {
      x: 0.8, y: 4.7, w: 8.6, fontSize: 10, color: RED, align: 'center',
    });
    footer(s7);

    // =============================================
    // SLIDE 8 — Data Quality (score + metrics grid)
    // =============================================
    const s8 = pptx.addSlide();
    s8.background = { color: BG };
    slideTitle(s8, 'Data Quality Report', 'Foundation of reliable insights');
    // Score circle area
    const qScore = stats.qualityScore ?? 0;
    const qGrade = qScore >= 90 ? 'A' : qScore >= 75 ? 'B' : qScore >= 60 ? 'C' : 'D';
    const qColor = qScore >= 80 ? GREEN : qScore >= 60 ? YELLOW : RED;
    s8.addShape('ellipse' as any, { x: 0.8, y: 1.3, w: 2.2, h: 2.2, fill: { color: CARD_BG }, line: { color: qColor, width: 3 } });
    s8.addText(stats.qualityScore !== undefined ? `${qScore}` : '—', { x: 0.8, y: 1.6, w: 2.2, fontSize: 40, bold: true, color: qColor, align: 'center' });
    s8.addText(stats.qualityScore !== undefined ? `Grade ${qGrade}` : 'Not scanned', { x: 0.8, y: 2.55, w: 2.2, fontSize: 11, color: TEXT_DIM, align: 'center' });
    // Quality narrative
    const qualNarr = splitNarrative(generateNarrative('quality', stats, tpl.tone), 2);
    qualNarr.forEach((chunk, i) => {
      s8.addText(chunk, { x: 3.5, y: 1.35 + i * 0.8, w: 6, fontSize: 10, color: TEXT_MUTED, lineSpacingMultiple: 1.4 });
    });
    // Metrics grid at bottom
    const qMetrics = [
      { label: 'Missing Data', value: `${stats.missingPct || 0}%`, color: (stats.missingPct || 0) > 10 ? RED : GREEN },
      { label: 'Issues Found', value: String(stats.qualityIssues || 0), color: (stats.qualityIssues || 0) > 5 ? YELLOW : GREEN },
      { label: 'Completeness', value: `${(100 - (stats.missingPct || 0)).toFixed(1)}%`, color: GREEN },
      { label: 'Columns Profiled', value: String(stats.columnCount), color: BLUE },
    ];
    qMetrics.forEach((m, i) => {
      const x = 0.6 + i * 2.4;
      s8.addShape('roundRect' as any, { x, y: 3.9, w: 2.2, h: 0.9, fill: { color: CARD_BG }, rectRadius: 0.05 });
      s8.addShape('rect' as any, { x, y: 3.9, w: 0.06, h: 0.9, fill: { color: m.color } });
      s8.addText(m.value, { x: x + 0.2, y: 3.95, w: 1.8, fontSize: 18, bold: true, color: m.color });
      s8.addText(m.label, { x: x + 0.2, y: 4.38, w: 1.8, fontSize: 8, color: TEXT_DIM });
    });
    footer(s8);

    // =============================================
    // SLIDE 9 — Deep Insights (numbered cards)
    // =============================================
    const s9 = pptx.addSlide();
    s9.background = { color: BG };
    slideTitle(s9, 'AI-Generated Intelligence', 'Patterns beyond the surface');
    const insightText = generateNarrative('deep-insights', stats, tpl.tone);
    const insightItems = insightText.split('\n\n').filter(Boolean).slice(0, 5);
    insightItems.forEach((insight, i) => {
      const y = 1.15 + i * 0.8;
      if (y > 4.6) return;
      s9.addShape('roundRect' as any, { x: 0.6, y, w: 9, h: 0.7, fill: { color: CARD_BG }, rectRadius: 0.05 });
      // Number badge
      s9.addShape('ellipse' as any, { x: 0.75, y: y + 0.15, w: 0.4, h: 0.4, fill: { color: ACCENT } });
      s9.addText(String(i + 1), { x: 0.75, y: y + 0.15, w: 0.4, fontSize: 12, bold: true, color: TEXT_WHITE, align: 'center' });
      s9.addText(insight.substring(0, 200) + (insight.length > 200 ? '...' : ''), { x: 1.35, y: y + 0.08, w: 8, fontSize: 10, color: TEXT_MUTED, lineSpacingMultiple: 1.35 });
    });
    footer(s9);

    // =============================================
    // SLIDE 10 — Recommendations (timeline layout)
    // =============================================
    const s10 = pptx.addSlide();
    s10.background = { color: BG };
    slideTitle(s10, 'Strategic Action Plan', 'Prioritized recommendations');
    // Timeline line
    s10.addShape('rect' as any, { x: 1.5, y: 1.3, w: 0.03, h: 3.5, fill: { color: ACCENT + '40' } });

    const timelineItems = [
      { phase: 'IMMEDIATE (0–30 DAYS)', items: stats.recommendations.slice(0, 2), color: RED },
      { phase: 'SHORT-TERM (30–90 DAYS)', items: stats.recommendations.slice(2, 4), color: YELLOW },
      { phase: 'LONG-TERM (90+ DAYS)', items: stats.recommendations.slice(4, 5).length ? stats.recommendations.slice(4, 5) : ['Develop comprehensive data strategy'], color: GREEN },
    ];
    let tY = 1.2;
    timelineItems.forEach(phase => {
      // Timeline dot
      s10.addShape('ellipse' as any, { x: 1.38, y: tY + 0.1, w: 0.28, h: 0.28, fill: { color: phase.color } });
      s10.addText(phase.phase, { x: 2.0, y: tY, w: 7, fontSize: 10, bold: true, color: phase.color });
      tY += 0.4;
      phase.items.forEach(item => {
        s10.addShape('roundRect' as any, { x: 2.0, y: tY, w: 7.5, h: 0.45, fill: { color: CARD_BG }, rectRadius: 0.04 });
        s10.addShape('rect' as any, { x: 2.0, y: tY, w: 0.06, h: 0.45, fill: { color: phase.color } });
        s10.addText(item, { x: 2.25, y: tY + 0.07, w: 7, fontSize: 10, color: TEXT_WHITE });
        tY += 0.55;
      });
      tY += 0.2;
    });
    footer(s10);

    // =============================================
    // SLIDE 11 — Data Table
    // =============================================
    if (data.length > 0) {
      const s11 = pptx.addSlide();
      s11.background = { color: BG };
      slideTitle(s11, 'Raw Data Snapshot', 'Top 12 records');
      const headers = Object.keys(data[0]).slice(0, 7);
      const rows = data.slice(0, 12);
      const tableRows = [
        headers.map(h => ({ text: h.substring(0, 14), options: { bold: true, fontSize: 8, fill: { color: CARD_LIGHT }, color: ACCENT } })),
        ...rows.map((row, ri) => headers.map(h => ({
          text: String(row[h] ?? '').substring(0, 18),
          options: { fontSize: 7, color: TEXT_MUTED, fill: { color: ri % 2 === 0 ? CARD_BG : BG } },
        }))),
      ];
      s11.addTable(tableRows as any, {
        x: 0.4, y: 1.0, w: 9.2,
        colW: Array(headers.length).fill(9.2 / headers.length),
        border: { pt: 0.5, color: '2A2A3E' },
        autoPage: false,
      });
      footer(s11);
    }

    // =============================================
    // SLIDE 12 — Closing
    // =============================================
    const closing = pptx.addSlide();
    closing.background = { color: PRI };
    closing.addShape('rect' as any, { x: 0, y: 0, w: 0.12, h: '100%', fill: { color: ACCENT } });
    closing.addText('Data Drives Decisions', { x: 1, y: 1.2, w: 8, fontSize: 38, bold: true, align: 'center', color: TEXT_WHITE });
    closing.addShape('rect' as any, { x: 3.5, y: 2.1, w: 3, h: 0.04, fill: { color: ACCENT } });
    closing.addText('Top Action Items', { x: 1, y: 2.5, w: 8, fontSize: 14, bold: true, align: 'center', color: ACCENT });
    stats.recommendations.slice(0, 3).forEach((a, i) => {
      closing.addShape('roundRect' as any, { x: 1.5, y: 3.0 + i * 0.55, w: 7, h: 0.45, fill: { color: ACCENT + '15' }, rectRadius: 0.05 });
      closing.addText(`${i + 1}.  ${a}`, { x: 1.7, y: 3.05 + i * 0.55, w: 6.5, fontSize: 11, color: TEXT_WHITE });
    });
    closing.addText(`Report generated by DataPulse AI  •  ${tpl.name} Template  •  ${stats.date}`, { x: 1, y: 4.8, w: 8, fontSize: 9, align: 'center', color: TEXT_DIM });

    const blob = await pptx.write({ outputType: 'blob' }) as Blob;
    saveAs(blob, `${stats.title.replace(/\s+/g, '-').toLowerCase()}.pptx`);
    toast({ title: 'PowerPoint Exported', description: 'Presentation downloaded successfully.' });
  } catch (e) {
    console.error('PPTX export error:', e);
    toast({ title: 'Export Failed', description: 'Could not generate PowerPoint.', variant: 'destructive' });
  }
}
