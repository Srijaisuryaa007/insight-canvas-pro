// DataPulse — Rich PPTX Export (v4 — white content slides, watermark, unique layouts)
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

    // Template colors for cover/closing only
    const COVER_BG = tpl.colors[0].replace('#', '') || '0A1628';
    const COVER_ACCENT = tpl.colors[1].replace('#', '') || 'C9A227';

    // Content slide colors — always white
    const WHITE = 'FFFFFF';
    const TEXT_DARK = '1A1A1A';
    const TEXT_BODY = '374151';
    const TEXT_MUTED = '6B7280';
    const TEXT_LIGHT = '9CA3AF';
    const BORDER_LIGHT = 'E5E7EB';
    const ROW_ALT = 'F9FAFB';

    // Accent colors per slide
    const ACCENTS = {
      exec: '2563EB',
      dataset: '7C3AED',
      kpi: '0891B2',
      trendUp: '16A34A',
      trendDown: 'DC2626',
      strengths: '16A34A',
      issues: 'DC2626',
      quality: 'D97706',
      insights: '7C3AED',
      recs: '0891B2',
      table: '374151',
    };

    const GREEN = '16A34A';
    const RED = 'DC2626';
    const YELLOW = 'D97706';
    const BLUE = '2563EB';

    const trunc = (s: string, max: number) => s.length > max ? s.substring(0, max) + '…' : s;

    // Watermark on every slide
    const addWatermark = (slide: any) => {
      slide.addText('DataVora', {
        x: 2.0, y: 1.8, w: 6, h: 2,
        fontSize: 54, bold: true, color: 'E8E8E8',
        rotate: 315, transparency: 85,
        align: 'center', valign: 'middle',
      });
    };

    // Footer for content slides
    const addFooter = (slide: any, pageNum: number, totalPages: number) => {
      // Thin separator
      slide.addShape('rect' as any, { x: 0.4, y: 5.40, w: 9.2, h: 0.008, fill: { color: BORDER_LIGHT } });
      slide.addText(`DataVora  |  ${trunc(stats.datasetName, 30)}`, {
        x: 0.4, y: 5.45, w: 5, fontSize: 8, color: TEXT_LIGHT,
      });
      slide.addText(`${stats.date}  |  Page ${pageNum} of ${totalPages}`, {
        x: 5.5, y: 5.45, w: 4.1, fontSize: 8, color: TEXT_LIGHT, align: 'right',
      });
    };

    // Section tag pill
    const addSectionTag = (slide: any, label: string, color: string, x = 0.4, y = 0.60) => {
      const pillW = Math.max(1.2, label.length * 0.085 + 0.3);
      slide.addShape('roundRect' as any, { x, y, w: pillW, h: 0.28, fill: { color }, rectRadius: 0.14 });
      slide.addText(label, { x: x + 0.05, y: y + 0.02, w: pillW - 0.1, fontSize: 9, bold: true, color: WHITE, align: 'center' });
    };

    // Content slide title (no underlines, no decorative lines)
    const contentTitle = (slide: any, titleText: string, tagLabel: string, tagColor: string, subtitle?: string) => {
      slide.addText(titleText, { x: 0.4, y: 0.15, w: 8.5, fontSize: 28, bold: true, color: '111827' });
      addSectionTag(slide, tagLabel, tagColor);
      if (subtitle) {
        slide.addText(subtitle, { x: 0.4, y: 0.92, w: 8.5, fontSize: 12, color: TEXT_MUTED });
      }
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

    const totalSlides = 12;

    // =============================================
    // SLIDE 1 — Cover (template color background)
    // =============================================
    const cover = pptx.addSlide();
    cover.background = { color: COVER_BG };
    cover.addShape('rect' as any, { x: 0, y: 0, w: 0.12, h: '100%', fill: { color: COVER_ACCENT } });
    cover.addText(stats.title, { x: 0.8, y: 1.0, w: 8, fontSize: 36, bold: true, color: WHITE, lineSpacingMultiple: 1.2 });
    cover.addText('Data Intelligence Report', { x: 0.8, y: 2.1, w: 8, fontSize: 18, color: COVER_ACCENT, bold: true });
    cover.addText('Comprehensive Analysis & Strategic Insights', { x: 0.8, y: 2.6, w: 8, fontSize: 12, color: TEXT_LIGHT });

    // Auto-size dataset name to fit
    const coverInfo = [
      { label: 'DATE', value: stats.date },
      { label: 'DATASET', value: trunc(stats.datasetName, 18) },
      { label: 'RECORDS', value: stats.rowCount.toLocaleString() },
      { label: 'DIMENSIONS', value: String(stats.columnCount) },
      { label: 'ANALYST', value: trunc(stats.userName, 18) },
    ];
    coverInfo.forEach((info, i) => {
      const x = 0.8 + i * 1.85;
      const cardBg = COVER_BG === '000000' ? '1A1A2E' : '00000040';
      cover.addShape('roundRect' as any, { x, y: 3.6, w: 1.7, h: 1.0, fill: { color: '1A1A2E' }, rectRadius: 0.05 });
      cover.addText(info.label, { x, y: 3.65, w: 1.7, fontSize: 7, color: COVER_ACCENT, align: 'center', bold: true });
      // Auto-reduce font for long values
      const valLen = info.value.length;
      const valFontSize = valLen > 16 ? 9 : valLen > 12 ? 11 : 14;
      cover.addText(info.value, { x, y: 3.92, w: 1.7, fontSize: valFontSize, color: WHITE, align: 'center', bold: true });
    });
    cover.addText(`Template: ${tpl.name}`, { x: 0.8, y: 4.9, w: 8, fontSize: 8, color: TEXT_LIGHT });
    addWatermark(cover);

    // =============================================
    // SLIDE 2 — Executive Summary (blue accent, 2-column)
    // =============================================
    const s2 = pptx.addSlide();
    s2.background = { color: WHITE };
    contentTitle(s2, 'Executive Summary', 'EXECUTIVE SUMMARY', ACCENTS.exec, 'Key findings at a glance');

    const execChunks = splitNarrative(generateNarrative('executive-summary', stats, tpl.tone), 3);
    execChunks.forEach((chunk, i) => {
      s2.addText(chunk, { x: 0.4, y: 1.15 + i * 0.7, w: 5.4, fontSize: 10, color: TEXT_BODY, lineSpacingMultiple: 1.5 });
    });

    const execStats = [
      { label: 'Total Records', value: stats.rowCount.toLocaleString(), color: BLUE },
      { label: 'Positive Signals', value: String(stats.positives.length), color: GREEN },
      { label: 'Risk Indicators', value: String(stats.negatives.length), color: RED },
      { label: 'Quality Score', value: stats.qualityScore !== undefined ? `${stats.qualityScore}/100` : 'N/A', color: ACCENTS.exec },
    ];
    execStats.forEach((st, i) => {
      const y = 1.15 + i * 0.88;
      s2.addShape('roundRect' as any, { x: 6.2, y, w: 3.4, h: 0.75, fill: { color: WHITE }, line: { color: BORDER_LIGHT, width: 1 }, rectRadius: 0.06 });
      s2.addShape('rect' as any, { x: 6.2, y, w: 0.07, h: 0.75, fill: { color: st.color } });
      s2.addText(st.value, { x: 6.45, y: y + 0.06, w: 1.8, fontSize: 22, bold: true, color: st.color });
      s2.addText(st.label, { x: 6.45, y: y + 0.44, w: 2.8, fontSize: 9, color: TEXT_MUTED });
    });

    // Bottom summary bar
    s2.addShape('roundRect' as any, { x: 0.4, y: 4.85, w: 9.2, h: 0.45, fill: { color: ACCENTS.exec + '12' }, rectRadius: 0.06 });
    s2.addShape('rect' as any, { x: 0.4, y: 4.85, w: 0.07, h: 0.45, fill: { color: ACCENTS.exec } });
    s2.addText(`${stats.numericColumns.length} quantitative metrics  •  ${stats.categoricalColumns.length} categorical dimensions  •  ${stats.dateColumns.length} temporal fields`, {
      x: 0.65, y: 4.92, w: 8.7, fontSize: 10, color: ACCENTS.exec,
    });
    addWatermark(s2);
    addFooter(s2, 2, totalSlides);

    // =============================================
    // SLIDE 3 — Dataset Overview (purple accent, icon grid)
    // =============================================
    const s3 = pptx.addSlide();
    s3.background = { color: WHITE };
    contentTitle(s3, 'Understanding Your Data', 'DATASET OVERVIEW', ACCENTS.dataset, 'Dataset structure and composition');

    const overviewNarr = splitNarrative(generateNarrative('dataset-overview', stats, tpl.tone), 2);
    overviewNarr.forEach((chunk, i) => {
      s3.addText(chunk, { x: 0.4, y: 1.15 + i * 0.55, w: 9.2, fontSize: 10, color: TEXT_BODY, lineSpacingMultiple: 1.4 });
    });

    const overviewCards = [
      { letter: 'R', color: ACCENTS.dataset, label: 'Total Records', value: stats.rowCount.toLocaleString() },
      { letter: 'D', color: BLUE, label: 'Dimensions', value: String(stats.columnCount) },
      { letter: 'N', color: GREEN, label: 'Numeric Columns', value: String(stats.numericColumns.length) },
      { letter: 'C', color: YELLOW, label: 'Categorical', value: String(stats.categoricalColumns.length) },
      { letter: 'T', color: RED, label: 'Date Fields', value: String(stats.dateColumns.length) },
      { letter: '%', color: GREEN, label: 'Completeness', value: `${(100 - (stats.missingPct || 0)).toFixed(1)}%` },
    ];
    overviewCards.forEach((card, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 0.4 + col * 3.15;
      const y = 2.4 + row * 1.35;
      s3.addShape('roundRect' as any, { x, y, w: 2.95, h: 1.15, fill: { color: WHITE }, line: { color: BORDER_LIGHT, width: 1 }, rectRadius: 0.06 });
      s3.addShape('ellipse' as any, { x: x + 0.15, y: y + 0.25, w: 0.5, h: 0.5, fill: { color: card.color } });
      s3.addText(card.letter, { x: x + 0.15, y: y + 0.25, w: 0.5, fontSize: 14, bold: true, color: WHITE, align: 'center' });
      s3.addText(card.value, { x: x + 0.8, y: y + 0.15, w: 1.9, fontSize: 22, bold: true, color: card.color });
      s3.addText(card.label, { x: x + 0.8, y: y + 0.6, w: 1.9, fontSize: 9, color: TEXT_MUTED });
    });

    // Bottom takeaway
    s3.addShape('roundRect' as any, { x: 0.4, y: 5.1, w: 9.2, h: 0.25, fill: { color: ACCENTS.dataset + '12' }, rectRadius: 0.04 });
    s3.addText(`${stats.columnCount} dimensions across ${stats.rowCount.toLocaleString()} records provide a robust analytical foundation.`, {
      x: 0.6, y: 5.12, w: 8.8, fontSize: 9, color: ACCENTS.dataset,
    });
    addWatermark(s3);
    addFooter(s3, 3, totalSlides);

    // =============================================
    // SLIDE 4 — KPI Performance (teal accent, 3x2 grid)
    // =============================================
    const s4 = pptx.addSlide();
    s4.background = { color: WHITE };
    contentTitle(s4, 'Performance Metrics', 'KPI PERFORMANCE', ACCENTS.kpi, 'Where you stand across key indicators');

    stats.kpis.slice(0, 6).forEach((kpi, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 0.4 + col * 3.15;
      const y = 1.2 + row * 1.85;
      const matchingTrend = stats.trends.find(t => kpi.label.includes(t.col));
      const borderColor = matchingTrend ? (matchingTrend.change > 5 ? GREEN : matchingTrend.change < -5 ? RED : YELLOW) : ACCENTS.kpi;
      const arrow = matchingTrend ? (matchingTrend.change > 1 ? '↑' : matchingTrend.change < -1 ? '↓' : '→') : '';
      const arrowColor = matchingTrend ? (matchingTrend.change > 1 ? GREEN : matchingTrend.change < -1 ? RED : YELLOW) : TEXT_MUTED;

      s4.addShape('roundRect' as any, { x, y, w: 2.95, h: 1.65, fill: { color: WHITE }, line: { color: BORDER_LIGHT, width: 1 }, rectRadius: 0.06 });
      // Top accent border
      s4.addShape('rect' as any, { x, y, w: 2.95, h: 0.05, fill: { color: borderColor } });
      s4.addText(kpi.value, { x: x + 0.2, y: y + 0.2, w: 2, fontSize: 26, bold: true, color: borderColor });
      if (arrow) {
        s4.addText(arrow, { x: x + 2.2, y: y + 0.2, w: 0.5, fontSize: 22, bold: true, color: arrowColor, align: 'center' });
      }
      s4.addText(trunc(kpi.label, 28), { x: x + 0.2, y: y + 0.8, w: 2.5, fontSize: 10, color: TEXT_BODY });
      if (matchingTrend) {
        s4.addText(`${matchingTrend.change > 0 ? '+' : ''}${matchingTrend.change}%`, { x: x + 0.2, y: y + 1.15, w: 1.5, fontSize: 10, color: arrowColor, bold: true });
      }
    });

    // Bottom takeaway
    s4.addShape('roundRect' as any, { x: 0.4, y: 4.95, w: 9.2, h: 0.35, fill: { color: ACCENTS.kpi + '12' }, rectRadius: 0.04 });
    s4.addShape('rect' as any, { x: 0.4, y: 4.95, w: 0.06, h: 0.35, fill: { color: ACCENTS.kpi } });
    s4.addText(stats.kpis.length > 0
      ? `${stats.kpis[0].label} at ${stats.kpis[0].value} is the leading indicator across all metrics.`
      : 'Review all KPIs to identify performance gaps and opportunities.', {
      x: 0.65, y: 4.99, w: 8.7, fontSize: 9, color: ACCENTS.kpi,
    });
    addWatermark(s4);
    addFooter(s4, 4, totalSlides);

    // =============================================
    // SLIDE 5 — Trend Analysis (dynamic accent, table rows)
    // =============================================
    const s5 = pptx.addSlide();
    s5.background = { color: WHITE };
    const upTrends = stats.trends.filter(t => t.change > 0).length;
    const downTrends = stats.trends.filter(t => t.change < 0).length;
    const trendAccent = upTrends >= downTrends ? ACCENTS.trendUp : ACCENTS.trendDown;
    contentTitle(s5, 'Trend Analysis', 'TRENDS', trendAccent, 'Performance trajectory across key metrics');

    // Table header
    const thY = 1.15;
    s5.addShape('roundRect' as any, { x: 0.4, y: thY, w: 9.2, h: 0.38, fill: { color: ACCENTS.table }, rectRadius: 0.04 });
    s5.addText('METRIC', { x: 0.6, y: thY + 0.05, w: 2.5, fontSize: 8, bold: true, color: WHITE });
    s5.addText('DIRECTION', { x: 3.2, y: thY + 0.05, w: 1.5, fontSize: 8, bold: true, color: WHITE });
    s5.addText('CHANGE', { x: 4.9, y: thY + 0.05, w: 1.2, fontSize: 8, bold: true, color: WHITE });
    s5.addText('1ST HALF AVG', { x: 6.3, y: thY + 0.05, w: 1.5, fontSize: 8, bold: true, color: WHITE });
    s5.addText('2ND HALF AVG', { x: 7.9, y: thY + 0.05, w: 1.5, fontSize: 8, bold: true, color: WHITE });

    const trendRows = stats.trends.slice(0, 8);
    const trendAvailH = 3.7; // from 1.6 to 5.3
    const trendRowH = Math.min(0.48, trendAvailH / Math.max(trendRows.length, 1));

    trendRows.forEach((t, i) => {
      const rowY = 1.58 + i * trendRowH;
      const rowBg = i % 2 === 0 ? WHITE : ROW_ALT;
      const changeColor = t.change > 1 ? GREEN : t.change < -1 ? RED : YELLOW;
      const arrow = t.change > 1 ? '↑' : t.change < -1 ? '↓' : '→';

      s5.addShape('rect' as any, { x: 0.4, y: rowY, w: 9.2, h: trendRowH - 0.02, fill: { color: rowBg } });
      s5.addShape('rect' as any, { x: 0.4, y: rowY, w: 0.06, h: trendRowH - 0.02, fill: { color: changeColor } });
      s5.addText(trunc(t.col, 22), { x: 0.6, y: rowY + 0.06, w: 2.5, fontSize: 11, color: TEXT_DARK });
      s5.addText(`${arrow} ${t.direction}`, { x: 3.2, y: rowY + 0.06, w: 1.5, fontSize: 11, color: changeColor, bold: true });
      // Change badge
      s5.addShape('roundRect' as any, { x: 4.9, y: rowY + 0.05, w: 1.0, h: 0.28, fill: { color: changeColor + '18' }, rectRadius: 0.14 });
      s5.addText(`${t.change > 0 ? '+' : ''}${t.change}%`, { x: 4.9, y: rowY + 0.06, w: 1.0, fontSize: 10, bold: true, color: changeColor, align: 'center' });
      s5.addText(t.firstHalfAvg.toLocaleString(), { x: 6.3, y: rowY + 0.06, w: 1.5, fontSize: 10, color: TEXT_BODY });
      s5.addText(t.secondHalfAvg.toLocaleString(), { x: 7.9, y: rowY + 0.06, w: 1.5, fontSize: 10, color: TEXT_BODY });
    });

    const trendEndY = 1.58 + trendRows.length * trendRowH;
    s5.addShape('roundRect' as any, { x: 0.4, y: Math.max(trendEndY + 0.1, 5.05), w: 9.2, h: 0.3, fill: { color: trendAccent + '12' }, rectRadius: 0.04 });
    s5.addShape('rect' as any, { x: 0.4, y: Math.max(trendEndY + 0.1, 5.05), w: 0.06, h: 0.3, fill: { color: trendAccent } });
    s5.addText(`${upTrends} metrics trending up, ${downTrends} declining — prioritize declining indicators.`, {
      x: 0.65, y: Math.max(trendEndY + 0.13, 5.08), w: 8.7, fontSize: 9, color: trendAccent,
    });
    addWatermark(s5);
    addFooter(s5, 5, totalSlides);

    // =============================================
    // SLIDE 6 — Strengths (green accent, vertical cards)
    // =============================================
    const s6 = pptx.addSlide();
    s6.background = { color: WHITE };
    contentTitle(s6, 'Strengths to Leverage', 'STRENGTHS', ACCENTS.strengths, `Data-backed positive signals from ${trunc(stats.datasetName, 40)}`);

    // Dynamic strength analysis
    const analyzeStrengths = () => {
      const rows = stats.rowCount;
      const cols = stats.columnCount;
      const totalCells = rows * cols;
      const numericCount = stats.numericColumns.length;
      const catCount = stats.categoricalColumns.length;
      const missingPct = stats.missingPct || 0;
      const completeness = (100 - missingPct).toFixed(1);
      const qScore = stats.qualityScore ?? 0;
      const healthScore = qScore > 0 ? qScore : Math.max(0, Math.round(100 - Math.min(25, missingPct * 2)));
      const grade = healthScore >= 90 ? 'A' : healthScore >= 75 ? 'B' : healthScore >= 60 ? 'C' : 'D';

      const points: { title: string; evidence: string; value: string }[] = [];

      if (healthScore >= 70) {
        points.push({
          title: `Data Quality Verified — ${healthScore}/100 Health Score`,
          evidence: `Grade ${grade} quality confirmed across all ${rows.toLocaleString()} records.`,
          value: healthScore >= 90 ? 'Fully reliable for board-level strategic decisions.' : 'Sufficient quality for operational analysis.',
        });
      }

      if (parseFloat(completeness) >= 85) {
        const populated = totalCells - Math.round(missingPct / 100 * totalCells);
        points.push({
          title: `${completeness}% Data Completeness — ${populated.toLocaleString()} of ${totalCells.toLocaleString()} Cells`,
          evidence: `Only ${Math.round(missingPct / 100 * totalCells).toLocaleString()} missing values across ${rows.toLocaleString()} records × ${cols} columns.`,
          value: parseFloat(completeness) === 100 ? 'Zero imputation required — analysis reflects pure ground truth.' : 'Minimal gaps — analysis confidence remains high.',
        });
      }

      const sizeLabel = rows >= 10000 ? 'Large-Scale Dataset' : rows >= 1000 ? 'Mid-Scale Dataset' : rows >= 100 ? 'Focused Dataset' : 'Curated Dataset';
      points.push({
        title: `${sizeLabel} — ${rows.toLocaleString()} Records Available`,
        evidence: `${rows.toLocaleString()} rows × ${cols} dimensions = ${totalCells.toLocaleString()} total data points analyzed.`,
        value: rows >= 1000 ? 'Statistically significant sample for reliable trend analysis.' : 'Focused dataset enables precise, targeted insights.',
      });

      if (numericCount >= 3) {
        const numNames = stats.numericColumns.slice(0, 3).join(', ');
        points.push({
          title: `Quantitative Depth — ${numericCount} Measurable Metrics`,
          evidence: `Key numeric dimensions: ${numNames} and ${numericCount - 3} more enable statistical modeling.`,
          value: 'Supports KPI tracking, trend analysis, and predictive modeling.',
        });
      }

      if (cols >= 5) {
        points.push({
          title: `Multi-Dimensional Coverage — ${cols} Variables Captured`,
          evidence: `Dataset spans ${numericCount} numeric and ${catCount} categorical dimensions.`,
          value: 'Enables segmentation, correlation, and cross-variable analysis.',
        });
      }

      if (catCount >= 1) {
        const catNames = stats.categoricalColumns.slice(0, 2).join(', ');
        points.push({
          title: `Segmentation Ready — ${catCount} Category ${catCount === 1 ? 'Dimension' : 'Dimensions'}`,
          evidence: `Categorical fields (${catNames}) enable group-level analysis.`,
          value: 'Supports cohort comparison, segment benchmarking, and drill-down analysis.',
        });
      }

      points.push({
        title: `Analysis Ready — No Preparation Required`,
        evidence: `Dataset passed automated quality checks with ${healthScore}/100 score.`,
        value: 'Immediate deployment to dashboards, reports, and models — no delays.',
      });

      return { points: points.slice(0, 5), healthScore };
    };

    const { points: strengthPoints, healthScore: sHealthScore } = analyzeStrengths();

    const sCardCount = strengthPoints.length;
    const sTotalH = 3.95; // y=1.05 to y=5.0
    const sGap = sCardCount <= 4 ? 0.08 : 0.06;
    const sCardH = (sTotalH - sGap * (sCardCount - 1)) / sCardCount;

    strengthPoints.forEach((pt, i) => {
      const y = 1.05 + i * (sCardH + sGap);
      s6.addShape('roundRect' as any, { x: 0.4, y, w: 9.2, h: sCardH, fill: { color: WHITE }, line: { color: BORDER_LIGHT, width: 1 }, rectRadius: 0.06 });
      s6.addShape('rect' as any, { x: 0.4, y, w: 0.07, h: sCardH, fill: { color: GREEN } });
      // Green circle with checkmark
      s6.addShape('ellipse' as any, { x: 0.65, y: y + (sCardH - 0.34) / 2, w: 0.34, h: 0.34, fill: { color: GREEN } });
      s6.addText('✓', { x: 0.65, y: y + (sCardH - 0.34) / 2, w: 0.34, fontSize: 14, bold: true, color: WHITE, align: 'center' });
      s6.addText(pt.title, { x: 1.15, y: y + 0.08, w: 8.2, fontSize: 13, bold: true, color: TEXT_DARK });
      s6.addText(pt.evidence, { x: 1.15, y: y + 0.35, w: 8.2, fontSize: 10, color: TEXT_MUTED });
      if (sCardH > 0.65) {
        s6.addText(pt.value, { x: 1.15, y: y + 0.58, w: 8.2, fontSize: 9, color: TEXT_LIGHT, italic: true });
      }
    });

    // Bottom summary bar
    const sBarColor = sHealthScore >= 90 ? GREEN : sHealthScore >= 75 ? YELLOW : sHealthScore >= 60 ? 'FF9900' : 'FF6600';
    const sBarText = sHealthScore >= 90
      ? `${sCardCount} elite-grade strengths confirmed — dataset approved for C-suite presentation`
      : sHealthScore >= 75 ? `${sCardCount} verified strengths — dataset ready for strategic analysis`
      : sHealthScore >= 60 ? `${sCardCount} positive indicators — suitable for operational analysis`
      : `${sCardCount} baseline strengths present — quality improvements recommended`;

    s6.addShape('roundRect' as any, { x: 0.4, y: 5.05, w: 9.2, h: 0.3, fill: { color: sBarColor + '12' }, rectRadius: 0.04 });
    s6.addShape('rect' as any, { x: 0.4, y: 5.05, w: 0.06, h: 0.3, fill: { color: sBarColor } });
    s6.addText(sBarText, { x: 0.65, y: 5.08, w: 8.7, fontSize: 9, bold: true, color: sBarColor });
    addWatermark(s6);
    addFooter(s6, 6, totalSlides);

    // =============================================
    // SLIDE 7 — Critical Issues (red accent, card list)
    // =============================================
    const s7 = pptx.addSlide();
    s7.background = { color: WHITE };
    contentTitle(s7, 'Critical Issues', 'CRITICAL ISSUES', ACCENTS.issues, 'Areas demanding immediate attention');

    const riskItems = stats.risks.length >= 3 ? stats.risks : [
      ...stats.risks,
      'Monitor data freshness — ensure regular ingestion schedules',
      'Validate downstream dependencies for data pipeline reliability',
      'Establish data quality monitoring thresholds for automated alerting',
    ].slice(0, 5);

    const rCardH = 0.6;
    riskItems.slice(0, 5).forEach((r, i) => {
      const y = 1.15 + i * (rCardH + 0.08);
      const severity = r.toLowerCase().includes('no significant') ? 'LOW' : i === 0 ? 'HIGH' : 'MED';
      const sevColor = severity === 'HIGH' ? RED : severity === 'MED' ? YELLOW : GREEN;

      s7.addShape('roundRect' as any, { x: 0.4, y, w: 9.2, h: rCardH, fill: { color: WHITE }, line: { color: BORDER_LIGHT, width: 1 }, rectRadius: 0.06 });
      s7.addShape('rect' as any, { x: 0.4, y, w: 0.07, h: rCardH, fill: { color: RED } });
      // Red circle with number
      s7.addShape('ellipse' as any, { x: 0.65, y: y + (rCardH - 0.32) / 2, w: 0.32, h: 0.32, fill: { color: RED } });
      s7.addText(String(i + 1), { x: 0.65, y: y + (rCardH - 0.32) / 2, w: 0.32, fontSize: 11, bold: true, color: WHITE, align: 'center' });
      s7.addText(trunc(r, 85), { x: 1.15, y: y + 0.08, w: 7, fontSize: 11, color: TEXT_DARK });
      // Severity badge
      s7.addShape('roundRect' as any, { x: 8.7, y: y + (rCardH - 0.28) / 2, w: 0.75, h: 0.28, fill: { color: sevColor + '18' }, rectRadius: 0.14 });
      s7.addText(severity, { x: 8.7, y: y + (rCardH - 0.28) / 2, w: 0.75, fontSize: 8, bold: true, color: sevColor, align: 'center' });
    });

    const rEndY = 1.15 + Math.min(riskItems.length, 5) * (rCardH + 0.08);
    s7.addShape('roundRect' as any, { x: 0.4, y: Math.max(rEndY + 0.1, 5.05), w: 9.2, h: 0.3, fill: { color: RED + '10' }, rectRadius: 0.04 });
    s7.addShape('rect' as any, { x: 0.4, y: Math.max(rEndY + 0.1, 5.05), w: 0.06, h: 0.3, fill: { color: RED } });
    s7.addText(`${stats.negatives.length} risk factor${stats.negatives.length !== 1 ? 's' : ''} identified — structured remediation recommended`, {
      x: 0.65, y: Math.max(rEndY + 0.13, 5.08), w: 8.7, fontSize: 9, color: RED,
    });
    addWatermark(s7);
    addFooter(s7, 7, totalSlides);

    // =============================================
    // SLIDE 8 — Data Quality (amber accent, circle + grid)
    // =============================================
    const s8 = pptx.addSlide();
    s8.background = { color: WHITE };
    contentTitle(s8, 'Data Quality Report', 'DATA QUALITY', ACCENTS.quality, 'Foundation of reliable insights');

    const qScore = stats.qualityScore ?? 0;
    const qGrade = qScore >= 90 ? 'A' : qScore >= 75 ? 'B' : qScore >= 60 ? 'C' : 'D';
    const qColor = qScore >= 80 ? GREEN : qScore >= 60 ? YELLOW : RED;

    // Left: Score circle (outline only)
    s8.addShape('ellipse' as any, { x: 0.6, y: 1.3, w: 2.4, h: 2.4, fill: { color: WHITE }, line: { color: qColor, width: 4 } });
    s8.addText(stats.qualityScore !== undefined ? `${qScore}` : '—', { x: 0.6, y: 1.6, w: 2.4, fontSize: 44, bold: true, color: qColor, align: 'center' });
    s8.addText(stats.qualityScore !== undefined ? `Grade ${qGrade}` : 'Not scanned', { x: 0.6, y: 2.7, w: 2.4, fontSize: 12, color: TEXT_MUTED, align: 'center' });

    // Right: 2x2 metric grid
    const qMetrics = [
      { label: 'Missing Data', value: `${stats.missingPct || 0}%`, color: (stats.missingPct || 0) > 10 ? RED : GREEN },
      { label: 'Issues Found', value: String(stats.qualityIssues || 0), color: (stats.qualityIssues || 0) > 5 ? YELLOW : GREEN },
      { label: 'Completeness', value: `${(100 - (stats.missingPct || 0)).toFixed(1)}%`, color: GREEN },
      { label: 'Columns Profiled', value: String(stats.columnCount), color: BLUE },
    ];
    qMetrics.forEach((m, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 3.5 + col * 3.1;
      const y = 1.3 + row * 1.2;
      s8.addShape('roundRect' as any, { x, y, w: 2.9, h: 1.0, fill: { color: WHITE }, line: { color: BORDER_LIGHT, width: 1 }, rectRadius: 0.06 });
      s8.addShape('rect' as any, { x, y, w: 0.06, h: 1.0, fill: { color: m.color } });
      s8.addText(m.value, { x: x + 0.2, y: y + 0.1, w: 2.4, fontSize: 22, bold: true, color: m.color });
      s8.addText(m.label, { x: x + 0.2, y: y + 0.55, w: 2.4, fontSize: 9, color: TEXT_MUTED });
    });

    // Bottom 4-stat bar
    const qualNarr = splitNarrative(generateNarrative('quality', stats, tpl.tone), 2);
    qualNarr.forEach((chunk, i) => {
      s8.addText(chunk, { x: 0.4, y: 3.95 + i * 0.5, w: 9.2, fontSize: 10, color: TEXT_BODY, lineSpacingMultiple: 1.4 });
    });

    s8.addShape('roundRect' as any, { x: 0.4, y: 5.05, w: 9.2, h: 0.3, fill: { color: YELLOW + '12' }, rectRadius: 0.04 });
    s8.addShape('rect' as any, { x: 0.4, y: 5.05, w: 0.06, h: 0.3, fill: { color: YELLOW } });
    s8.addText(`Data quality score of ${qScore}/100 (Grade ${qGrade}) — ${qScore >= 80 ? 'suitable for advanced analytics' : 'consider data cleaning before critical analysis'}.`, {
      x: 0.65, y: 5.08, w: 8.7, fontSize: 9, color: YELLOW,
    });
    addWatermark(s8);
    addFooter(s8, 8, totalSlides);

    // =============================================
    // SLIDE 9 — AI Insights (purple accent, numbered cards)
    // =============================================
    const s9 = pptx.addSlide();
    s9.background = { color: WHITE };
    contentTitle(s9, 'AI-Generated Intelligence', 'AI INSIGHTS', ACCENTS.insights, 'Patterns beyond the surface');

    const insightText = generateNarrative('deep-insights', stats, tpl.tone);
    const insightItems = insightText.split('\n\n').filter(Boolean).slice(0, 5);
    const defaultInsights = [
      `Cross-dimensional analysis reveals ${stats.numericColumns.length} quantitative metrics for composite scoring and predictive modeling.`,
      `Data distribution patterns suggest ${stats.categoricalColumns.length > 2 ? 'multi-segment' : 'focused'} segmentation opportunities.`,
      `With ${stats.rowCount.toLocaleString()} records, statistical significance thresholds are met for reliable hypothesis testing.`,
      `Column correlation patterns indicate potential for dimensionality reduction and feature selection.`,
      `Temporal patterns in the data suggest cyclical behavior worth monitoring for forecasting.`,
    ];
    const finalInsights = insightItems.length >= 3 ? insightItems : [...insightItems, ...defaultInsights].slice(0, 5);

    const iCardH = 0.7;
    finalInsights.forEach((insight, i) => {
      const y = 1.15 + i * (iCardH + 0.06);
      if (y + iCardH > 5.0) return;
      s9.addShape('roundRect' as any, { x: 0.4, y, w: 9.2, h: iCardH, fill: { color: WHITE }, line: { color: BORDER_LIGHT, width: 1 }, rectRadius: 0.06 });
      // Purple circle with number
      s9.addShape('ellipse' as any, { x: 0.6, y: y + (iCardH - 0.38) / 2, w: 0.38, h: 0.38, fill: { color: ACCENTS.insights } });
      s9.addText(String(i + 1), { x: 0.6, y: y + (iCardH - 0.38) / 2, w: 0.38, fontSize: 12, bold: true, color: WHITE, align: 'center' });
      s9.addText(trunc(insight, 200), { x: 1.15, y: y + 0.1, w: 8.2, fontSize: 10, color: TEXT_BODY, lineSpacingMultiple: 1.35 });
    });

    s9.addShape('roundRect' as any, { x: 0.4, y: 5.05, w: 9.2, h: 0.3, fill: { color: ACCENTS.insights + '12' }, rectRadius: 0.04 });
    s9.addShape('rect' as any, { x: 0.4, y: 5.05, w: 0.06, h: 0.3, fill: { color: ACCENTS.insights } });
    s9.addText(`${finalInsights.length} non-obvious patterns identified — investigate top findings for strategic advantage.`, {
      x: 0.65, y: 5.08, w: 8.7, fontSize: 9, color: ACCENTS.insights,
    });
    addWatermark(s9);
    addFooter(s9, 9, totalSlides);

    // =============================================
    // SLIDE 10 — Recommendations (teal accent, timeline)
    // =============================================
    const s10 = pptx.addSlide();
    s10.background = { color: WHITE };
    contentTitle(s10, 'Strategic Action Plan', 'RECOMMENDATIONS', ACCENTS.recs, 'Prioritized recommendations');

    // Vertical timeline line
    s10.addShape('rect' as any, { x: 1.3, y: 1.2, w: 0.03, h: 3.7, fill: { color: BORDER_LIGHT } });

    const timelineItems = [
      { phase: 'IMMEDIATE (0–30 DAYS)', items: stats.recommendations.slice(0, 2), color: RED },
      { phase: 'SHORT-TERM (30–90 DAYS)', items: stats.recommendations.slice(2, 4), color: YELLOW },
      { phase: 'LONG-TERM (90+ DAYS)', items: stats.recommendations.slice(4, 5).length ? stats.recommendations.slice(4, 5) : ['Develop comprehensive data strategy and governance framework'], color: GREEN },
    ];

    let tY = 1.15;
    timelineItems.forEach(phase => {
      if (tY > 4.6) return;
      // Colored circle on timeline
      s10.addShape('ellipse' as any, { x: 1.18, y: tY + 0.06, w: 0.28, h: 0.28, fill: { color: phase.color } });
      s10.addText(phase.phase, { x: 1.7, y: tY, w: 7, fontSize: 10, bold: true, color: phase.color });
      tY += 0.38;
      phase.items.forEach(item => {
        if (tY > 4.6) return;
        s10.addShape('roundRect' as any, { x: 1.7, y: tY, w: 7.9, h: 0.42, fill: { color: WHITE }, line: { color: BORDER_LIGHT, width: 1 }, rectRadius: 0.04 });
        s10.addShape('rect' as any, { x: 1.7, y: tY, w: 0.06, h: 0.42, fill: { color: phase.color } });
        s10.addText(trunc(item, 90), { x: 1.95, y: tY + 0.08, w: 7.4, fontSize: 10, color: TEXT_BODY });
        tY += 0.5;
      });
      tY += 0.15;
    });

    s10.addShape('roundRect' as any, { x: 0.4, y: 5.05, w: 9.2, h: 0.3, fill: { color: ACCENTS.recs + '12' }, rectRadius: 0.04 });
    s10.addShape('rect' as any, { x: 0.4, y: 5.05, w: 0.06, h: 0.3, fill: { color: ACCENTS.recs } });
    s10.addText(`${stats.recommendations.length} strategic actions prioritized — immediate execution on top 2 items recommended.`, {
      x: 0.65, y: 5.08, w: 8.7, fontSize: 9, color: ACCENTS.recs,
    });
    addWatermark(s10);
    addFooter(s10, 10, totalSlides);

    // =============================================
    // SLIDE 11 — Data Table (gray accent, full-width table)
    // =============================================
    if (data.length > 0) {
      const s11 = pptx.addSlide();
      s11.background = { color: WHITE };
      contentTitle(s11, 'Raw Data Snapshot', 'DATA SNAPSHOT', ACCENTS.table, `Top ${Math.min(data.length, 20)} of ${data.length.toLocaleString()} records`);

      const headers = Object.keys(data[0]).slice(0, 7);
      const rowCount = Math.min(data.length, 20);
      const rows = data.slice(0, rowCount);
      const availableH = 4.0; // y=1.15 to y=5.15
      const rowH = Math.min(0.22, availableH / (rowCount + 2));

      const tableRows = [
        headers.map(h => ({ text: trunc(h, 16), options: { bold: true, fontSize: 7, fill: { color: ACCENTS.table }, color: WHITE } })),
        ...rows.map((row, ri) => headers.map(h => ({
          text: trunc(String(row[h] ?? ''), 20),
          options: { fontSize: 6.5, color: TEXT_BODY, fill: { color: ri % 2 === 0 ? WHITE : ROW_ALT } },
        }))),
        headers.map((h, hi) => ({
          text: hi === 0 ? `${data.length.toLocaleString()} total` : '—',
          options: { bold: true, fontSize: 7, fill: { color: ACCENTS.table }, color: WHITE },
        })),
      ];

      s11.addTable(tableRows as any, {
        x: 0.4, y: 1.15, w: 9.2,
        rowH,
        colW: Array(headers.length).fill(9.2 / headers.length),
        border: { pt: 0.5, color: BORDER_LIGHT },
        autoPage: false,
      });
      addWatermark(s11);
      addFooter(s11, 11, totalSlides);
    }

    // =============================================
    // SLIDE 12 — Closing (template color background)
    // =============================================
    const closing = pptx.addSlide();
    closing.background = { color: COVER_BG };
    closing.addShape('rect' as any, { x: 0, y: 0, w: 0.12, h: '100%', fill: { color: COVER_ACCENT } });
    closing.addText('Data Drives Decisions', { x: 1, y: 1.0, w: 8, fontSize: 38, bold: true, align: 'center', color: WHITE });
    closing.addText('Top Action Items', { x: 1, y: 2.0, w: 8, fontSize: 14, bold: true, align: 'center', color: COVER_ACCENT });

    stats.recommendations.slice(0, 3).forEach((a, i) => {
      // Semi-transparent white boxes
      closing.addShape('roundRect' as any, { x: 1.5, y: 2.6 + i * 0.6, w: 7, h: 0.5, fill: { color: 'FFFFFF18' }, rectRadius: 0.05 });
      closing.addShape('rect' as any, { x: 1.5, y: 2.6 + i * 0.6, w: 0.06, h: 0.5, fill: { color: COVER_ACCENT } });
      closing.addText(`${i + 1}.  ${trunc(a, 80)}`, { x: 1.75, y: 2.65 + i * 0.6, w: 6.5, fontSize: 11, color: WHITE });
    });

    // Bottom branding
    closing.addShape('roundRect' as any, { x: 1.5, y: 4.5, w: 7, h: 0.45, fill: { color: COVER_ACCENT + '25' }, rectRadius: 0.05 });
    closing.addText(`Report generated by DataVora  •  ${tpl.name} Template  •  ${stats.date}`, {
      x: 1.5, y: 4.55, w: 7, fontSize: 9, align: 'center', color: TEXT_LIGHT,
    });
    addWatermark(closing);

    const blob = await pptx.write({ outputType: 'blob' }) as Blob;
    saveAs(blob, `${stats.title.replace(/\s+/g, '-').toLowerCase()}.pptx`);
    toast({ title: 'PowerPoint Exported', description: 'Presentation downloaded successfully.' });
  } catch (e) {
    console.error('PPTX export error:', e);
    toast({ title: 'Export Failed', description: 'Could not generate PowerPoint.', variant: 'destructive' });
  }
}
