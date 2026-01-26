import { useState } from 'react';
import { 
  Database, 
  FileSpreadsheet, 
  Trash2, 
  Eye,
  Shield,
  MoreVertical,
  Calendar,
  Rows
} from 'lucide-react';
import { DatasetUploader } from '@/components/data/DatasetUploader';
import { ColumnInspector } from '@/components/data/ColumnInspector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function Datasets() {
  const { datasets, currentDataset, selectDataset, qualityReports } = useWorkspace();
  const [showUploader, setShowUploader] = useState(false);
  const navigate = useNavigate();

  const handleViewQuality = (datasetId: string) => {
    selectDataset(datasetId);
    navigate('/dashboard/quality');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Datasets</h1>
          <p className="text-muted-foreground">
            Manage and explore your uploaded datasets
          </p>
        </div>
        <Button onClick={() => setShowUploader(!showUploader)}>
          <Database className="h-4 w-4 mr-2" />
          {showUploader ? 'Cancel' : 'Upload Dataset'}
        </Button>
      </div>

      {showUploader && (
        <DatasetUploader onUploadComplete={() => setShowUploader(false)} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Datasets Table */}
        <div className="lg:col-span-2">
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
                  <p className="text-muted-foreground text-sm mt-1">
                    Upload your first CSV file to get started
                  </p>
                  <Button 
                    className="mt-4" 
                    onClick={() => setShowUploader(true)}
                  >
                    Upload Dataset
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>Columns</TableHead>
                      <TableHead>Quality</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {datasets.map(dataset => {
                      const report = qualityReports[dataset.id];
                      const isSelected = currentDataset?.id === dataset.id;

                      return (
                        <TableRow 
                          key={dataset.id}
                          className={isSelected ? 'bg-muted/50' : ''}
                          onClick={() => selectDataset(dataset.id)}
                        >
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
                          <TableCell>{dataset.columns.length}</TableCell>
                          <TableCell>
                            {report ? (
                              <Badge 
                                variant={report.overallScore >= 80 ? 'default' : report.overallScore >= 50 ? 'secondary' : 'destructive'}
                                className="font-mono"
                              >
                                {report.overallScore}%
                              </Badge>
                            ) : (
                              <Badge variant="outline">Not scanned</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground text-sm">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(dataset.uploadedAt), 'MMM d')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover">
                                <DropdownMenuItem onClick={() => selectDataset(dataset.id)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewQuality(dataset.id)}>
                                  <Shield className="h-4 w-4 mr-2" />
                                  Quality Scan
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Column Inspector */}
        <div>
          {currentDataset ? (
            <ColumnInspector 
              columns={currentDataset.columns}
              issues={qualityReports[currentDataset.id]?.issues}
            />
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Database className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Select a dataset to inspect columns
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
