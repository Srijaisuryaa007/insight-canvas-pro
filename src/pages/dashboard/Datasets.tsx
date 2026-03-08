import { useState, useMemo, useCallback } from 'react';
import {
  Database, FileSpreadsheet, Trash2, Eye, Shield, MoreVertical, Calendar,
  Rows, ChevronUp, ArrowLeftRight, Plus, Undo2, Redo2, FlaskConical,
  Upload, Search, LayoutGrid, List, Download, Pencil, Copy, BarChart3,
  FileText, Sparkles, ChevronLeft, ArrowRight, Hash, Type, CheckCircle2,
  ChevronDown, X,
} from 'lucide-react';
import { DatasetUploader } from '@/components/data/DatasetUploader';
import { ColumnInspector } from '@/components/data/ColumnInspector';
import { FormulaColumnEditor } from '@/components/data/FormulaColumnEditor';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useData, Dataset } from '@/contexts/DataContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { applyFormulaColumn, FormulaColumn } from '@/lib/formulaEngine';
import { cn } from '@/lib/utils';

const ROW_LIMITS: Record<string, number> = {
  free: 1000, basic: 10000, pro: 100000, enterprise: Infinity,
};

const formatColumnName = (col: string) =>
  col?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).trim() || '';

// ─── Helpers ──────────────────────────────────────────────────────

function getDatasetHealth(dataset: Dataset, data: Record<string, unknown>[]): number {
  if (!data.length) return 0;
  const keys = Object.keys(data[0]);
  const totalCells = data.length * keys.length;
  let nullCells = 0;
  data.forEach(row => keys.forEach(k => {
    if (row[k] === null || row[k] === undefined || row[k] === '') nullCells++;
  }));
  const completeness = ((totalCells - nullCells) / totalCells) * 100;
  const rowSet = new Set(data.map(r => JSON.stringify(r)));
  const uniqueness = (rowSet.size / data.length) * 100;
  return Math.round((completeness * 0.5 + uniqueness * 0.5));
}

function getHealthColor(score: number) {
  if (score >= 90) return { bg: 'bg-emerald-500/10', text: 'text-emerald-500', ring: 'ring-emerald-500/30' };
  if (score >= 75) return { bg: 'bg-amber-500/10', text: 'text-amber-500', ring: 'ring-amber-500/30' };
  if (score >= 60) return { bg: 'bg-orange-500/10', text: 'text-orange-500', ring: 'ring-orange-500/30' };
  return { bg: 'bg-destructive/10', text: 'text-destructive', ring: 'ring-destructive/30' };
}

function getHealthGrade(score: number) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

function getFileType(name: string): { label: string; color: string } {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') return { label: 'Excel', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
  return { label: 'CSV', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
}

function getStorageSize(data: Record<string, unknown>[]): string {
  const bytes = new Blob([JSON.stringify(data)]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Main Component ───────────────────────────────────────────────

export default function Datasets() {
  const {
    datasets, currentDataset, currentData, selectDataset, deleteDataset,
    updateCurrentData, refreshDatasets, undo, redo, canUndo, canRedo,
  } = useData();
  const { plan } = useSubscription();
  const navigate = useNavigate();

  const [showUploader, setShowUploader] = useState(false);
  const [detailDataset, setDetailDataset] = useState<Dataset | null>(null);
  const [detailTab, setDetailTab] = useState('preview');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formulaEditorOpen, setFormulaEditorOpen] = useState(false);
  const [formulaColumns, setFormulaColumns] = useState<FormulaColumn[]>([]);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [inspectorColumn, setInspectorColumn] = useState<string | undefined>(undefined);

  const rowLimit = ROW_LIMITS[plan] || 1000;

  // ─── Computed ────────────────────────────────────────────────────

  const filteredDatasets = useMemo(() => {
    let result = [...datasets];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(q) || d.fileName?.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'size': return (b.rowCount || 0) - (a.rowCount || 0);
        default: return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      }
    });
    return result;
  }, [datasets, searchQuery, sortBy]);

  const totalStorage = useMemo(() => {
    let total = 0;
    datasets.forEach(d => {
      if (d.data) total += new Blob([JSON.stringify(d.data)]).size;
    });
    return total;
  }, [datasets]);

  const storagePct = Math.min(100, (totalStorage / (10 * 1024 * 1024)) * 100);

  // ─── Handlers ────────────────────────────────────────────────────

  const handleOpenDetail = (ds: Dataset) => {
    selectDataset(ds.id);
    setDetailDataset(ds);
    setDetailTab('preview');
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteDataset(deleteId);
      if (detailDataset?.id === deleteId) setDetailDataset(null);
      setDeleteId(null);
    }
  };

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
    toast({ title: 'Column Type Changed', description: `"${formatColumnName(colName)}" converted to ${newType}.` });
  };

  const handleApplyFormulaColumn = (columnName: string, formula: string) => {
    if (!currentData.length) return;
    const newData = applyFormulaColumn(currentData, columnName, formula);
    updateCurrentData(newData);
    setFormulaColumns(prev => [...prev, {
      id: crypto.randomUUID(), name: columnName, formula, type: 'excel', createdAt: new Date().toISOString(),
    }]);
    toast({ title: 'Formula Column Added', description: `"${columnName}" calculated and added.` });
  };

  const handleCellEdit = (rowIdx: number, col: string) => { setEditingCell({ row: rowIdx, col }); setEditValue(String(currentData[rowIdx][col] ?? '')); };
  const handleCellSave = () => {
    if (!editingCell) return;
    const { row, col } = editingCell;
    const newData = [...currentData];
    const originalVal = currentData[row][col];
    let newVal: unknown = editValue;
    if (typeof originalVal === 'number') { const num = Number(editValue); newVal = isNaN(num) ? editValue : num; }
    newData[row] = { ...newData[row], [col]: newVal };
    updateCurrentData(newData);
    setEditingCell(null);
    setEditValue('');
  };
  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCellSave();
    if (e.key === 'Escape') { setEditingCell(null); setEditValue(''); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    selectedIds.forEach(id => deleteDataset(id));
    setSelectedIds(new Set());
    toast({ title: 'Datasets Deleted', description: `${selectedIds.size} datasets removed.` });
  };

  // ─── Detail View ────────────────────────────────────────────────
  if (detailDataset) {
    const ds = detailDataset;
    const data = currentData;
    const dataColumns = data.length > 0 ? Object.keys(data[0]) : [];
    const numericCols = dataColumns.filter(c => data.length > 0 && typeof data[0][c] === 'number');
    const textCols = dataColumns.filter(c => data.length > 0 && typeof data[0][c] === 'string');
    const health = data.length > 0 ? getDatasetHealth(ds, data) : 0;

    return (
      <div className="space-y-6">
        {/* Back header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setDetailDataset(null)} className="gap-1.5">
            <ChevronLeft className="h-4 w-4" />Back to Datasets
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{ds.name}</h1>
              <p className="text-xs text-muted-foreground">{data.length} rows · {dataColumns.length} columns · {getStorageSize(data)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={!canUndo}><Undo2 className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={!canRedo}><Redo2 className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setFormulaEditorOpen(true)}>
              <FlaskConical className="h-3 w-3" />Add Formula Column
            </Button>
          </div>
        </div>

        <Tabs value={detailTab} onValueChange={setDetailTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-md bg-muted/50">
            <TabsTrigger value="preview" className="text-xs gap-1.5"><Eye className="h-3 w-3" />Preview</TabsTrigger>
            <TabsTrigger value="schema" className="text-xs gap-1.5"><Hash className="h-3 w-3" />Schema</TabsTrigger>
            <TabsTrigger value="quality" className="text-xs gap-1.5"><Shield className="h-3 w-3" />Quality</TabsTrigger>
            <TabsTrigger value="history" className="text-xs gap-1.5"><Calendar className="h-3 w-3" />History</TabsTrigger>
          </TabsList>

          {/* PREVIEW TAB */}
          <TabsContent value="preview" className="mt-4">
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <ScrollArea className="h-[500px] w-full">
                  <div className="min-w-max">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-12 text-xs sticky left-0 bg-muted/50 z-10 text-center border-r border-border">#</TableHead>
                          {dataColumns.map(col => {
                            const isNum = data.length > 0 && typeof data[0][col] === 'number';
                            return (
                              <TableHead key={col} className="text-xs font-medium whitespace-nowrap min-w-[120px] border-r border-border/50">
                                <div className="flex items-center gap-1.5">
                                  {isNum ? <Hash className="h-3 w-3 text-blue-500 shrink-0" /> : <Type className="h-3 w-3 text-emerald-500 shrink-0" />}
                                  {formatColumnName(col)}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="opacity-40 hover:opacity-100 ml-auto"><ArrowLeftRight className="h-3 w-3" /></button>
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
                        {data.slice(0, 200).map((row, i) => (
                          <TableRow key={i} className="hover:bg-muted/30">
                            <TableCell className="text-[10px] text-muted-foreground sticky left-0 bg-card z-10 text-center border-r border-border font-mono">{i + 1}</TableCell>
                            {dataColumns.map(col => {
                              const isEditing = editingCell?.row === i && editingCell?.col === col;
                              return (
                                <TableCell key={col} className="text-xs whitespace-nowrap max-w-[200px] border-r border-border/30 p-0 cursor-cell" onDoubleClick={() => handleCellEdit(i, col)}>
                                  {isEditing ? (
                                    <Input value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={handleCellSave} onKeyDown={handleCellKeyDown} autoFocus className="h-7 text-xs rounded-none border-primary border-2 px-1" />
                                  ) : (
                                    <div className="px-2 py-1.5 truncate">
                                      {row[col] === null || row[col] === undefined ? <span className="text-muted-foreground italic">null</span> : String(row[col])}
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
                </ScrollArea>
                <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
                  Showing 1-{Math.min(200, data.length)} of {data.length} rows · Double-click to edit
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SCHEMA TAB */}
          <TabsContent value="schema" className="mt-4">
            <ColumnInspector
              columns={ds.columns || []}
              selectedColumn={inspectorColumn}
              onSelectColumn={setInspectorColumn}
              data={data}
            />
          </TabsContent>

          {/* QUALITY TAB */}
          <TabsContent value="quality" className="mt-4">
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-4 mb-6">
                  <div className="relative w-28 h-28">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                      <circle cx="50" cy="50" r="42" fill="none"
                        stroke={health >= 80 ? 'hsl(var(--chart-2))' : health >= 60 ? 'hsl(38, 92%, 50%)' : 'hsl(var(--destructive))'}
                        strokeWidth="8" strokeDasharray={`${(health / 100) * 264} 264`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-foreground">{health}</span>
                      <span className="text-[10px] text-muted-foreground">/100</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className={cn("text-xs", getHealthColor(health).text, getHealthColor(health).bg)}>
                    Grade {getHealthGrade(health)}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <p className="text-lg font-bold text-foreground">{data.length}</p>
                    <p className="text-[11px] text-muted-foreground">Total Rows</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <p className="text-lg font-bold text-foreground">{dataColumns.length}</p>
                    <p className="text-[11px] text-muted-foreground">Columns</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <p className="text-lg font-bold text-foreground">{numericCols.length}</p>
                    <p className="text-[11px] text-muted-foreground">Numeric</p>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="outline" onClick={() => navigate('/dashboard/quality')}>
                  <Shield className="h-4 w-4 mr-2" />Run Full Quality Scan
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="mt-4">
            <Card className="bg-card border-border">
              <CardContent className="p-6 space-y-4">
                {[
                  { color: 'bg-emerald-500', action: `Uploaded`, detail: `${data.length} rows · ${dataColumns.length} columns`, time: ds.uploadedAt ? format(new Date(ds.uploadedAt), 'MMM d, yyyy') : 'Unknown' },
                  { color: 'bg-blue-500', action: 'Schema detected', detail: `${numericCols.length} numeric · ${textCols.length} text columns`, time: 'Auto' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={cn("w-2.5 h-2.5 rounded-full mt-1.5 shrink-0", item.color)} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.action}</p>
                      <p className="text-xs text-muted-foreground">{item.detail} · {item.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Formula Editor */}
        {data.length > 0 && (
          <FormulaColumnEditor
            open={formulaEditorOpen} onOpenChange={setFormulaEditorOpen}
            columns={dataColumns} sampleRow={data[0]} allData={data}
            onApply={handleApplyFormulaColumn}
          />
        )}
      </div>
    );
  }

  // ─── Main List View ──────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Datasets</h1>
          <p className="text-sm text-muted-foreground">Manage, explore and transform your data sources</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs capitalize cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/dashboard/settings')}
          >
            {plan} Plan · {rowLimit === Infinity ? 'Unlimited' : `${rowLimit.toLocaleString()} Rows Max`}
          </Badge>
          <Button onClick={() => setShowUploader(!showUploader)} className="gap-2">
            <Upload className="h-4 w-4" />{showUploader ? 'Cancel' : 'Upload Dataset'}
          </Button>
        </div>
      </motion.div>

      {showUploader && <DatasetUploader onUploadComplete={() => { setShowUploader(false); refreshDatasets(); }} />}

      {/* Storage Bar */}
      <Card className="bg-card border-border">
        <CardContent className="py-3 px-5 flex items-center gap-4">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Storage Used</span>
          <div className="flex-1 max-w-xs">
            <Progress value={storagePct} className="h-2" />
          </div>
          <span className="text-xs font-mono text-foreground whitespace-nowrap">
            {totalStorage < 1024 * 1024 ? `${(totalStorage / 1024).toFixed(0)} KB` : `${(totalStorage / (1024 * 1024)).toFixed(1)} MB`} / 10 MB
          </span>
          <Button variant="ghost" size="sm" className="text-xs text-primary h-6" onClick={() => navigate('/dashboard/settings')}>
            Upgrade for unlimited
          </Button>
        </CardContent>
      </Card>

      {/* Search + Filter + View Toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search datasets..."
            className="pl-9 h-9 text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="recent">Recent</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="size">Size</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <button onClick={() => setViewMode('grid')} className={cn("p-2 transition-colors", viewMode === 'grid' ? "bg-muted" : "hover:bg-muted/50")}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setViewMode('list')} className={cn("p-2 transition-colors", viewMode === 'list' ? "bg-muted" : "hover:bg-muted/50")}>
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Dataset Cards/List */}
      <AnimatePresence mode="wait">
        {filteredDatasets.length === 0 ? (
          /* Empty State */
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="bg-card border-border border-dashed">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Database className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold">No datasets yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Upload your first dataset to start analyzing, visualizing and generating AI-powered insights
                </p>
                <div
                  className="mt-6 mx-auto max-w-sm border-2 border-dashed border-border rounded-2xl p-8 cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => setShowUploader(true)}
                >
                  <Upload className="h-8 w-8 text-primary mx-auto mb-3" />
                  <p className="text-sm font-medium">Drag & drop your CSV or Excel file</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                  <p className="text-[10px] text-muted-foreground mt-3">Supports CSV, XLSX up to 10 MB</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredDatasets.map((ds, i) => {
              const data = ds.data || [];
              const cols = ds.columns?.length || (data.length > 0 ? Object.keys(data[0]).length : 0);
              const numCols = ds.columns?.filter(c => c.type === 'number').length || 0;
              const textCols = ds.columns?.filter(c => c.type === 'string').length || 0;
              const dateCols = ds.columns?.filter(c => c.type === 'date').length || 0;
              const health = data.length > 0 ? getDatasetHealth(ds, data) : 0;
              const hColor = getHealthColor(health);
              const fileType = getFileType(ds.fileName || ds.name);
              const completeness = data.length > 0 ? (() => {
                const keys = Object.keys(data[0]);
                const total = data.length * keys.length;
                let nulls = 0;
                data.forEach(r => keys.forEach(k => { if (r[k] === null || r[k] === undefined || r[k] === '') nulls++; }));
                return Math.round(((total - nulls) / total) * 100);
              })() : 0;

              return (
                <motion.div
                  key={ds.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card
                    className={cn(
                      "bg-card border-border overflow-hidden cursor-pointer transition-all group hover:shadow-lg hover:-translate-y-0.5",
                      currentDataset?.id === ds.id && "ring-1 ring-primary/30",
                      selectedIds.has(ds.id) && "ring-2 ring-primary"
                    )}
                    onClick={() => handleOpenDetail(ds)}
                  >
                    <CardContent className="p-5 space-y-4">
                      {/* Top row */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(ds.id)}
                            onChange={e => { e.stopPropagation(); toggleSelect(ds.id); }}
                            onClick={e => e.stopPropagation()}
                            className="rounded border-border h-4 w-4 accent-primary shrink-0"
                          />
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                            <FileSpreadsheet className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{ds.name}</p>
                            <Badge variant="outline" className={cn("text-[9px] h-4 px-1 mt-0.5", fileType.color)}>{fileType.label}</Badge>
                          </div>
                        </div>
                        {data.length > 0 && (
                          <div className="flex flex-col items-center shrink-0">
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center ring-2", hColor.bg, hColor.ring)}>
                              <span className={cn("text-sm font-bold", hColor.text)}>{health}</span>
                            </div>
                            <span className="text-[9px] text-muted-foreground mt-0.5">Grade {getHealthGrade(health)}</span>
                          </div>
                        )}
                      </div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { value: ds.rowCount?.toLocaleString() || '0', label: 'Rows' },
                          { value: cols, label: 'Cols' },
                          { value: `${completeness}%`, label: 'Complete' },
                          { value: ds.uploadedAt ? format(new Date(ds.uploadedAt), 'MMM d') : '—', label: 'Date' },
                        ].map(stat => (
                          <div key={stat.label} className="text-center p-2 rounded-lg bg-muted/30">
                            <p className="text-sm font-bold text-foreground">{stat.value}</p>
                            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Tags + Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1 flex-wrap">
                          {numCols > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1"># {numCols} numeric</Badge>}
                          {textCols > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1">T {textCols} text</Badge>}
                          {dateCols > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1">📅 {dateCols} dates</Badge>}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={e => { e.stopPropagation(); handleOpenDetail(ds); }}>
                            <Eye className="h-3 w-3 mr-1" />Preview
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => e.stopPropagation()}>
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover w-48">
                              <DropdownMenuItem onClick={e => { e.stopPropagation(); handleOpenDetail(ds); }}><Eye className="h-3.5 w-3.5 mr-2" />Preview Data</DropdownMenuItem>
                              <DropdownMenuItem onClick={e => { e.stopPropagation(); selectDataset(ds.id); navigate('/dashboard/insights'); }}><Sparkles className="h-3.5 w-3.5 mr-2" />Run Analysis</DropdownMenuItem>
                              <DropdownMenuItem onClick={e => { e.stopPropagation(); selectDataset(ds.id); navigate('/dashboard/quality'); }}><Shield className="h-3.5 w-3.5 mr-2" />Clean Data</DropdownMenuItem>
                              <DropdownMenuItem onClick={e => { e.stopPropagation(); selectDataset(ds.id); navigate('/dashboard/visualizations'); }}><BarChart3 className="h-3.5 w-3.5 mr-2" />Visualize</DropdownMenuItem>
                              <DropdownMenuItem onClick={e => { e.stopPropagation(); selectDataset(ds.id); navigate('/dashboard/reports'); }}><FileText className="h-3.5 w-3.5 mr-2" />Generate Report</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={e => { e.stopPropagation(); toast({ title: 'Renamed' }); }}><Pencil className="h-3.5 w-3.5 mr-2" />Rename</DropdownMenuItem>
                              
                              <DropdownMenuItem onClick={e => { e.stopPropagation(); toast({ title: 'Downloaded' }); }}><Download className="h-3.5 w-3.5 mr-2" />Download</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); setDeleteId(ds.id); }}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          /* List View */
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Rows</TableHead>
                      <TableHead className="text-xs">Cols</TableHead>
                      <TableHead className="text-xs">Health</TableHead>
                      <TableHead className="text-xs">Size</TableHead>
                      <TableHead className="text-xs">Modified</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDatasets.map(ds => {
                      const data = ds.data || [];
                      const health = data.length > 0 ? getDatasetHealth(ds, data) : 0;
                      const hColor = getHealthColor(health);
                      const fileType = getFileType(ds.fileName || ds.name);
                      return (
                        <TableRow
                          key={ds.id}
                          className={cn("cursor-pointer hover:bg-muted/30", selectedIds.has(ds.id) && "bg-primary/5")}
                          onClick={() => handleOpenDetail(ds)}
                        >
                          <TableCell onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox" checked={selectedIds.has(ds.id)}
                              onChange={() => toggleSelect(ds.id)}
                              className="rounded border-border h-4 w-4 accent-primary"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="h-4 w-4 text-blue-500 shrink-0" />
                              <span className="font-medium text-sm">{ds.name}</span>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline" className={cn("text-[9px] h-4 px-1", fileType.color)}>{fileType.label}</Badge></TableCell>
                          <TableCell className="text-sm">{ds.rowCount?.toLocaleString()}</TableCell>
                          <TableCell className="text-sm">{ds.columns?.length || 0}</TableCell>
                          <TableCell>
                            {data.length > 0 ? (
                              <span className={cn("text-sm font-semibold", hColor.text)}>{health}</span>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{getStorageSize(data)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {ds.uploadedAt ? format(new Date(ds.uploadedAt), 'MMM d') : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => handleOpenDetail(ds)}>Preview</Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="h-3 w-3" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-popover">
                                  <DropdownMenuItem onClick={() => { selectDataset(ds.id); navigate('/dashboard/insights'); }}><Sparkles className="h-3.5 w-3.5 mr-2" />Analyze</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { selectDataset(ds.id); navigate('/dashboard/visualizations'); }}><BarChart3 className="h-3.5 w-3.5 mr-2" />Visualize</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(ds.id)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <Card className="bg-card border-border shadow-2xl">
              <CardContent className="py-3 px-5 flex items-center gap-4">
                <span className="text-sm font-medium">{selectedIds.size} dataset{selectedIds.size > 1 ? 's' : ''} selected</span>
                <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => toast({ title: 'Downloaded' })}>
                  <Download className="h-3.5 w-3.5" />Download All
                </Button>
                <Button variant="destructive" size="sm" className="text-xs gap-1.5" onClick={handleBulkDelete}>
                  <Trash2 className="h-3.5 w-3.5" />Delete Selected
                </Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedIds(new Set())}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Dialog */}
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
