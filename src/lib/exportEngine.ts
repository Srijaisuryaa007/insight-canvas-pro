// DataPulse Export Engine — PDF, PPTX, DOCX
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
    const margin = 20;
    let y = margin;

    const addText = (text: string, size: number, color: [number, number, number] = [0, 0, 0], bold = false) => {
      pdf.setFontSize(size);
      pdf.setTextColor(...color);
      if (bold) pdf.setFont('helvetica', 'bold');
      else pdf.setFont('helvetica', 'normal');
      const lines = pdf.splitTextToSize(text, pw - 2 * margin);
      if (y + lines.length * size * 0.4 > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(lines, margin, y);
      y += lines.length * size * 0.45 + 2;
    };

    // Title page
    y = 80;
    addText(report.title, 28, [50, 50, 200], true);
    y += 10;
    addText(`Generated: ${report.generatedDate}`, 11, [120, 120, 120]);
    addText(`Dataset: ${report.datasetName}`, 11, [120, 120, 120]);
    addText(`Prepared by: ${report.userName}`, 11, [120, 120, 120]);
    addText(`${report.rowCount.toLocaleString()} rows • ${report.columnCount} columns`, 11, [120, 120, 120]);

    // Executive Summary
    pdf.addPage(); y = margin;
    addText('Executive Summary', 18, [30, 30, 30], true);
    y += 3;
    addText(report.aiSummary, 11, [60, 60, 60]);
    y += 5;

    // KPIs
    addText('Key Performance Indicators', 16, [30, 30, 30], true);
    y += 3;
    report.kpis.forEach(kpi => {
      addText(`${kpi.label}: ${kpi.value}`, 11, [40, 40, 40]);
    });
    y += 5;

    // Trends
    addText('Trend Analysis', 16, [30, 30, 30], true);
    y += 3;
    report.trends.forEach(t => {
      const color: [number, number, number] = t.change > 1 ? [34, 197, 94] : t.change < -1 ? [239, 68, 68] : [120, 120, 120];
      addText(`${t.col}: ${t.direction} (${t.change > 0 ? '+' : ''}${t.change}%)`, 11, color);
    });
    y += 5;

    // Positives
    addText('Positive Findings', 16, [34, 197, 94], true);
    y += 3;
    (report.positives.length ? report.positives : ['All metrics stable']).forEach(p => addText(`✓ ${p}`, 11, [34, 150, 70]));
    y += 5;

    // Risks
    addText('Risks & Concerns', 16, [239, 68, 68], true);
    y += 3;
    report.risks.forEach(r => addText(`⚠ ${r}`, 11, [200, 50, 50]));
    y += 5;

    // Recommendations
    addText('Recommendations', 16, [30, 30, 30], true);
    y += 3;
    report.recommendations.forEach(r => addText(`→ ${r}`, 11, [60, 60, 60]));

    // Quality
    if (report.qualityScore !== undefined) {
      y += 5;
      addText('Data Quality', 16, [30, 30, 30], true);
      y += 3;
      addText(`Score: ${report.qualityScore}% • ${report.qualityIssues || 0} issues`, 11, [60, 60, 60]);
    }

    // Footer on each page
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`DataPulse Analytics Report • Page ${i} of ${totalPages}`, margin, pdf.internal.pageSize.getHeight() - 10);
    }

    pdf.save(`${report.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    toast({ title: 'PDF Exported', description: 'Report downloaded successfully.' });
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

    const addSlide = (title: string, content: string[], options?: { color?: string }) => {
      const slide = pptx.addSlide();
      slide.addText(title, { x: 0.5, y: 0.3, w: '90%', fontSize: 24, bold: true, color: '363636' });
      content.forEach((line, i) => {
        slide.addText(line, { x: 0.7, y: 1.2 + i * 0.5, w: '85%', fontSize: 14, color: options?.color || '555555' });
      });
    };

    // Title
    const titleSlide = pptx.addSlide();
    titleSlide.addText('📊', { x: 4.5, y: 1, w: 2, fontSize: 60, align: 'center' });
    titleSlide.addText(report.title, { x: 1, y: 2.5, w: '80%', fontSize: 32, bold: true, align: 'center', color: '333399' });
    titleSlide.addText(`${report.generatedDate} • ${report.userName}`, { x: 1, y: 3.5, w: '80%', fontSize: 14, align: 'center', color: '888888' });
    titleSlide.addText(`${report.rowCount.toLocaleString()} records analyzed`, { x: 1, y: 4, w: '80%', fontSize: 12, align: 'center', color: 'aaaaaa' });

    // Executive Summary
    addSlide('Executive Summary', [report.aiSummary]);

    // KPIs
    const kpiSlide = pptx.addSlide();
    kpiSlide.addText('Key Performance Indicators', { x: 0.5, y: 0.3, w: '90%', fontSize: 24, bold: true, color: '363636' });
    report.kpis.forEach((kpi, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      kpiSlide.addShape(pptxgenjs.default.ShapeType.roundRect, {
        x: 0.5 + col * 3.5, y: 1.2 + row * 2, w: 3, h: 1.5,
        fill: { color: 'F0F0FF' }, rectRadius: 0.1,
      });
      kpiSlide.addText(kpi.value, { x: 0.5 + col * 3.5, y: 1.3 + row * 2, w: 3, fontSize: 28, bold: true, align: 'center', color: '333399' });
      kpiSlide.addText(kpi.label, { x: 0.5 + col * 3.5, y: 2.1 + row * 2, w: 3, fontSize: 11, align: 'center', color: '888888' });
    });

    // Trends
    addSlide('Trend Analysis', report.trends.map(t => `${t.col}: ${t.direction} (${t.change > 0 ? '+' : ''}${t.change}%)`));

    // Positives
    addSlide('✅ Positive Findings', report.positives.length ? report.positives : ['All metrics remain stable'], { color: '22C55E' });

    // Risks
    addSlide('⚠️ Risks & Concerns', report.risks, { color: 'EF4444' });

    // Opportunities
    addSlide('🟢 Opportunities', report.opportunities, { color: '0EA5E9' });

    // Recommendations
    addSlide('💡 Recommended Strategy', report.recommendations);

    // Data Quality
    addSlide('🛡 Data Quality', [
      report.qualityScore !== undefined ? `Score: ${report.qualityScore}%` : 'Not scanned',
      report.qualityIssues !== undefined ? `${report.qualityIssues} issues detected` : '',
    ].filter(Boolean));

    const blob = await pptx.write({ outputType: 'blob' }) as Blob;
    saveAs(blob, `${report.title.replace(/\s+/g, '-').toLowerCase()}.pptx`);
    toast({ title: 'PowerPoint Exported', description: 'Presentation downloaded successfully.' });
  } catch (e) {
    console.error('PPTX export error:', e);
    toast({ title: 'Export Failed', variant: 'destructive' });
  }
}

export async function exportDOCX(report: ReportData) {
  try {
    const docxLib = await import('docx');
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = docxLib;

    const makeParagraph = (text: string, options?: { bold?: boolean; color?: string; size?: number; heading?: any; spacing?: number }) => {
      return new Paragraph({
        heading: options?.heading,
        spacing: { after: options?.spacing ?? 120 },
        children: [new TextRun({ text, bold: options?.bold, color: options?.color || '333333', size: options?.size || 22 })],
      });
    };

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [new TextRun({ text: report.title, bold: true, size: 48, color: '333399' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: `Generated: ${report.generatedDate} • By: ${report.userName}`, size: 20, color: '888888' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [new TextRun({ text: `Dataset: ${report.datasetName} • ${report.rowCount.toLocaleString()} rows • ${report.columnCount} columns`, size: 18, color: 'AAAAAA' })],
          }),

          // Executive Summary
          makeParagraph('Executive Summary', { bold: true, size: 32, heading: HeadingLevel.HEADING_1, color: '333399' }),
          makeParagraph(report.aiSummary, { size: 22 }),

          // KPIs
          makeParagraph('Key Performance Indicators', { bold: true, size: 28, heading: HeadingLevel.HEADING_2, spacing: 300 }),
          ...report.kpis.map(k => makeParagraph(`${k.label}: ${k.value}`, { size: 22 })),

          // Trends
          makeParagraph('Trend Analysis', { bold: true, size: 28, heading: HeadingLevel.HEADING_2, spacing: 300 }),
          ...report.trends.map(t => makeParagraph(
            `${t.col}: ${t.direction} (${t.change > 0 ? '+' : ''}${t.change}%)`,
            { color: t.change > 1 ? '22C55E' : t.change < -1 ? 'EF4444' : '888888' }
          )),

          // Positives
          makeParagraph('Positive Findings', { bold: true, size: 28, heading: HeadingLevel.HEADING_2, spacing: 300, color: '22C55E' }),
          ...(report.positives.length ? report.positives : ['Metrics stable']).map(p => makeParagraph(`✓ ${p}`, { color: '22C55E' })),

          // Risks
          makeParagraph('Risks & Concerns', { bold: true, size: 28, heading: HeadingLevel.HEADING_2, spacing: 300, color: 'EF4444' }),
          ...report.risks.map(r => makeParagraph(`⚠ ${r}`, { color: 'EF4444' })),

          // Opportunities
          makeParagraph('Opportunities', { bold: true, size: 28, heading: HeadingLevel.HEADING_2, spacing: 300, color: '0EA5E9' }),
          ...report.opportunities.map(o => makeParagraph(`→ ${o}`, { color: '0EA5E9' })),

          // Recommendations
          makeParagraph('Recommendations', { bold: true, size: 28, heading: HeadingLevel.HEADING_2, spacing: 300 }),
          ...report.recommendations.map(r => makeParagraph(`→ ${r}`)),

          // Quality
          makeParagraph('Data Quality', { bold: true, size: 28, heading: HeadingLevel.HEADING_2, spacing: 300 }),
          makeParagraph(
            report.qualityScore !== undefined
              ? `Score: ${report.qualityScore}% • ${report.qualityIssues || 0} issues`
              : 'Data quality scan not performed.',
          ),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${report.title.replace(/\s+/g, '-').toLowerCase()}.docx`);
    toast({ title: 'Word Document Exported', description: 'Report downloaded successfully.' });
  } catch (e) {
    console.error('DOCX export error:', e);
    toast({ title: 'Export Failed', variant: 'destructive' });
  }
}
