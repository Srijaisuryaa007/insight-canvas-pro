import { useState, useMemo } from 'react';
import { Database, FileSpreadsheet, Trash2, Eye, Shield, MoreVertical, Calendar, Rows, ChevronUp, ArrowLeftRight } from 'lucide-react';
import { DatasetUploader } from '@/components/data/DatasetUploader';
import { ColumnInspector } from '@/components/data/ColumnInspector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useData } from '@/contexts/DataContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

const ROW_LIMITS: Record<string, number> = {
  free: 1000,
  basic: 10000,
  pro: 100000,
  enterprise: Infinity,
};

export default function Datasets() {
  const { datasets, currentDataset, currentData, selectDataset, deleteDataset, updateCurrentData } = useData();
  const { plan } = useSubscription();
  const [showUploader, setShowUploader] = useState(false);
  const [viewingDataId, setViewingDataId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingColumnType, setEditingColumnType] = useState<{ col: string; newType: string } | null>(null);
  const navigate = useNavigate();

  const rowLimit = ROW_LIMITS[plan] || 1000;

  const handleViewQuality = (id: string) => {
    selectDataset(id);
    navigate('/dashboard/quality');
  };

  const handleViewDetails = (id: string) => {
    selectDataset(id);
    setViewingDataId(prev => prev === id ? null : id);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteDataset(deleteId);
      if (viewingDataId === deleteId) setViewingDataId(null);
      setDeleteId(null);
    }
  };

  const handleChangeColumnType = (colName: string, newType: string) => {
    if (!currentData.length) return;

    const convertedData = currentData.map(row => {
      const val = row[colName];
      let converted: unknown = val;
      switch (newType) {
        case 'number':
          converted = val === null || val === undefined ? null : Number(val);
          if (isNaN(converted as number)) converted = null;
          break;
        case 'string':
          converted = val === null || val === undefined ? null : String(val);
          break;
        case 'date':
          if (typeof val === 'string' || typeof val === 'number') {
            const d = new Date(val as string);
            converted = isNaN(d.getTime()) ? null : d.toISOString();
          }
          break;
        case 'boolean':
          converted = val === true || val === 'true' || val === 1 || val === '1';
          break;
      }
      return { ...row, [colName]: converted };
    });

    updateCurrentData(convertedData);
    toast({ title: 'Column Type Changed', description: `"${colName}" converted to ${newType}. Charts and quality checks updated.` });
    setEditingColumnType(null);
  };

  const viewData = viewingDataId && currentDataset?.id === viewingDataId ? currentData : [];

  const exceedsLimit = useMemo(() => {
    if (!currentData.length) return false;
    return currentData.length > rowLimit;
  }, [currentData.length, rowLimit]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Datasets</h1>
          <p className="text-muted-foreground">Manage and explore your uploaded datasets</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs capitalize">
            {plan} Plan • {rowLimit === Infinity ? 'Unlimited' : `${rowLimit.toLocaleString()} rows max`}
          </Badge>
          <Button onClick={() => setShowUploader(!showUploader)}>
            <Database className="h-4 w-4 mr-2" />
            {showUploader ? 'Cancel' : 'Upload Dataset'}
          </Button>
        </div>
      </div>

      {showUploader && <DatasetUploader onUploadComplete={() => setShowUploader(false)} />}

      {exceedsLimit && (
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="py-3">
            <p className="text-sm text-amber-600">
              ⚠ Dataset exceeds {rowLimit.toLocaleString()} row limit for your {plan} plan. Showing first {rowLimit.toLocaleString()} rows. Upgrade for higher limits.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Your Datasets ({datasets.length})
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
                      <TableRow key={dataset.id}
                        className={currentDataset?.id === dataset.id ? 'bg-muted/50' : ''}
                        onClick={() => selectDataset(dataset.id)}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4 text-primary" />
                            <span className="font-medium">{dataset.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Rows className="h-3 w-3" />
                            {dataset.rowCount.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>{dataset.columns?.length || 0}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground text-sm">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(dataset.uploadedAt), 'MMM d')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetails(dataset.id); }}>
                                <Eye className="h-4 w-4 mr-2" />View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewQuality(dataset.id); }}>
                                <Shield className="h-4 w-4 mr-2" />Quality Scan
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(dataset.id); }}>
                                <Trash2 className="h-4 w-4 mr-2" />Delete
                              </DropdownMenuItem>
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

          {viewingDataId && viewData.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    Data Preview — {currentDataset?.name} ({viewData.length} rows × {Object.keys(viewData[0]).length} columns)
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setViewingDataId(null)}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] w-full">
                  <div className="min-w-max">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-xs sticky left-0 bg-card z-10">#</TableHead>
                          {Object.keys(viewData[0]).map(col => (
                            <TableHead key={col} className="text-xs font-medium whitespace-nowrap min-w-[120px]">
                              <div className="flex items-center gap-1">
                                {col}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="opacity-60 hover:opacity-100" onClick={e => e.stopPropagation()}>
                                      <ArrowLeftRight className="h-3 w-3" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="bg-popover">
                                    {['string', 'number', 'date', 'boolean'].map(t => (
                                      <DropdownMenuItem key={t} onClick={() => handleChangeColumnType(col, t)} className="text-xs capitalize">
                                        Convert to {t}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewData.slice(0, Math.min(100, rowLimit)).map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs text-muted-foreground sticky left-0 bg-card z-10">{i + 1}</TableCell>
                            {Object.keys(viewData[0]).map(col => (
                              <TableCell key={col} className="text-xs whitespace-nowrap max-w-[200px] truncate">
                                {row[col] === null || row[col] === undefined ? (
                                  <span className="text-muted-foreground italic">null</span>
                                ) : String(row[col])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <ScrollBar orientation="horizontal" />
                  {viewData.length > 100 && (
                    <p className="text-xs text-muted-foreground text-center py-2">Showing first 100 of {viewData.length} rows</p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          {currentDataset && currentDataset.columns ? (
            <ColumnInspector columns={currentDataset.columns} />
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dataset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the dataset and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
