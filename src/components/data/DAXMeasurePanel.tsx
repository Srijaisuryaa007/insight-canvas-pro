import { useState } from 'react';
import { Plus, Check, AlertCircle, Code, Play, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { DAXMeasure, executeDAXMeasure } from '@/lib/formulaEngine';
import { toast } from '@/hooks/use-toast';

interface DAXMeasurePanelProps {
  measures: DAXMeasure[];
  data: Record<string, unknown>[];
  columns: string[];
  onAddMeasure: (measure: DAXMeasure) => void;
  onRemoveMeasure: (id: string) => void;
}

export function DAXMeasurePanel({ measures, data, columns, onAddMeasure, onRemoveMeasure }: DAXMeasurePanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [formula, setFormula] = useState('');
  const [description, setDescription] = useState('');
  const [previewValue, setPreviewValue] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handlePreview = () => {
    setError('');
    setPreviewValue(null);
    if (!formula.trim()) { setError('Formula is required.'); return; }
    try {
      const result = executeDAXMeasure(formula, data);
      setPreviewValue(result);
    } catch (e) {
      setError('Error executing DAX formula.');
    }
  };

  const handleAdd = () => {
    if (!name.trim()) { setError('Measure name is required.'); return; }
    if (measures.some(m => m.name === name.trim())) { setError('Measure name already exists.'); return; }
    if (!formula.trim()) { setError('Formula is required.'); return; }

    onAddMeasure({
      id: crypto.randomUUID(),
      name: name.trim(),
      formula: formula.trim(),
      type: 'dax',
      description: description.trim() || undefined,
      createdAt: new Date().toISOString(),
    });

    toast({ title: 'Measure Created', description: `"${name.trim()}" added to semantic model.` });
    setName('');
    setFormula('');
    setDescription('');
    setPreviewValue(null);
    setError('');
    setDialogOpen(false);
  };

  const insertColumn = (col: string) => {
    const tableName = 'Data';
    setFormula(prev => prev + `${tableName}[${col}]`);
  };

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Code className="h-5 w-5 text-chart-1" />DAX Measures
            </CardTitle>
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setDialogOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />Create Measure
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {measures.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No measures created yet. Click "Create Measure" to add DAX formulas.</p>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {measures.map(m => {
                  let computedValue: number | null = null;
                  try { computedValue = executeDAXMeasure(m.formula, data); } catch {}

                  return (
                    <div key={m.id} className="p-3 rounded-lg border border-border bg-muted/30 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{m.name}</span>
                        <div className="flex items-center gap-1">
                          {computedValue !== null && (
                            <Badge variant="secondary" className="text-xs font-mono">
                              {typeof computedValue === 'number' ? computedValue.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(computedValue)}
                            </Badge>
                          )}
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onRemoveMeasure(m.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <pre className="text-[10px] font-mono text-muted-foreground truncate">{m.formula}</pre>
                      {m.description && <p className="text-[10px] text-muted-foreground">{m.description}</p>}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-chart-1" />Create DAX Measure
            </DialogTitle>
            <DialogDescription>
              Create a Power BI-style DAX measure for aggregations and calculations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Measure Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Total Revenue" />
            </div>

            <div className="space-y-2">
              <Label>DAX Formula</Label>
              <Textarea
                value={formula}
                onChange={e => { setFormula(e.target.value); setError(''); setPreviewValue(null); }}
                placeholder="e.g. SUM(Data[Revenue])"
                className="font-mono text-sm min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                Supported: SUM, AVERAGE, COUNT, MAX, MIN, DISTINCTCOUNT, DIVIDE with Table[Column] syntax
              </p>
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this measure calculate?" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Dataset Columns (click to insert)</Label>
              <div className="flex flex-wrap gap-1.5">
                {columns.map(col => (
                  <Badge key={col} variant="outline" className="cursor-pointer hover:bg-primary/10 text-xs" onClick={() => insertColumn(col)}>
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

            {previewValue !== null && !error && (
              <div className="flex items-center gap-2 text-sm p-2 rounded bg-primary/10 text-primary">
                <Check className="h-4 w-4 shrink-0" />
                Result: <code className="font-mono font-semibold">{previewValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</code>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={handlePreview} disabled={!formula.trim()}>
              <Play className="h-4 w-4 mr-1" />Test
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={!name.trim() || !formula.trim()}>
              <Plus className="h-4 w-4 mr-1" />Create Measure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
