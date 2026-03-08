// DataPulse — Rich DOCX Export with Storytelling
import { saveAs } from 'file-saver';
import { toast } from '@/hooks/use-toast';
import { getTemplate, type TemplateId } from './reportTemplates';
import { buildReportStats, generateNarrative } from './reportNarrativeBuilder';

export async function exportRichDOCX(
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
    const docxLib = await import('docx');
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } = docxLib;

    const accentHex = tpl.colors[1].replace('#', '');
    const primaryHex = tpl.colors[0].replace('#', '');

    const heading = (text: string, level: any = HeadingLevel.HEADING_1, color = primaryHex) =>
      new Paragraph({ heading: level, spacing: { before: 400, after: 200 }, children: [new TextRun({ text, bold: true, size: level === HeadingLevel.HEADING_1 ? 36 : 28, color })] });

    const body = (text: string, opts?: { bold?: boolean; color?: string; spacing?: number; italic?: boolean }) =>
      new Paragraph({
        spacing: { after: opts?.spacing ?? 160 },
        children: [new TextRun({ text, size: 22, color: opts?.color || '444444', bold: opts?.bold, italics: opts?.italic })],
      });

    const narrativeParagraphs = (text: string) =>
      text.split('\n').filter(Boolean).map(line => body(line, { spacing: 180 }));

    const bulletItem = (text: string, color = '444444') =>
      new Paragraph({ spacing: { after: 100 }, indent: { left: 360 }, children: [new TextRun({ text: `•  ${text}`, size: 21, color })] });

    const separator = () => new Paragraph({
      spacing: { before: 200, after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' } },
      children: [new TextRun({ text: '', size: 2 })],
    });

    // Build sections
    const children: any[] = [];

    // Cover Page
    children.push(
      new Paragraph({ spacing: { before: 600 }, children: [] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: stats.title, bold: true, size: 56, color: primaryHex })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: 'Data Intelligence Report', size: 28, color: accentHex, bold: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: `Template: ${tpl.name}`, size: 20, color: '999999' })] }),
      separator(),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: `Generated: ${stats.date}  •  Analyst: ${stats.userName}`, size: 20, color: '888888' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: `Dataset: ${stats.datasetName}  •  ${stats.rowCount.toLocaleString()} records  •  ${stats.columnCount} columns`, size: 18, color: 'AAAAAA' })] }),
      new Paragraph({ spacing: { after: 600 }, children: [] }),
      separator(),
    );

    // Table of Contents placeholder
    children.push(
      heading('Table of Contents', HeadingLevel.HEADING_1),
      body('1. Executive Summary'),
      body('2. Dataset Overview'),
      body('3. Data Quality Analysis'),
      body('4. KPI Performance Analysis'),
      body('5. Trends & Patterns'),
      body('6. Positive Findings'),
      body('7. Risks & Concerns'),
      body('8. Deep Insights'),
      body('9. Strategic Recommendations'),
      body('10. Appendix — Data Table'),
      separator(),
    );

    // Section 1: Executive Summary
    children.push(
      heading('1. Executive Summary'),
      ...narrativeParagraphs(generateNarrative('executive-summary', stats, tpl.tone)),
      separator(),
    );

    // Section 2: Dataset Overview
    children.push(
      heading('2. Dataset Overview'),
      ...narrativeParagraphs(generateNarrative('dataset-overview', stats, tpl.tone)),
      body(''),
      heading('Column Profile', HeadingLevel.HEADING_2),
    );
    stats.columnStats.forEach(col => {
      children.push(body(`${col.name} (${col.type})${col.mean !== undefined ? ` — Mean: ${col.mean}, Median: ${col.median}, Std: ${col.std}, Range: ${col.min}–${col.max}` : ` — ${col.uniqueCount} unique values`}${col.missingPct ? `, Missing: ${col.missingPct}%` : ''}`, { spacing: 100 }));
    });
    children.push(separator());

    // Section 3: Data Quality
    children.push(
      heading('3. Data Quality Analysis'),
      ...narrativeParagraphs(generateNarrative('quality', stats, tpl.tone)),
      separator(),
    );

    // Section 4: KPI Analysis
    children.push(
      heading('4. KPI Performance Analysis'),
      ...narrativeParagraphs(generateNarrative('kpi-analysis', stats, tpl.tone)),
      body(''),
      heading('Key Metrics', HeadingLevel.HEADING_2),
    );
    stats.kpis.forEach(kpi => {
      children.push(bulletItem(`${kpi.label}: ${kpi.value}`));
    });
    children.push(separator());

    // Section 5: Trends
    children.push(
      heading('5. Trends & Patterns'),
      ...narrativeParagraphs(generateNarrative('trends', stats, tpl.tone)),
      body(''),
      heading('Trend Summary', HeadingLevel.HEADING_2),
    );
    stats.trends.forEach(t => {
      const color = t.change > 1 ? '22C55E' : t.change < -1 ? 'EF4444' : '888888';
      children.push(bulletItem(`${t.col}: ${t.direction} (${t.change > 0 ? '+' : ''}${t.change}%)`, color));
    });
    children.push(separator());

    // Section 6: Positive Findings
    children.push(
      heading('6. Positive Findings', HeadingLevel.HEADING_1, '22C55E'),
      ...narrativeParagraphs(generateNarrative('positives', stats, tpl.tone)),
    );
    (stats.positives.length ? stats.positives : ['All metrics stable']).forEach(p => children.push(bulletItem(p, '22C55E')));
    children.push(separator());

    // Section 7: Risks & Concerns
    children.push(
      heading('7. Risks & Concerns', HeadingLevel.HEADING_1, 'EF4444'),
      ...narrativeParagraphs(generateNarrative('negatives', stats, tpl.tone)),
    );
    stats.risks.forEach(r => children.push(bulletItem(r, 'EF4444')));
    children.push(separator());

    // Section 8: Deep Insights
    children.push(
      heading('8. Deep Insights — AI-Generated Intelligence'),
      ...narrativeParagraphs(generateNarrative('deep-insights', stats, tpl.tone)),
      separator(),
    );

    // Section 9: Recommendations
    children.push(
      heading('9. Strategic Recommendations'),
      ...narrativeParagraphs(generateNarrative('recommendations', stats, tpl.tone)),
    );
    stats.recommendations.forEach(r => children.push(bulletItem(r, primaryHex)));
    children.push(separator());

    // Section 10: Data Table Appendix
    children.push(heading('10. Appendix — Data Table (Top 30 Records)'));
    if (data.length > 0) {
      const headers = Object.keys(data[0]).slice(0, 8);
      const rows = data.slice(0, 30);
      const table = new Table({
        rows: [
          new TableRow({
            tableHeader: true,
            children: headers.map(h => new TableCell({
              width: { size: Math.floor(9000 / headers.length), type: WidthType.DXA },
              shading: { type: ShadingType.SOLID, color: primaryHex },
              children: [new Paragraph({ children: [new TextRun({ text: h.substring(0, 18), bold: true, size: 16, color: 'FFFFFF' })] })],
            })),
          }),
          ...rows.map(row => new TableRow({
            children: headers.map(h => new TableCell({
              width: { size: Math.floor(9000 / headers.length), type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: String(row[h] ?? '').substring(0, 20), size: 15, color: '555555' })] })],
            })),
          })),
        ],
      });
      children.push(table);
    }

    // Footer note
    children.push(
      separator(),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, children: [new TextRun({ text: `Report generated by DataPulse AI  •  ${tpl.name} Template  •  ${stats.date}`, size: 16, color: 'BBBBBB', italics: true })] }),
    );

    const doc = new Document({ sections: [{ properties: {}, children }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${stats.title.replace(/\s+/g, '-').toLowerCase()}.docx`);
    toast({ title: 'Word Document Exported', description: 'Professional report downloaded successfully.' });
  } catch (e) {
    console.error('DOCX export error:', e);
    toast({ title: 'Export Failed', description: 'Could not generate Word document.', variant: 'destructive' });
  }
}
