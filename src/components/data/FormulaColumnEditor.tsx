import { useState } from 'react';
import { Plus, X, FlaskConical, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { validateFormula, evaluateExcelFormula } from '@/lib/formulaEngine';

interface FormulaColumnEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: string[];
  sampleRow: Record<string, unknown>;
  allData: Record<string, unknown>[];
  onApply: (columnName: string, formula: string) => void;
}

export function FormulaColumnEditor({
  open, onOpenChange, columns, sampleRow, allData, onApply,
}: FormulaColumnEditorProps) {
  const [columnName, setColumnName] = useState('');
  const [formula, setFormula] = useState('');
  const [preview, setPreview] = useState<unknown>(null);
  const [error, setError] = useState('');

  const handlePreview = () => {
    setError('');
    setPreview(null);
    const validation = validateFormula(formula, columns);
    if (!validation.valid) {
      setError(validation.error || 'Invalid formula.');
      return;
    }
    try {
      const result = evaluateExcelFormula(formula, sampleRow, allData);
      setPreview(result);
    } catch (e) {
      setError('Formula execution error.');
    }
  };

  const handleApply = () => {
    if (!columnName.trim()) { setError('Column name is required.'); return; }
    if (columns.includes(columnName.trim())) { setError('Column name already exists.'); return; }
    const validation = validateFormula(formula, columns);
    if (!validation.valid) { setError(validation.error || 'Invalid formula.'); return; }
    onApply(columnName.trim(), formula.trim());
    setColumnName('');
    setFormula('');
    setPreview(null);
    setError('');
    onOpenChange(false);
  };

  const insertColumn = (col: string) => {
    setFormula(prev => prev + col);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />Add Formula Column
          </DialogTitle>
          <DialogDescription>
            Create a calculated column using Excel-style formulas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Column Name</Label>
            <Input value={columnName} onChange={e => setColumnName(e.target.value)} placeholder="e.g. Profit" />
          </div>

          <div className="space-y-2">
            <Label>Formula</Label>
            <Input
              value={formula}
              onChange={e => { setFormula(e.target.value); setError(''); setPreview(null); }}
              placeholder="e.g. =Revenue - Cost"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Supported: SUM, AVERAGE, COUNT, MAX, MIN, ROUND, IF, CONCAT, and arithmetic (+, -, *, /)
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Available Columns (click to insert)</Label>
            <div className="flex flex-wrap gap-1.5">
              {columns.map(col => (
                <Badge
                  key={col}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 text-xs"
                  onClick={() => insertColumn(col)}
                >
                  {col}
                </Badge>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm p-2 rounded bg-destructive/10">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}

          {preview !== null && !error && (
            <div className="flex items-center gap-2 text-sm p-2 rounded bg-primary/10 text-primary">
              <Check className="h-4 w-4 shrink-0" />
              Preview (row 1): <code className="font-mono font-semibold">{String(preview)}</code>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={handlePreview} disabled={!formula.trim()}>
            <FlaskConical className="h-4 w-4 mr-1" />Preview
          </Button>
          <Button size="sm" onClick={handleApply} disabled={!columnName.trim() || !formula.trim()}>
            <Plus className="h-4 w-4 mr-1" />Add Column
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
