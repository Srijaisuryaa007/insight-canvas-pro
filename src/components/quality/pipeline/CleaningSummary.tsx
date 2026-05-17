import { useEffect, useState } from 'react';
import { type Row, computeQualityScore, toCSV } from '@/lib/cleaningEngine';
import { Button } from '@/components/ui/button';
import { Download, FileText, Undo2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { toast } from '@/hooks/use-toast';

export interface CleaningSummaryProps {
  original: Row[];
  cleaned: Row[];
  datasetName: string;
  onUndo: () => void;
}

function useAnimatedNum(target: number, ms = 800) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function CleaningSummary({ original, cleaned, datasetName, onUndo }: CleaningSummaryProps) {
  const before = computeQualityScore(original);
  const after = computeQualityScore(cleaned);
  const animated = useAnimatedNum(after.score);

  const rows = [
    { issue: 'Missing values', before: -before.breakdown.missing, after: -after.breakdown.missing },
    { issue: 'Duplicate rows', before: -before.breakdown.duplicates, after: -after.breakdown.duplicates },
    { issue: 'Type errors', before: -before.breakdown.typeErrors, after: -after.breakdown.typeErrors },
    { issue: 'Outliers flagged', before: -before.breakdown.outliers, after: -after.breakdown.outliers },
    { issue: 'Clean column names', before: before.breakdown.cleanNames, after: after.breakdown.cleanNames },
  ];

  const downloadCSV = () => {
    const blob = new Blob([toCSV(cleaned)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${datasetName.replace(/[^a-z0-9]+/gi, '_')}_cleaned.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'CSV downloaded' });
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text('Data Cleaning Report', 14, 20);
    doc.setFontSize(11); doc.text(`Dataset: ${datasetName}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);
    doc.setFontSize(14); doc.text('Quality Score', 14, 50);
    doc.setFontSize(11); doc.text(`Before: ${before.score}/100`, 14, 58);
    doc.text(`After:  ${after.score}/100   (${after.score - before.score >= 0 ? '+' : ''}${after.score - before.score} pts)`, 14, 64);
    doc.setFontSize(14); doc.text('Issue Breakdown', 14, 80);
    doc.setFontSize(10);
    let y = 90;
    rows.forEach((r) => {
      doc.text(`${r.issue.padEnd(28, ' ')}  before: ${r.before}   after: ${r.after}`, 14, y);
      y += 6;
    });
    y += 6;
    doc.text(`Rows: ${original.length.toLocaleString()} → ${cleaned.length.toLocaleString()}`, 14, y);
    doc.save(`${datasetName.replace(/[^a-z0-9]+/gi, '_')}_cleaning_report.pdf`);
    toast({ title: 'PDF report downloaded' });
  };

  const delta = after.score - before.score;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="text-xs text-muted-foreground mb-1">Quality Score</div>
        <div className="flex items-end gap-3">
          <div className="text-4xl font-semibold">{animated}<span className="text-muted-foreground text-lg">/100</span></div>
          <div className={`text-sm mb-1 ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {before.score} → {after.score} ({delta >= 0 ? '+' : ''}{delta} pts)
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-500 via-primary to-emerald-500 transition-all" style={{ width: `${animated}%` }} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr><th className="px-3 py-2 text-left">Issue</th><th className="px-3 py-2 text-right">Before (pts)</th><th className="px-3 py-2 text-right">After (pts)</th><th className="px-3 py-2 text-center">Status</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const improved = r.after <= r.before;
              return (
                <tr key={r.issue} className="border-t border-border">
                  <td className="px-3 py-2">{r.issue}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.before}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.after}</td>
                  <td className="px-3 py-2 text-center">{improved ? '✓' : '⚠'}</td>
                </tr>
              );
            })}
            <tr className="border-t border-border bg-secondary/40">
              <td className="px-3 py-2 font-medium">Rows</td>
              <td className="px-3 py-2 text-right font-mono">{original.length.toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-mono">{cleaned.length.toLocaleString()}</td>
              <td className="px-3 py-2 text-center">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={downloadCSV}><Download className="h-4 w-4 mr-2" />Download Cleaned CSV</Button>
        <Button variant="outline" onClick={downloadPDF}><FileText className="h-4 w-4 mr-2" />Download Cleaning Report PDF</Button>
        <Button variant="ghost" onClick={onUndo}><Undo2 className="h-4 w-4 mr-2" />Undo All Changes</Button>
      </div>
    </div>
  );
}
