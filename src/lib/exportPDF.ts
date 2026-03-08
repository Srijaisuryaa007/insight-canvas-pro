// DataPulse — Rich PDF Export with Storytelling
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
    const margin = 20;
    let y = margin;

    const hexToRgb = (hex: string): [number, number, number] => {
      const h = hex.replace('#', '');
      return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
    };

    const priRgb = hexToRgb(tpl.colors[0]);
    const accRgb = hexToRgb(tpl.colors[1]);

    const ensureSpace = (needed: number) => {
      if (y + needed > ph - 15) { pdf.addPage(); y = margin; }
    };

    const addText = (text: string, size: number, color: [number, number, number] = [60, 60, 60], bold = false) => {
      pdf.setFontSize(size);
      pdf.setTextColor(...color);
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      const lines = pdf.splitTextToSize(text, pw - 2 * margin);
      const lineHeight = size * 0.42;
      ensureSpace(lines.length * lineHeight + 4);
      pdf.text(lines, margin, y);
      y += lines.length * lineHeight + 3;
    };

    const addSectionTitle = (text: string) => {
      ensureSpace(20);
      y += 4;
      // Accent bar
      pdf.setFillColor(...accRgb);
      pdf.rect(margin, y - 2, 40, 1.5, 'F');
      y += 6;
      addText(text, 16, priRgb, true);
      y += 2;
    };

    const addNarrative = (text: string) => {
      text.split('\n').filter(Boolean).forEach(para => {
        addText(para, 10, [70, 70, 70]);
        y += 1;
      });
    };

    const addBullets = (items: string[], color: [number, number, number] = [70, 70, 70]) => {
      items.forEach(item => {
        addText(`  •  ${item}`, 9.5, color);
      });
    };

    // PAGE 1 — Cover
    y = 60;
    pdf.setFillColor(...priRgb);
    pdf.rect(0, 0, pw, 8, 'F');
    pdf.setFillColor(...accRgb);
    pdf.rect(margin, 55, 50, 2, 'F');
    y = 65;
    addText(stats.title, 28, priRgb, true);
    y += 4;
    addText('Data Intelligence Report', 14, accRgb, true);
    y += 6;
    addText(`Template: ${tpl.name}`, 10, [150, 150, 150]);
    addText(`Generated: ${stats.date}  •  Analyst: ${stats.userName}`, 10, [150, 150, 150]);
    addText(`Dataset: ${stats.datasetName}  •  ${stats.rowCount.toLocaleString()} records  •  ${stats.columnCount} columns`, 10, [150, 150, 150]);

    // PAGE 2+ — Executive Summary
    pdf.addPage(); y = margin;
    addSectionTitle('1. Executive Summary');
    addNarrative(generateNarrative('executive-summary', stats, tpl.tone));

    // Dataset Overview
    addSectionTitle('2. Dataset Overview');
    addNarrative(generateNarrative('dataset-overview', stats, tpl.tone));

    // Data Quality
    addSectionTitle('3. Data Quality Analysis');
    addNarrative(generateNarrative('quality', stats, tpl.tone));

    // KPIs
    addSectionTitle('4. KPI Performance');
    addNarrative(generateNarrative('kpi-analysis', stats, tpl.tone));
    y += 2;
    stats.kpis.forEach(kpi => { addText(`${kpi.label}: ${kpi.value}`, 10, [50, 50, 50], true); });

    // Trends
    addSectionTitle('5. Trends & Patterns');
    addNarrative(generateNarrative('trends', stats, tpl.tone));
    y += 2;
    stats.trends.forEach(t => {
      const color: [number, number, number] = t.change > 1 ? [34, 197, 94] : t.change < -1 ? [239, 68, 68] : [150, 150, 150];
      addText(`${t.col}: ${t.direction} (${t.change > 0 ? '+' : ''}${t.change}%)`, 9.5, color);
    });

    // Positive Findings
    addSectionTitle('6. Positive Findings');
    addNarrative(generateNarrative('positives', stats, tpl.tone));
    addBullets(stats.positives.length ? stats.positives : ['All metrics stable'], [34, 150, 70]);

    // Risks
    addSectionTitle('7. Risks & Concerns');
    addNarrative(generateNarrative('negatives', stats, tpl.tone));
    addBullets(stats.risks, [200, 50, 50]);

    // Deep Insights
    addSectionTitle('8. Deep Insights');
    addNarrative(generateNarrative('deep-insights', stats, tpl.tone));

    // Recommendations
    addSectionTitle('9. Strategic Recommendations');
    addNarrative(generateNarrative('recommendations', stats, tpl.tone));
    addBullets(stats.recommendations, priRgb);

    // Data Table
    if (data.length > 0) {
      addSectionTitle('10. Appendix — Data Table');
      const headers = Object.keys(data[0]).slice(0, 7);
      const rows = data.slice(0, 20);
      const colW = (pw - 2 * margin) / headers.length;
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...priRgb);
      ensureSpace(10);
      headers.forEach((h, i) => { pdf.text(h.substring(0, 14), margin + i * colW, y); });
      y += 4;
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(80, 80, 80);
      rows.forEach(row => {
        ensureSpace(5);
        headers.forEach((h, i) => { pdf.text(String(row[h] ?? '').substring(0, 14), margin + i * colW, y); });
        y += 3.5;
      });
    }

    // Footers
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(7);
      pdf.setTextColor(180, 180, 180);
      pdf.text(`DataPulse Analytics  •  ${tpl.name}  •  Page ${i} of ${totalPages}`, margin, ph - 8);
    }

    pdf.save(`${stats.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    toast({ title: 'PDF Exported', description: 'Professional report downloaded successfully.' });
  } catch (e) {
    console.error('PDF export error:', e);
    toast({ title: 'Export Failed', description: 'Could not generate PDF.', variant: 'destructive' });
  }
}
