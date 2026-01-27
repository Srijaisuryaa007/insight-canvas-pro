import { useCallback } from 'react';
import { useSubscription } from './useSubscription';
import { toast } from '@/hooks/use-toast';

export function useExport() {
  const { consumeCredits, isFeatureAvailable } = useSubscription();

  // Export data as CSV
  const exportCSV = useCallback((data: Record<string, unknown>[], filename: string = 'export') => {
    if (!consumeCredits('export-csv')) return false;

    try {
      if (!data || data.length === 0) {
        toast({ title: 'No data to export', variant: 'destructive' });
        return false;
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => {
          const val = row[h];
          const str = val === null || val === undefined ? '' : String(val);
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast({ title: 'CSV Exported', description: `${filename}.csv downloaded successfully.` });
      return true;
    } catch (error) {
      console.error('CSV export error:', error);
      toast({ title: 'Export Failed', variant: 'destructive' });
      return false;
    }
  }, [consumeCredits]);

  // Export chart as PNG using html2canvas
  const exportPNG = useCallback(async (elementId: string, filename: string = 'chart') => {
    if (!consumeCredits('export-png')) return false;

    try {
      const element = document.getElementById(elementId);
      if (!element) {
        toast({ title: 'Chart not found', variant: 'destructive' });
        return false;
      }

      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2
      });

      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast({ title: 'PNG Exported', description: `${filename}.png downloaded successfully.` });
      return true;
    } catch (error) {
      console.error('PNG export error:', error);
      toast({ title: 'Export Failed', variant: 'destructive' });
      return false;
    }
  }, [consumeCredits]);

  // Export as PDF
  const exportPDF = useCallback(async (
    content: { title: string; sections: Array<{ title: string; elementId?: string; data?: Record<string, unknown>[] }> },
    filename: string = 'report'
  ) => {
    if (!isFeatureAvailable('export-pdf')) {
      toast({ title: 'PDF Export requires Pro plan', variant: 'destructive' });
      return false;
    }

    if (!consumeCredits('export-pdf')) return false;

    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yOffset = margin;

      // Title
      pdf.setFontSize(24);
      pdf.text(content.title, margin, yOffset);
      yOffset += 15;

      // Date
      pdf.setFontSize(10);
      pdf.setTextColor(128);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yOffset);
      pdf.setTextColor(0);
      yOffset += 15;

      for (const section of content.sections) {
        // Section title
        pdf.setFontSize(14);
        pdf.text(section.title, margin, yOffset);
        yOffset += 10;

        // Chart screenshot
        if (section.elementId) {
          const element = document.getElementById(section.elementId);
          if (element) {
            const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = pageWidth - 2 * margin;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            if (yOffset + imgHeight > pageHeight - margin) {
              pdf.addPage();
              yOffset = margin;
            }

            pdf.addImage(imgData, 'PNG', margin, yOffset, imgWidth, imgHeight);
            yOffset += imgHeight + 10;
          }
        }

        // Data table
        if (section.data && section.data.length > 0) {
          const headers = Object.keys(section.data[0]);
          const rows = section.data.slice(0, 20); // Limit to 20 rows

          pdf.setFontSize(8);
          const colWidth = (pageWidth - 2 * margin) / headers.length;

          // Header row
          headers.forEach((h, i) => {
            pdf.text(h.substring(0, 15), margin + i * colWidth, yOffset);
          });
          yOffset += 5;

          // Data rows
          rows.forEach(row => {
            if (yOffset > pageHeight - margin) {
              pdf.addPage();
              yOffset = margin;
            }
            headers.forEach((h, i) => {
              const val = String(row[h] ?? '').substring(0, 15);
              pdf.text(val, margin + i * colWidth, yOffset);
            });
            yOffset += 4;
          });
          yOffset += 10;
        }
      }

      pdf.save(`${filename}.pdf`);
      toast({ title: 'PDF Exported', description: `${filename}.pdf downloaded successfully.` });
      return true;
    } catch (error) {
      console.error('PDF export error:', error);
      toast({ title: 'Export Failed', variant: 'destructive' });
      return false;
    }
  }, [consumeCredits, isFeatureAvailable]);

  return {
    exportCSV,
    exportPNG,
    exportPDF,
    canExportPDF: isFeatureAvailable('export-pdf')
  };
}
