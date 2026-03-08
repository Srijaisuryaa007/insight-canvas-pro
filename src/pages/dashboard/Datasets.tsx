import { useState, useMemo, useCallback } from 'react';
import { Database, FileSpreadsheet, Trash2, Eye, Shield, MoreVertical, Calendar, Rows, ChevronUp, ArrowLeftRight, Plus, Code, Undo2, Redo2, FlaskConical } from 'lucide-react';
import { DatasetUploader } from '@/components/data/DatasetUploader';
import { ColumnInspector } from '@/components/data/ColumnInspector';
import { FormulaColumnEditor } from '@/components/data/FormulaColumnEditor';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useData } from '@/contexts/DataContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { applyFormulaColumn, FormulaColumn, DAXMeasure, executeDAXMeasure } from '@/lib/formulaEngine';

const ROW_LIMITS: Record<string, number> = {
  free: 1000, basic: 10000, pro: 100000, enterprise: Infinity,
};

export default function Datasets() {
  const { datasets, currentDataset, currentData, selectDataset, deleteDataset, updateCurrentData, undo, redo, canUndo, canRedo } = useData();
  const { plan } = useSubscription();
  const [showUploader, setShowUploader] = useState(false);
  const [viewingDataId, setViewingDataId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formulaEditorOpen, setFormulaEditorOpen] = useState(false);
  const [formulaColumns, setFormulaColumns] = useState<FormulaColumn[]>([]);
  
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const navigate = useNavigate();

  const rowLimit = ROW_LIMITS[plan] || 1000;

  const handleViewQuality = (id: string) => { selectDataset(id); navigate('/dashboard/quality'); };
  const handleViewDetails = (id: string) => { selectDataset(id); setViewingDataId(prev => prev === id ? null : id); };
  const handleDelete = () => { if (deleteId) { deleteDataset(deleteId); if (viewingDataId === deleteId) setViewingDataId(null); setDeleteId(null); } };

  const handleChangeColumnType = (colName: string, newType: string) => {
    if (!currentData.length) return;
    const convertedData = currentData.map(row => {
      const val = row[colName];
      let converted: unknown = val;
      switch (newType) {
        case 'number': converted = val === null || val === undefined ? null : Number(val); if (isNaN(converted as number)) converted = null; break;
        case 'string': converted = val === null || val === undefined ? null : String(val); break;
        case 'date': if (typeof val === 'string' || typeof val === 'number') { const d = new Date(val as string); converted = isNaN(d.getTime()) ? null : d.toISOString(); } break;
        case 'boolean': converted = val === true || val === 'true' || val === 1 || val === '1'; break;
      }
      return { ...row, [colName]: converted };
    });
    updateCurrentData(convertedData);
    toast({ title: 'Column Type Changed', description: `"${colName}" converted to ${newType}.` });
  };

  const handleApplyFormulaColumn = (columnName: string, formula: string) => {
    if (!currentData.length) return;
    const newData = applyFormulaColumn(currentData, columnName, formula);
    updateCurrentData(newData);
    setFormulaColumns(prev => [...prev, {
      id: crypto.randomUUID(), name: columnName, formula, type: 'excel', createdAt: new Date().toISOString(),
    }]);
    toast({ title: 'Formula Column Added', description: `"${columnName}" calculated and added to dataset.` });
  };

  const handleCellEdit = (rowIdx: number, col: string) => {
    setEditingCell({ row: rowIdx, col });
    setEditValue(String(currentData[rowIdx][col] ?? ''));
  };

  const handleCellSave = () => {
    if (!editingCell) return;
    const { row, col } = editingCell;
    const newData = [...currentData];
    const originalVal = currentData[row][col];
    let newVal: unknown = editValue;
    if (typeof originalVal === 'number') {
      const num = Number(editValue);
      newVal = isNaN(num) ? editValue : num;
    }
    newData[row] = { ...newData[row], [col]: newVal };
    updateCurrentData(newData);
    setEditingCell(null);
    setEditValue('');
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCellSave();
    if (e.key === 'Escape') { setEditingCell(null); setEditValue(''); }
  };

  const viewData = viewingDataId && currentDataset?.id === viewingDataId ? currentData : [];
  const dataColumns = viewData.length > 0 ? Object.keys(viewData[0]) : [];

  const exceedsLimit = useMemo(() => currentData.length > rowLimit, [currentData.length, rowLimit]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Datasets</h1>
          <p className="text-muted-foreground">Manage, explore, and transform your datasets</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs capitalize">
            {plan} Plan • {rowLimit === Infinity ? 'Unlimited' : `${rowLimit.toLocaleString()} rows max`}
          </Badge>
          <Button onClick={() => setShowUploader(!showUploader)}>
            <Database className="h-4 w-4 mr-2" />{showUploader ? 'Cancel' : 'Upload Dataset'}
          </Button>
        </div>
      </div>

      {showUploader && <DatasetUploader onUploadComplete={() => setShowUploader(false)} />}

      {exceedsLimit && (
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="py-3">
            <p className="text-sm text-amber-600">
              ⚠ Dataset exceeds {rowLimit.toLocaleString()} row limit for your {plan} plan.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Dataset List */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />Your Datasets ({datasets.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {datasets.length === 0 ? (
                <div className="py-12 text-center">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg">No datasets yet</h3>
                  <p className="text-muted-foreground text-sm mt-1">Upload your first CSV file to get started</p>
                  <Button className="mt-4" onClick={() => setShowUploader(true)}>Upload Dataset</Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>Columns</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {datasets.map(dataset => (
                      <TableRow key={dataset.id} className={currentDataset?.id === dataset.id ? 'bg-muted/50' : ''} onClick={() => selectDataset(dataset.id)}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4 text-primary" />
                            <span className="font-medium">{dataset.name}</span>
                          </div>
                        </TableCell>
                        <TableCell><div className="flex items-center gap-1 text-muted-foreground"><Rows className="h-3 w-3" />{dataset.rowCount.toLocaleString()}</div></TableCell>
                        <TableCell>{dataset.columns?.length || 0}</TableCell>
                        <TableCell><div className="flex items-center gap-1 text-muted-foreground text-sm"><Calendar className="h-3 w-3" />{format(new Date(dataset.uploadedAt), 'MMM d')}</div></TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              <DropdownMenuItem onClick={e => { e.stopPropagation(); handleViewDetails(dataset.id); }}><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                              <DropdownMenuItem onClick={e => { e.stopPropagation(); handleViewQuality(dataset.id); }}><Shield className="h-4 w-4 mr-2" />Quality Scan</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); setDeleteId(dataset.id); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Spreadsheet Grid */}
          {viewingDataId && viewData.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    {currentDataset?.name} — {viewData.length} rows × {dataColumns.length} columns
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={undo} disabled={!canUndo} title="Undo">
                      <Undo2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={redo} disabled={!canRedo} title="Redo">
                      <Redo2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => setFormulaEditorOpen(true)}>
                      <FlaskConical className="h-3 w-3" />Add Formula Column
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setViewingDataId(null)}>
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[450px] w-full">
                  <div className="min-w-max">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-12 text-xs sticky left-0 bg-muted/50 z-10 text-center border-r border-border">#</TableHead>
                          {dataColumns.map(col => {
                            const isFormula = formulaColumns.some(fc => fc.name === col);
                            return (
                              <TableHead key={col} className="text-xs font-medium whitespace-nowrap min-w-[120px] border-r border-border/50">
                                <div className="flex items-center gap-1">
                                  {col}
                                  {isFormula && <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3">fx</Badge>}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="opacity-40 hover:opacity-100 ml-auto" onClick={e => e.stopPropagation()}>
                                        <ArrowLeftRight className="h-3 w-3" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-popover">
                                      {['string', 'number', 'date', 'boolean'].map(t => (
                                        <DropdownMenuItem key={t} onClick={() => handleChangeColumnType(col, t)} className="text-xs capitalize">Convert to {t}</DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableHead>
                            );
                          })}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewData.slice(0, Math.min(200, rowLimit)).map((row, i) => (
                          <TableRow key={i} className="hover:bg-muted/30">
                            <TableCell className="text-[10px] text-muted-foreground sticky left-0 bg-card z-10 text-center border-r border-border font-mono">
                              {i + 1}
                            </TableCell>
                            {dataColumns.map(col => {
                              const isEditing = editingCell?.row === i && editingCell?.col === col;
                              return (
                                <TableCell
                                  key={col}
                                  className="text-xs whitespace-nowrap max-w-[200px] border-r border-border/30 p-0 cursor-cell"
                                  onDoubleClick={() => handleCellEdit(i, col)}
                                >
                                  {isEditing ? (
                                    <Input
                                      value={editValue}
                                      onChange={e => setEditValue(e.target.value)}
                                      onBlur={handleCellSave}
                                      onKeyDown={handleCellKeyDown}
                                      autoFocus
                                      className="h-7 text-xs rounded-none border-primary border-2 px-1"
                                    />
                                  ) : (
                                    <div className="px-2 py-1.5 truncate">
                                      {row[col] === null || row[col] === undefined ? (
                                        <span className="text-muted-foreground italic">null</span>
                                      ) : String(row[col])}
                                    </div>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <ScrollBar orientation="horizontal" />
                  {viewData.length > 200 && (
                    <p className="text-xs text-muted-foreground text-center py-2">Showing first 200 of {viewData.length} rows</p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {currentDataset && currentDataset.columns ? (
            <>
              <ColumnInspector columns={currentDataset.columns} />

              {/* Field List */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Dataset Fields</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Columns</p>
                    <div className="space-y-1">
                      {currentDataset.columns.map(col => (
                        <div key={col.name} className="flex items-center justify-between px-2 py-1 rounded bg-muted/30 text-xs">
                          <span>{col.name}</span>
                          <Badge variant="outline" className="text-[9px] h-4">{col.type}</Badge>
                        </div>
                      ))}
                      {formulaColumns.map(fc => (
                        <div key={fc.id} className="flex items-center justify-between px-2 py-1 rounded bg-primary/5 text-xs">
                          <span className="flex items-center gap-1">{fc.name} <Badge variant="secondary" className="text-[8px] h-3 px-1">fx</Badge></span>
                          <span className="text-[9px] text-muted-foreground font-mono truncate max-w-[100px]">{fc.formula}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {daxMeasures.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Measures</p>
                      <div className="space-y-1">
                        {daxMeasures.map(m => (
                          <div key={m.id} className="flex items-center justify-between px-2 py-1 rounded bg-chart-1/5 text-xs">
                            <span className="flex items-center gap-1"><Code className="h-3 w-3 text-chart-1" />{m.name}</span>
                            <Badge variant="outline" className="text-[9px] h-4">DAX</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* DAX Measures */}
              <DAXMeasurePanel
                measures={daxMeasures}
                data={currentData}
                columns={currentDataset.columns.map(c => c.name)}
                onAddMeasure={m => setDaxMeasures(prev => [...prev, m])}
                onRemoveMeasure={id => setDaxMeasures(prev => prev.filter(m => m.id !== id))}
              />
            </>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Database className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Select a dataset to inspect columns</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Formula Column Editor Dialog */}
      {viewData.length > 0 && (
        <FormulaColumnEditor
          open={formulaEditorOpen}
          onOpenChange={setFormulaEditorOpen}
          columns={dataColumns}
          sampleRow={viewData[0]}
          allData={viewData}
          onApply={handleApplyFormulaColumn}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dataset?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the dataset. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
