// DataVora Export Engine — PDF, PPTX, DOCX
import { saveAs } from 'file-saver';
import { toast } from '@/hooks/use-toast';

interface ReportData {
  title: string;
  datasetName: string;
  userName: string;
  generatedDate: string;
  rowCount: number;
  columnCount: number;
  kpis: Array<{ label: string; value: string }>;
  trends: Array<{ col: string; change: number; direction: string }>;
  positives: string[];
  negatives: string[];
  risks: string[];
  opportunities: string[];
  recommendations: string[];
  qualityScore?: number;
  qualityIssues?: number;
  aiSummary: string;
}

export function buildReportData(
  data: Record<string, unknown>[],
  datasetName: string,
  userName: string,
  title?: string,
  qualityReport?: { overallScore: number; issues: any[] } | null
): ReportData {
  if (!data.length) throw new Error('No data');
  const cols = Object.keys(data[0]);
  const numCols = cols.filter(c => typeof data[0][c] === 'number');

  const kpis: ReportData['kpis'] = [
    { label: 'Total Rows', value: data.length.toLocaleString() },
    { label: 'Columns', value: cols.length.toString() },
  ];
  numCols.slice(0, 4).forEach(col => {
    const vals = data.map(r => Number(r[col]) || 0);
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / vals.length;
    const isAvg = /rate|score|rating/i.test(col);
    kpis.push({ label: isAvg ? `Avg ${col}` : `Total ${col}`, value: isAvg ? avg.toFixed(1) : sum.toLocaleString() });
  });

  const trends: ReportData['trends'] = [];
  numCols.slice(0, 3).forEach(col => {
    const vals = data.map(r => Number(r[col]) || 0);
    const half = Math.floor(vals.length / 2);
    const fAvg = vals.slice(0, half).reduce((a, b) => a + b, 0) / (half || 1);
    const sAvg = vals.slice(half).reduce((a, b) => a + b, 0) / ((vals.length - half) || 1);
    const change = fAvg ? Math.round(((sAvg - fAvg) / fAvg) * 1000) / 10 : 0;
    trends.push({ col, change, direction: change > 1 ? 'Increasing' : change < -1 ? 'Decreasing' : 'Stable' });
  });

  const positives = trends.filter(t => t.change > 5).map(t => `${t.col} shows ${t.change}% growth`);
  const negatives = trends.filter(t => t.change < -5).map(t => `${t.col} declined by ${Math.abs(t.change)}%`);

  const aiSummary = [
    trends[0] ? `${trends[0].col} is ${trends[0].direction.toLowerCase()} at ${trends[0].change > 0 ? '+' : ''}${trends[0].change}%.` : '',
    positives.length ? `${positives.length} metric(s) showing growth.` : 'Metrics remain stable.',
    negatives.length ? `${negatives.length} metric(s) declining — investigate root causes.` : '',
    `Dataset contains ${data.length.toLocaleString()} records across ${cols.length} dimensions.`,
  ].filter(Boolean).join(' ');

  return {
    title: title || `${datasetName} Analytics Report`,
    datasetName,
    userName,
    generatedDate: new Date().toLocaleDateString(),
    rowCount: data.length,
    columnCount: cols.length,
    kpis, trends, positives, negatives,
    risks: negatives.length > 0 ? negatives.map(n => `Monitor: ${n}`) : ['No significant risks detected'],
    opportunities: positives.length > 0 ? positives.map(p => `Capitalize on: ${p}`) : ['Maintain current trajectory'],
    recommendations: [
      ...(positives.length ? ['Continue investing in top-performing areas'] : []),
      ...(negatives.length ? ['Investigate declining metrics'] : []),
      'Schedule regular data quality reviews',
    ],
    qualityScore: qualityReport?.overallScore,
    qualityIssues: qualityReport?.issues?.length,
    aiSummary,
  };
}

export async function exportPDF(report: ReportData) {
  try {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const margin = 22;
    let y = margin;

    const BLACK: [number, number, number] = [26, 26, 26];
    const DARK: [number, number, number] = [50, 50, 50];
    const BODY: [number, number, number] = [60, 60, 60];
    const MUTED: [number, number, number] = [140, 140, 140];

    const ensureSpace = (needed: number) => {
      if (y + needed > ph - 18) { pdf.addPage(); y = margin; }
    };

    const addText = (text: string, size: number, color: [number, number, number] = BODY, bold = false) => {
      pdf.setFontSize(size);
      pdf.setTextColor(...color);
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      const lines = pdf.splitTextToSize(text, pw - 2 * margin);
      ensureSpace(lines.length * size * 0.42 + 4);
      pdf.text(lines, margin, y);
      y += lines.length * size * 0.45 + 2;
    };

    // Title page
    y = 60;
    addText(report.title, 24, BLACK, true);
    y += 6;
    pdf.setDrawColor(26, 26, 26);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, margin + 25, y);
    y += 8;
    addText(`Date: ${report.generatedDate}`, 10, MUTED);
    addText(`Dataset: ${report.datasetName}`, 10, MUTED);
    addText(`Prepared by: ${report.userName}`, 10, MUTED);
    addText(`${report.rowCount.toLocaleString()} records | ${report.columnCount} columns`, 10, MUTED);

    // Executive Summary
    pdf.addPage(); y = margin;
    addText('Executive Summary', 16, BLACK, true);
    y += 3;
    addText(report.aiSummary, 10, BODY);
    y += 5;

    // KPIs
    addText('Key Performance Indicators', 14, BLACK, true);
    y += 3;
    report.kpis.forEach(kpi => addText(`${kpi.label}: ${kpi.value}`, 10, DARK));
    y += 5;

    // Trends
    addText('Trend Analysis', 14, BLACK, true);
    y += 3;
    report.trends.forEach(t => addText(`${t.col}: ${t.direction} (${t.change > 0 ? '+' : ''}${t.change}%)`, 10, DARK));
    y += 5;

    // Strengths
    addText('Strengths', 14, BLACK, true);
    y += 3;
    (report.positives.length ? report.positives : ['All metrics stable.']).forEach(p => addText(`-  ${p}`, 10, DARK));
    y += 5;

    // Risks
    addText('Risks and Issues', 14, BLACK, true);
    y += 3;
    report.risks.forEach(r => addText(`-  ${r}`, 10, DARK));
    y += 5;

    // Recommendations
    addText('Recommendations', 14, BLACK, true);
    y += 3;
    report.recommendations.forEach(r => addText(`-  ${r}`, 10, DARK));

    if (report.qualityScore !== undefined) {
      y += 5;
      addText('Data Quality', 14, BLACK, true);
      y += 3;
      addText(`Score: ${report.qualityScore}% | ${report.qualityIssues || 0} issues detected`, 10, DARK);
    }

    // Footers
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(7);
      pdf.setTextColor(170, 170, 170);
      pdf.text(`DataVora  |  Page ${i} of ${totalPages}`, margin, ph - 10);
    }

    pdf.save(`${report.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    toast({ title: 'PDF Exported', description: 'Formal report downloaded.' });
  } catch (e) {
    console.error('PDF export error:', e);
    toast({ title: 'Export Failed', variant: 'destructive' });
  }
}

export async function exportPPTX(report: ReportData) {
  try {
    const pptxgenjs = await import('pptxgenjs');
    const pptx = new pptxgenjs.default();
    pptx.layout = 'LAYOUT_WIDE';

    const WHITE = 'FFFFFF';
    const BLACK = '1A1A1A';
    const DARK = '333333';
    const BODY_C = '444444';
    const MUTED_C = '888888';

    const addSlide = (titleText: string, content: string[]) => {
      const slide = pptx.addSlide();
      slide.background = { color: WHITE };
      slide.addText(titleText, { x: 0.5, y: 0.3, w: '90%', fontSize: 22, bold: true, color: BLACK, fontFace: 'Arial' });
      slide.addShape('rect' as any, { x: 0.5, y: 0.85, w: 1, h: 0.02, fill: { color: BLACK } });
      content.forEach((line, i) => {
        slide.addText(line, { x: 0.7, y: 1.2 + i * 0.45, w: '85%', fontSize: 12, color: BODY_C, fontFace: 'Arial' });
      });
    };

    // Title
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: WHITE };
    titleSlide.addText(report.title, { x: 0.8, y: 1.5, w: '80%', fontSize: 28, bold: true, color: BLACK, fontFace: 'Arial' });
    titleSlide.addShape('rect' as any, { x: 0.8, y: 2.3, w: 2, h: 0.02, fill: { color: BLACK } });
    titleSlide.addText(`${report.generatedDate}  |  ${report.userName}`, { x: 0.8, y: 2.6, w: '80%', fontSize: 11, color: MUTED_C, fontFace: 'Arial' });
    titleSlide.addText(`${report.rowCount.toLocaleString()} records  |  ${report.columnCount} columns`, { x: 0.8, y: 3.0, w: '80%', fontSize: 10, color: MUTED_C, fontFace: 'Arial' });

    addSlide('Executive Summary', [report.aiSummary]);

    // KPIs
    const kpiSlide = pptx.addSlide();
    kpiSlide.background = { color: WHITE };
    kpiSlide.addText('Key Performance Indicators', { x: 0.5, y: 0.3, w: '90%', fontSize: 22, bold: true, color: BLACK, fontFace: 'Arial' });
    kpiSlide.addShape('rect' as any, { x: 0.5, y: 0.85, w: 1, h: 0.02, fill: { color: BLACK } });
    report.kpis.forEach((kpi, i) => {
      kpiSlide.addText(`${kpi.label}:  ${kpi.value}`, { x: 0.7, y: 1.2 + i * 0.4, w: '85%', fontSize: 13, color: DARK, fontFace: 'Arial' });
    });

    addSlide('Trend Analysis', report.trends.map(t => `${t.col}: ${t.direction} (${t.change > 0 ? '+' : ''}${t.change}%)`));
    addSlide('Strengths', report.positives.length ? report.positives : ['All metrics remain stable.']);
    addSlide('Risks and Issues', report.risks);
    addSlide('Opportunities', report.opportunities);
    addSlide('Recommendations', report.recommendations);
    addSlide('Data Quality', [
      report.qualityScore !== undefined ? `Score: ${report.qualityScore}%` : 'Not assessed.',
      report.qualityIssues !== undefined ? `${report.qualityIssues} issues detected.` : '',
    ].filter(Boolean));

    const blob = await pptx.write({ outputType: 'blob' }) as Blob;
    saveAs(blob, `${report.title.replace(/\s+/g, '-').toLowerCase()}.pptx`);
    toast({ title: 'Presentation Exported', description: 'Formal report downloaded.' });
  } catch (e) {
    console.error('PPTX export error:', e);
    toast({ title: 'Export Failed', variant: 'destructive' });
  }
}

export async function exportDOCX(report: ReportData) {
  try {
    const docxLib = await import('docx');
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = docxLib;

    const BLACK = '1A1A1A';
    const DARK = '333333';
    const BODY_C = '444444';
    const MUTED_C = '999999';

    const makeParagraph = (text: string, options?: { bold?: boolean; size?: number; heading?: any; spacing?: number }) => {
      return new Paragraph({
        heading: options?.heading,
        spacing: { after: options?.spacing ?? 120 },
        children: [new TextRun({ text, bold: options?.bold, color: DARK, size: options?.size || 22, font: 'Arial' })],
      });
    };

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            spacing: { after: 400 },
            children: [new TextRun({ text: report.title, bold: true, size: 44, color: BLACK, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: `Date: ${report.generatedDate}  |  Prepared by: ${report.userName}`, size: 20, color: MUTED_C, font: 'Arial' })],
          }),
          new Paragraph({
            spacing: { after: 600 },
            children: [new TextRun({ text: `Dataset: ${report.datasetName}  |  ${report.rowCount.toLocaleString()} records  |  ${report.columnCount} columns`, size: 18, color: MUTED_C, font: 'Arial' })],
          }),

          makeParagraph('Executive Summary', { bold: true, size: 30, heading: HeadingLevel.HEADING_1 }),
          makeParagraph(report.aiSummary),

          makeParagraph('Key Performance Indicators', { bold: true, size: 26, heading: HeadingLevel.HEADING_2, spacing: 300 }),
          ...report.kpis.map(k => makeParagraph(`${k.label}: ${k.value}`)),

          makeParagraph('Trend Analysis', { bold: true, size: 26, heading: HeadingLevel.HEADING_2, spacing: 300 }),
          ...report.trends.map(t => makeParagraph(`${t.col}: ${t.direction} (${t.change > 0 ? '+' : ''}${t.change}%)`)),

          makeParagraph('Strengths', { bold: true, size: 26, heading: HeadingLevel.HEADING_2, spacing: 300 }),
          ...(report.positives.length ? report.positives : ['Metrics stable.']).map(p => makeParagraph(`-  ${p}`)),

          makeParagraph('Risks and Issues', { bold: true, size: 26, heading: HeadingLevel.HEADING_2, spacing: 300 }),
          ...report.risks.map(r => makeParagraph(`-  ${r}`)),

          makeParagraph('Opportunities', { bold: true, size: 26, heading: HeadingLevel.HEADING_2, spacing: 300 }),
          ...report.opportunities.map(o => makeParagraph(`-  ${o}`)),

          makeParagraph('Recommendations', { bold: true, size: 26, heading: HeadingLevel.HEADING_2, spacing: 300 }),
          ...report.recommendations.map(r => makeParagraph(`-  ${r}`)),

          makeParagraph('Data Quality', { bold: true, size: 26, heading: HeadingLevel.HEADING_2, spacing: 300 }),
          makeParagraph(report.qualityScore !== undefined ? `Score: ${report.qualityScore}%  |  ${report.qualityIssues || 0} issues detected.` : 'Not assessed.'),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${report.title.replace(/\s+/g, '-').toLowerCase()}.docx`);
    toast({ title: 'Document Exported', description: 'Formal report downloaded.' });
  } catch (e) {
    console.error('DOCX export error:', e);
    toast({ title: 'Export Failed', variant: 'destructive' });
  }
}
