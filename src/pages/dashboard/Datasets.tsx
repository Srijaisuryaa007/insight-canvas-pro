import { useState } from 'react';
import { Database, FileSpreadsheet, Trash2, Eye, Shield, MoreVertical, Calendar, Rows, ChevronUp } from 'lucide-react';
import { DatasetUploader } from '@/components/data/DatasetUploader';
import { ColumnInspector } from '@/components/data/ColumnInspector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useData } from '@/contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function Datasets() {
  const { datasets, currentDataset, currentData, selectDataset, deleteDataset } = useData();
  const [showUploader, setShowUploader] = useState(false);
  const [viewingDataId, setViewingDataId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

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

  const viewData = viewingDataId && currentDataset?.id === viewingDataId ? currentData : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Datasets</h1>
          <p className="text-muted-foreground">Manage and explore your uploaded datasets</p>
        </div>
        <Button onClick={() => setShowUploader(!showUploader)}>
          <Database className="h-4 w-4 mr-2" />
          {showUploader ? 'Cancel' : 'Upload Dataset'}
        </Button>
      </div>

      {showUploader && <DatasetUploader onUploadComplete={() => setShowUploader(false)} />}

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
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-xs">#</TableHead>
                          {Object.keys(viewData[0]).map(col => (
                            <TableHead key={col} className="text-xs font-medium whitespace-nowrap">{col}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewData.slice(0, 100).map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
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

      {/* Delete confirmation dialog */}
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
