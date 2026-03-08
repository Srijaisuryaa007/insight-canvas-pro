// DataPulse — Formal PDF Export (no colors, white background, legible text)
import { toast } from '@/hooks/use-toast';
import { getTemplate, type TemplateId } from './reportTemplates';
import { buildReportStats, generateNarrative } from './reportNarrativeBuilder';

export async function exportRichPDF(
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
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const margin = 22;
    let y = margin;

    const BLACK: [number, number, number] = [26, 26, 26];
    const DARK: [number, number, number] = [50, 50, 50];
    const BODY: [number, number, number] = [60, 60, 60];
    const MUTED: [number, number, number] = [120, 120, 120];
    const LIGHT: [number, number, number] = [170, 170, 170];

    const ensureSpace = (needed: number) => {
      if (y + needed > ph - 18) { pdf.addPage(); y = margin; }
    };

    const addText = (text: string, size: number, color: [number, number, number] = BODY, bold = false) => {
      pdf.setFontSize(size);
      pdf.setTextColor(...color);
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      const lines = pdf.splitTextToSize(text, pw - 2 * margin);
      const lineHeight = size * 0.42;
      ensureSpace(lines.length * lineHeight + 4);
      pdf.text(lines, margin, y);
      y += lines.length * lineHeight + 3;
    };

    const addSection = (text: string) => {
      ensureSpace(18);
      y += 6;
      pdf.setDrawColor(26, 26, 26);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y - 2, margin + 25, y - 2);
      y += 4;
      addText(text, 15, BLACK, true);
      y += 2;
    };

    const addNarrative = (text: string) => {
      text.split('\n').filter(Boolean).forEach(para => {
        addText(para, 10, BODY);
        y += 1;
      });
    };

    const addBullets = (items: string[]) => {
      items.forEach(item => {
        addText(`  -  ${item}`, 9.5, DARK);
      });
    };

    // ─── PAGE 1: Title ───────────────────────────────
    y = 55;
    addText(stats.title, 26, BLACK, true);
    y += 6;
    pdf.setDrawColor(26, 26, 26);
    pdf.setLineWidth(0.4);
    pdf.line(margin, y, margin + 30, y);
    y += 8;
    addText('Data Intelligence Report', 13, DARK, true);
    y += 8;
    addText(`Date: ${stats.date}`, 10, MUTED);
    addText(`Dataset: ${stats.datasetName}`, 10, MUTED);
    addText(`Records: ${stats.rowCount.toLocaleString()}  |  Columns: ${stats.columnCount}`, 10, MUTED);
    addText(`Prepared by: ${stats.userName}`, 10, MUTED);

    // ─── Executive Summary ───────────────────────────
    pdf.addPage(); y = margin;
    addSection('1. Executive Summary');
    addNarrative(generateNarrative('executive-summary', stats, tpl.tone));

    // ─── Dataset Overview ────────────────────────────
    addSection('2. Dataset Overview');
    addNarrative(generateNarrative('dataset-overview', stats, tpl.tone));

    // ─── Data Quality ────────────────────────────────
    addSection('3. Data Quality');
    addNarrative(generateNarrative('quality', stats, tpl.tone));

    // ─── KPIs ────────────────────────────────────────
    addSection('4. Key Performance Indicators');
    addNarrative(generateNarrative('kpi-analysis', stats, tpl.tone));
    y += 2;
    stats.kpis.forEach(kpi => {
      addText(`${kpi.label}: ${kpi.value}`, 10, DARK, true);
    });

    // ─── Trends ──────────────────────────────────────
    addSection('5. Trend Analysis');
    addNarrative(generateNarrative('trends', stats, tpl.tone));
    y += 2;
    stats.trends.forEach(t => {
      addText(`${t.col}: ${t.direction} (${t.change > 0 ? '+' : ''}${t.change}%)`, 9.5, DARK);
    });

    // ─── Strengths ───────────────────────────────────
    addSection('6. Strengths');
    addNarrative(generateNarrative('positives', stats, tpl.tone));
    addBullets(stats.positives.length ? stats.positives : ['All metrics within expected ranges.']);

    // ─── Risks ───────────────────────────────────────
    addSection('7. Risks and Issues');
    addNarrative(generateNarrative('negatives', stats, tpl.tone));
    addBullets(stats.risks);

    // ─── Insights ────────────────────────────────────
    addSection('8. Analytical Insights');
    addNarrative(generateNarrative('deep-insights', stats, tpl.tone));

    // ─── Recommendations ─────────────────────────────
    addSection('9. Recommendations');
    addNarrative(generateNarrative('recommendations', stats, tpl.tone));
    addBullets(stats.recommendations);

    // ─── Data Table ──────────────────────────────────
    if (data.length > 0) {
      addSection('10. Appendix: Data Sample');
      const headers = Object.keys(data[0]).slice(0, 7);
      const rows = data.slice(0, 25);
      const colW = (pw - 2 * margin) / headers.length;

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...BLACK);
      ensureSpace(10);
      headers.forEach((h, i) => { pdf.text(h.substring(0, 14), margin + i * colW, y); });
      y += 4;
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.2);
      pdf.line(margin, y - 2, pw - margin, y - 2);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...BODY);
      rows.forEach(row => {
        ensureSpace(5);
        pdf.setFontSize(6.5);
        headers.forEach((h, i) => { pdf.text(String(row[h] ?? '').substring(0, 16), margin + i * colW, y); });
        y += 3.5;
      });
    }

    // ─── Footers ─────────────────────────────────────
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(7);
      pdf.setTextColor(...LIGHT);
      pdf.text(`DataVora  |  Page ${i} of ${totalPages}`, margin, ph - 10);
    }

    pdf.save(`${stats.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    toast({ title: 'PDF Exported', description: 'Formal report downloaded.' });
  } catch (e) {
    console.error('PDF export error:', e);
    toast({ title: 'Export Failed', description: 'Could not generate PDF.', variant: 'destructive' });
  }
}
