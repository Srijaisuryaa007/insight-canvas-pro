// DataPulse — Formal PPTX Export (no colors, white backgrounds, legible text)
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

    // Formal monochrome palette
    const WHITE = 'FFFFFF';
    const BLACK = '1A1A1A';
    const DARK = '2D2D2D';
    const BODY = '3C3C3C';
    const MUTED = '6B6B6B';
    const LIGHT = '999999';
    const BORDER = 'D0D0D0';
    const ROW_ALT = 'F5F5F5';

    const trunc = (s: string, max: number) => s.length > max ? s.substring(0, max) + '...' : s;
    const totalSlides = 12;

    // Footer on every content slide
    const addFooter = (slide: any, pageNum: number) => {
      slide.addShape('rect' as any, { x: 0.5, y: 5.38, w: 9.0, h: 0.005, fill: { color: BORDER } });
      slide.addText(`${trunc(stats.datasetName, 30)}  |  ${stats.date}`, {
        x: 0.5, y: 5.42, w: 5, fontSize: 8, color: LIGHT,
      });
      slide.addText(`Page ${pageNum} of ${totalSlides}`, {
        x: 5.5, y: 5.42, w: 4, fontSize: 8, color: LIGHT, align: 'right',
      });
    };

    // Standard slide title
    const slideTitle = (slide: any, titleText: string, subtitle?: string) => {
      slide.addText(titleText, { x: 0.5, y: 0.3, w: 9, fontSize: 26, bold: true, color: BLACK, fontFace: 'Arial' });
      if (subtitle) {
        slide.addText(subtitle, { x: 0.5, y: 0.85, w: 9, fontSize: 11, color: MUTED, fontFace: 'Arial' });
      }
      slide.addShape('rect' as any, { x: 0.5, y: 1.08, w: 1.2, h: 0.02, fill: { color: BLACK } });
    };

    const splitNarrative = (text: string, maxChunks = 3): string[] => {
      const sentences = text.replace(/\n/g, ' ').split(/(?<=\.)\s+/).filter(Boolean);
      const chunks: string[] = [];
      let current = '';
      sentences.forEach(s => {
        if ((current + ' ' + s).length > 250 && current) {
          chunks.push(current.trim());
          current = s;
        } else {
          current = current ? current + ' ' + s : s;
        }
      });
      if (current) chunks.push(current.trim());
      return chunks.slice(0, maxChunks);
    };

    // ─── SLIDE 1: Title ───────────────────────────────────
    const cover = pptx.addSlide();
    cover.background = { color: WHITE };
    cover.addText(stats.title, {
      x: 0.8, y: 1.2, w: 8.4, fontSize: 34, bold: true, color: BLACK, fontFace: 'Arial', lineSpacingMultiple: 1.15,
    });
    cover.addShape('rect' as any, { x: 0.8, y: 2.3, w: 2, h: 0.02, fill: { color: BLACK } });
    cover.addText('Data Intelligence Report', {
      x: 0.8, y: 2.5, w: 8, fontSize: 16, color: DARK, fontFace: 'Arial',
    });

    const coverMeta = [
      `Date: ${stats.date}`,
      `Dataset: ${trunc(stats.datasetName, 40)}`,
      `Records: ${stats.rowCount.toLocaleString()}  |  Dimensions: ${stats.columnCount}`,
      `Prepared by: ${trunc(stats.userName, 30)}`,
    ];
    coverMeta.forEach((line, i) => {
      cover.addText(line, {
        x: 0.8, y: 3.2 + i * 0.35, w: 8, fontSize: 11, color: MUTED, fontFace: 'Arial',
      });
    });

    // ─── SLIDE 2: Executive Summary ──────────────────────
    const s2 = pptx.addSlide();
    s2.background = { color: WHITE };
    slideTitle(s2, 'Executive Summary', 'Key findings from the analysis');

    const execChunks = splitNarrative(generateNarrative('executive-summary', stats, tpl.tone), 3);
    execChunks.forEach((chunk, i) => {
      s2.addText(chunk, { x: 0.5, y: 1.3 + i * 0.65, w: 9, fontSize: 11, color: BODY, lineSpacingMultiple: 1.5, fontFace: 'Arial' });
    });

    // Key figures as simple text list
    const execFigures = [
      `Total Records: ${stats.rowCount.toLocaleString()}`,
      `Positive Signals: ${stats.positives.length}`,
      `Risk Indicators: ${stats.negatives.length}`,
      `Quality Score: ${stats.qualityScore !== undefined ? `${stats.qualityScore}/100` : 'Not assessed'}`,
    ];
    s2.addText('Key Figures', { x: 0.5, y: 3.6, w: 9, fontSize: 12, bold: true, color: BLACK, fontFace: 'Arial' });
    execFigures.forEach((fig, i) => {
      s2.addText(fig, { x: 0.7, y: 3.95 + i * 0.32, w: 8, fontSize: 11, color: BODY, fontFace: 'Arial' });
    });
    addFooter(s2, 2);

    // ─── SLIDE 3: Dataset Overview ───────────────────────
    const s3 = pptx.addSlide();
    s3.background = { color: WHITE };
    slideTitle(s3, 'Dataset Overview', 'Structure and composition of the data');

    const overviewNarr = splitNarrative(generateNarrative('dataset-overview', stats, tpl.tone), 2);
    overviewNarr.forEach((chunk, i) => {
      s3.addText(chunk, { x: 0.5, y: 1.3 + i * 0.55, w: 9, fontSize: 11, color: BODY, lineSpacingMultiple: 1.4, fontFace: 'Arial' });
    });

    // Simple stats table
    const overviewRows = [
      ['Metric', 'Value'],
      ['Total Records', stats.rowCount.toLocaleString()],
      ['Total Columns', String(stats.columnCount)],
      ['Numeric Columns', String(stats.numericColumns.length)],
      ['Categorical Columns', String(stats.categoricalColumns.length)],
      ['Date Columns', String(stats.dateColumns.length)],
      ['Data Completeness', `${(100 - (stats.missingPct || 0)).toFixed(1)}%`],
    ];
    const tableRows = overviewRows.map((row, ri) => row.map(cell => ({
      text: cell,
      options: {
        fontSize: ri === 0 ? 9 : 10,
        bold: ri === 0,
        color: ri === 0 ? WHITE : BODY,
        fill: { color: ri === 0 ? DARK : ri % 2 === 0 ? ROW_ALT : WHITE },
        fontFace: 'Arial',
      },
    })));
    s3.addTable(tableRows as any, {
      x: 0.5, y: 2.6, w: 5, rowH: 0.32,
      colW: [2.5, 2.5],
      border: { pt: 0.5, color: BORDER },
      autoPage: false,
    });
    addFooter(s3, 3);

    // ─── SLIDE 4: KPI Performance ────────────────────────
    const s4 = pptx.addSlide();
    s4.background = { color: WHITE };
    slideTitle(s4, 'Key Performance Indicators', 'Quantitative metrics from the dataset');

    const kpiRows = [
      ['Indicator', 'Value', 'Trend'],
      ...stats.kpis.slice(0, 8).map(kpi => {
        const matchingTrend = stats.trends.find(t => kpi.label.includes(t.col));
        const trendText = matchingTrend
          ? `${matchingTrend.direction} (${matchingTrend.change > 0 ? '+' : ''}${matchingTrend.change}%)`
          : '—';
        return [kpi.label, kpi.value, trendText];
      }),
    ];
    const kpiTable = kpiRows.map((row, ri) => row.map(cell => ({
      text: cell,
      options: {
        fontSize: ri === 0 ? 9 : 10,
        bold: ri === 0,
        color: ri === 0 ? WHITE : BODY,
        fill: { color: ri === 0 ? DARK : ri % 2 === 0 ? ROW_ALT : WHITE },
        fontFace: 'Arial',
      },
    })));
    s4.addTable(kpiTable as any, {
      x: 0.5, y: 1.3, w: 9, rowH: 0.36,
      colW: [4, 2.5, 2.5],
      border: { pt: 0.5, color: BORDER },
      autoPage: false,
    });
    addFooter(s4, 4);

    // ─── SLIDE 5: Trend Analysis ─────────────────────────
    const s5 = pptx.addSlide();
    s5.background = { color: WHITE };
    slideTitle(s5, 'Trend Analysis', 'Performance trajectory across key metrics');

    const trendTableRows = [
      ['Metric', 'Direction', 'Change', '1st Half Avg', '2nd Half Avg'],
      ...stats.trends.slice(0, 10).map(t => [
        trunc(t.col, 25),
        t.direction,
        `${t.change > 0 ? '+' : ''}${t.change}%`,
        t.firstHalfAvg.toLocaleString(),
        t.secondHalfAvg.toLocaleString(),
      ]),
    ];
    const trendTable = trendTableRows.map((row, ri) => row.map(cell => ({
      text: cell,
      options: {
        fontSize: ri === 0 ? 8 : 9,
        bold: ri === 0,
        color: ri === 0 ? WHITE : BODY,
        fill: { color: ri === 0 ? DARK : ri % 2 === 0 ? ROW_ALT : WHITE },
        fontFace: 'Arial',
      },
    })));
    s5.addTable(trendTable as any, {
      x: 0.5, y: 1.3, w: 9, rowH: 0.34,
      colW: [2.5, 1.5, 1.2, 1.9, 1.9],
      border: { pt: 0.5, color: BORDER },
      autoPage: false,
    });

    const upTrends = stats.trends.filter(t => t.change > 0).length;
    const downTrends = stats.trends.filter(t => t.change < 0).length;
    const trendSummaryY = 1.3 + trendTableRows.length * 0.34 + 0.3;
    s5.addText(`Summary: ${upTrends} metric(s) trending upward, ${downTrends} declining. Prioritize investigation of declining indicators.`, {
      x: 0.5, y: Math.min(trendSummaryY, 4.8), w: 9, fontSize: 10, color: MUTED, fontFace: 'Arial',
    });
    addFooter(s5, 5);

    // ─── SLIDE 6: Strengths ──────────────────────────────
    const s6 = pptx.addSlide();
    s6.background = { color: WHITE };
    slideTitle(s6, 'Strengths', 'Data-verified positive signals');

    const strengthNarr = splitNarrative(generateNarrative('positives', stats, tpl.tone), 2);
    strengthNarr.forEach((chunk, i) => {
      s6.addText(chunk, { x: 0.5, y: 1.3 + i * 0.55, w: 9, fontSize: 11, color: BODY, lineSpacingMultiple: 1.4, fontFace: 'Arial' });
    });

    const positiveItems = stats.positives.length > 0 ? stats.positives : ['All monitored metrics remain within expected ranges.'];
    positiveItems.slice(0, 6).forEach((item, i) => {
      s6.addText(`${i + 1}.  ${item}`, {
        x: 0.7, y: 2.6 + i * 0.38, w: 8.5, fontSize: 11, color: BODY, fontFace: 'Arial',
      });
    });
    addFooter(s6, 6);

    // ─── SLIDE 7: Issues & Risks ─────────────────────────
    const s7 = pptx.addSlide();
    s7.background = { color: WHITE };
    slideTitle(s7, 'Issues and Risks', 'Areas requiring attention');

    const riskNarr = splitNarrative(generateNarrative('negatives', stats, tpl.tone), 2);
    riskNarr.forEach((chunk, i) => {
      s7.addText(chunk, { x: 0.5, y: 1.3 + i * 0.55, w: 9, fontSize: 11, color: BODY, lineSpacingMultiple: 1.4, fontFace: 'Arial' });
    });

    const riskItems = stats.risks.length >= 3 ? stats.risks : [
      ...stats.risks,
      'Ensure regular data ingestion schedules are maintained.',
      'Validate downstream pipeline dependencies.',
      'Establish automated quality monitoring thresholds.',
    ].slice(0, 5);
    riskItems.forEach((item, i) => {
      s7.addText(`${i + 1}.  ${item}`, {
        x: 0.7, y: 2.6 + i * 0.38, w: 8.5, fontSize: 11, color: BODY, fontFace: 'Arial',
      });
    });
    addFooter(s7, 7);

    // ─── SLIDE 8: Data Quality ───────────────────────────
    const s8 = pptx.addSlide();
    s8.background = { color: WHITE };
    slideTitle(s8, 'Data Quality Assessment', 'Foundation of reliable analysis');

    const qScore = stats.qualityScore ?? 0;
    const qGrade = qScore >= 90 ? 'A' : qScore >= 75 ? 'B' : qScore >= 60 ? 'C' : 'D';

    const qualityRows = [
      ['Metric', 'Result'],
      ['Health Score', stats.qualityScore !== undefined ? `${qScore}/100 (Grade ${qGrade})` : 'Not assessed'],
      ['Missing Data', `${stats.missingPct || 0}%`],
      ['Issues Detected', String(stats.qualityIssues || 0)],
      ['Data Completeness', `${(100 - (stats.missingPct || 0)).toFixed(1)}%`],
      ['Columns Profiled', String(stats.columnCount)],
    ];
    const qTable = qualityRows.map((row, ri) => row.map(cell => ({
      text: cell,
      options: {
        fontSize: ri === 0 ? 9 : 10,
        bold: ri === 0 || (ri > 0 && row.indexOf(cell) === 0),
        color: ri === 0 ? WHITE : BODY,
        fill: { color: ri === 0 ? DARK : ri % 2 === 0 ? ROW_ALT : WHITE },
        fontFace: 'Arial',
      },
    })));
    s8.addTable(qTable as any, {
      x: 0.5, y: 1.3, w: 5.5, rowH: 0.34,
      colW: [2.8, 2.7],
      border: { pt: 0.5, color: BORDER },
      autoPage: false,
    });

    const qualNarr = splitNarrative(generateNarrative('quality', stats, tpl.tone), 2);
    qualNarr.forEach((chunk, i) => {
      s8.addText(chunk, { x: 0.5, y: 3.8 + i * 0.55, w: 9, fontSize: 10, color: MUTED, lineSpacingMultiple: 1.4, fontFace: 'Arial' });
    });
    addFooter(s8, 8);

    // ─── SLIDE 9: AI Insights ────────────────────────────
    const s9 = pptx.addSlide();
    s9.background = { color: WHITE };
    slideTitle(s9, 'Analytical Insights', 'Patterns identified in the data');

    const insightText = generateNarrative('deep-insights', stats, tpl.tone);
    const insightItems = insightText.split('\n\n').filter(Boolean).slice(0, 5);
    const defaultInsights = [
      `Cross-dimensional analysis reveals ${stats.numericColumns.length} quantitative metrics suitable for composite scoring.`,
      `Data distribution patterns suggest ${stats.categoricalColumns.length > 2 ? 'multi-segment' : 'focused'} segmentation opportunities.`,
      `With ${stats.rowCount.toLocaleString()} records, statistical significance thresholds are met for hypothesis testing.`,
      `Column correlation patterns indicate potential for dimensionality reduction.`,
      `Review temporal patterns for cyclical behavior relevant to forecasting.`,
    ];
    const finalInsights = insightItems.length >= 3 ? insightItems : [...insightItems, ...defaultInsights].slice(0, 5);

    finalInsights.forEach((insight, i) => {
      s9.addText(`${i + 1}.  ${trunc(insight, 200)}`, {
        x: 0.7, y: 1.3 + i * 0.65, w: 8.5, fontSize: 11, color: BODY, lineSpacingMultiple: 1.4, fontFace: 'Arial',
      });
    });
    addFooter(s9, 9);

    // ─── SLIDE 10: Recommendations ───────────────────────
    const s10 = pptx.addSlide();
    s10.background = { color: WHITE };
    slideTitle(s10, 'Recommendations', 'Prioritized action items');

    const phases = [
      { label: 'Immediate (0-30 days)', items: stats.recommendations.slice(0, 2) },
      { label: 'Short-term (30-90 days)', items: stats.recommendations.slice(2, 4) },
      { label: 'Long-term (90+ days)', items: stats.recommendations.slice(4, 5).length ? stats.recommendations.slice(4, 5) : ['Develop comprehensive data strategy and governance framework.'] },
    ];

    let rY = 1.3;
    phases.forEach(phase => {
      s10.addText(phase.label, { x: 0.5, y: rY, w: 9, fontSize: 12, bold: true, color: BLACK, fontFace: 'Arial' });
      rY += 0.35;
      phase.items.forEach(item => {
        s10.addText(`-  ${trunc(item, 100)}`, { x: 0.8, y: rY, w: 8.5, fontSize: 11, color: BODY, fontFace: 'Arial' });
        rY += 0.35;
      });
      rY += 0.2;
    });
    addFooter(s10, 10);

    // ─── SLIDE 11: Data Table ────────────────────────────
    if (data.length > 0) {
      const s11 = pptx.addSlide();
      s11.background = { color: WHITE };
      slideTitle(s11, 'Data Sample', `First ${Math.min(data.length, 18)} of ${data.length.toLocaleString()} records`);

      const headers = Object.keys(data[0]).slice(0, 7);
      const rows = data.slice(0, 18);
      const dataTableRows = [
        headers.map(h => ({ text: trunc(h, 16), options: { bold: true, fontSize: 7, fill: { color: DARK }, color: WHITE, fontFace: 'Arial' } })),
        ...rows.map((row, ri) => headers.map(h => ({
          text: trunc(String(row[h] ?? ''), 20),
          options: { fontSize: 7, color: BODY, fill: { color: ri % 2 === 0 ? WHITE : ROW_ALT }, fontFace: 'Arial' },
        }))),
      ];
      s11.addTable(dataTableRows as any, {
        x: 0.5, y: 1.3, w: 9,
        rowH: 0.22,
        colW: Array(headers.length).fill(9 / headers.length),
        border: { pt: 0.5, color: BORDER },
        autoPage: false,
      });
      addFooter(s11, 11);
    }

    // ─── SLIDE 12: Closing ───────────────────────────────
    const closing = pptx.addSlide();
    closing.background = { color: WHITE };
    closing.addText('Summary', {
      x: 0.8, y: 1.0, w: 8.4, fontSize: 30, bold: true, color: BLACK, fontFace: 'Arial',
    });
    closing.addShape('rect' as any, { x: 0.8, y: 1.7, w: 1.5, h: 0.02, fill: { color: BLACK } });

    closing.addText('Priority Actions:', {
      x: 0.8, y: 2.0, w: 8, fontSize: 14, bold: true, color: DARK, fontFace: 'Arial',
    });
    stats.recommendations.slice(0, 3).forEach((a, i) => {
      closing.addText(`${i + 1}.  ${trunc(a, 90)}`, {
        x: 1.0, y: 2.5 + i * 0.45, w: 8, fontSize: 12, color: BODY, fontFace: 'Arial',
      });
    });

    closing.addText(`Report prepared by DataVora  |  ${stats.date}`, {
      x: 0.8, y: 4.5, w: 8, fontSize: 9, color: LIGHT, fontFace: 'Arial',
    });

    const blob = await pptx.write({ outputType: 'blob' }) as Blob;
    const filename = `${stats.title.replace(/\s+/g, '-').toLowerCase()}.pptx`;
    saveAs(blob, filename);
    toast({ title: 'Presentation Exported', description: 'Formal report downloaded.' });
  } catch (e) {
    console.error('PPTX export error:', e);
    toast({ title: 'Export Failed', description: 'Could not generate presentation.', variant: 'destructive' });
  }
}
