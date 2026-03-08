// DataPulse — Formal DOCX Export (no colors, clean typography)
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

    const BLACK = '1A1A1A';
    const DARK = '333333';
    const BODY_COLOR = '444444';
    const MUTED_COLOR = '888888';

    const heading = (text: string, level: any = HeadingLevel.HEADING_1) =>
      new Paragraph({
        heading: level,
        spacing: { before: 400, after: 200 },
        children: [new TextRun({ text, bold: true, size: level === HeadingLevel.HEADING_1 ? 34 : 26, color: BLACK, font: 'Arial' })],
      });

    const body = (text: string, opts?: { bold?: boolean; spacing?: number; italic?: boolean }) =>
      new Paragraph({
        spacing: { after: opts?.spacing ?? 160 },
        children: [new TextRun({ text, size: 22, color: BODY_COLOR, bold: opts?.bold, italics: opts?.italic, font: 'Arial' })],
      });

    const narrativeParagraphs = (text: string) =>
      text.split('\n').filter(Boolean).map(line => body(line, { spacing: 180 }));

    const bulletItem = (text: string) =>
      new Paragraph({
        spacing: { after: 100 },
        indent: { left: 360 },
        children: [new TextRun({ text: `-  ${text}`, size: 21, color: DARK, font: 'Arial' })],
      });

    const separator = () => new Paragraph({
      spacing: { before: 200, after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
      children: [new TextRun({ text: '', size: 2 })],
    });

    const children: any[] = [];

    // ─── Cover Page ──────────────────────────────────
    children.push(
      new Paragraph({ spacing: { before: 800 }, children: [] }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 200 },
        children: [new TextRun({ text: stats.title, bold: true, size: 52, color: BLACK, font: 'Arial' })],
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 100 },
        children: [new TextRun({ text: 'Data Intelligence Report', size: 26, color: DARK, bold: true, font: 'Arial' })],
      }),
      separator(),
      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: `Date: ${stats.date}  |  Analyst: ${stats.userName}`, size: 20, color: MUTED_COLOR, font: 'Arial' })],
      }),
      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: `Dataset: ${stats.datasetName}  |  ${stats.rowCount.toLocaleString()} records  |  ${stats.columnCount} columns`, size: 18, color: MUTED_COLOR, font: 'Arial' })],
      }),
      new Paragraph({ spacing: { after: 600 }, children: [] }),
      separator(),
    );

    // ─── Table of Contents ───────────────────────────
    children.push(
      heading('Table of Contents'),
      body('1. Executive Summary'),
      body('2. Dataset Overview'),
      body('3. Data Quality'),
      body('4. Key Performance Indicators'),
      body('5. Trend Analysis'),
      body('6. Strengths'),
      body('7. Risks and Issues'),
      body('8. Analytical Insights'),
      body('9. Recommendations'),
      body('10. Appendix: Data Sample'),
      separator(),
    );

    // ─── Section 1: Executive Summary ────────────────
    children.push(heading('1. Executive Summary'), ...narrativeParagraphs(generateNarrative('executive-summary', stats, tpl.tone)), separator());

    // ─── Section 2: Dataset Overview ─────────────────
    children.push(heading('2. Dataset Overview'), ...narrativeParagraphs(generateNarrative('dataset-overview', stats, tpl.tone)), body(''));
    children.push(heading('Column Profile', HeadingLevel.HEADING_2));
    stats.columnStats.forEach(col => {
      children.push(body(
        `${col.name} (${col.type})${col.mean !== undefined ? ` — Mean: ${col.mean}, Median: ${col.median}, Std: ${col.std}, Range: ${col.min}-${col.max}` : ` — ${col.uniqueCount} unique values`}${col.missingPct ? `, Missing: ${col.missingPct}%` : ''}`,
        { spacing: 100 },
      ));
    });
    children.push(separator());

    // ─── Section 3: Data Quality ─────────────────────
    children.push(heading('3. Data Quality'), ...narrativeParagraphs(generateNarrative('quality', stats, tpl.tone)), separator());

    // ─── Section 4: KPIs ─────────────────────────────
    children.push(heading('4. Key Performance Indicators'), ...narrativeParagraphs(generateNarrative('kpi-analysis', stats, tpl.tone)), body(''));
    children.push(heading('Metrics', HeadingLevel.HEADING_2));
    stats.kpis.forEach(kpi => { children.push(bulletItem(`${kpi.label}: ${kpi.value}`)); });
    children.push(separator());

    // ─── Section 5: Trends ───────────────────────────
    children.push(heading('5. Trend Analysis'), ...narrativeParagraphs(generateNarrative('trends', stats, tpl.tone)), body(''));
    children.push(heading('Trend Summary', HeadingLevel.HEADING_2));
    stats.trends.forEach(t => {
      children.push(bulletItem(`${t.col}: ${t.direction} (${t.change > 0 ? '+' : ''}${t.change}%)`));
    });
    children.push(separator());

    // ─── Section 6: Strengths ────────────────────────
    children.push(heading('6. Strengths'), ...narrativeParagraphs(generateNarrative('positives', stats, tpl.tone)));
    (stats.positives.length ? stats.positives : ['All metrics within expected ranges.']).forEach(p => children.push(bulletItem(p)));
    children.push(separator());

    // ─── Section 7: Risks ────────────────────────────
    children.push(heading('7. Risks and Issues'), ...narrativeParagraphs(generateNarrative('negatives', stats, tpl.tone)));
    stats.risks.forEach(r => children.push(bulletItem(r)));
    children.push(separator());

    // ─── Section 8: Insights ─────────────────────────
    children.push(heading('8. Analytical Insights'), ...narrativeParagraphs(generateNarrative('deep-insights', stats, tpl.tone)), separator());

    // ─── Section 9: Recommendations ──────────────────
    children.push(heading('9. Recommendations'), ...narrativeParagraphs(generateNarrative('recommendations', stats, tpl.tone)));
    stats.recommendations.forEach(r => children.push(bulletItem(r)));
    children.push(separator());

    // ─── Section 10: Data Table ──────────────────────
    children.push(heading('10. Appendix: Data Sample (First 30 Records)'));
    if (data.length > 0) {
      const headers = Object.keys(data[0]).slice(0, 8);
      const rows = data.slice(0, 30);
      const table = new Table({
        rows: [
          new TableRow({
            tableHeader: true,
            children: headers.map(h => new TableCell({
              width: { size: Math.floor(9000 / headers.length), type: WidthType.DXA },
              shading: { type: ShadingType.SOLID, color: DARK },
              children: [new Paragraph({ children: [new TextRun({ text: h.substring(0, 18), bold: true, size: 16, color: 'FFFFFF', font: 'Arial' })] })],
            })),
          }),
          ...rows.map(row => new TableRow({
            children: headers.map(h => new TableCell({
              width: { size: Math.floor(9000 / headers.length), type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: String(row[h] ?? '').substring(0, 22), size: 15, color: BODY_COLOR, font: 'Arial' })] })],
            })),
          })),
        ],
      });
      children.push(table);
    }

    // ─── Footer ──────────────────────────────────────
    children.push(
      separator(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [new TextRun({ text: `Report generated by DataVora  |  ${stats.date}`, size: 16, color: MUTED_COLOR, italics: true, font: 'Arial' })],
      }),
    );

    const doc = new Document({ sections: [{ properties: {}, children }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${stats.title.replace(/\s+/g, '-').toLowerCase()}.docx`);
    toast({ title: 'Document Exported', description: 'Formal report downloaded.' });
  } catch (e) {
    console.error('DOCX export error:', e);
    toast({ title: 'Export Failed', description: 'Could not generate document.', variant: 'destructive' });
  }
}
