import { useState, useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { parseCSV, detectSchema } from '@/lib/dataParser';
import { useData } from '@/contexts/DataContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Badge } from '@/components/ui/badge';

interface DatasetUploaderProps {
  onUploadComplete?: (data: Record<string, unknown>[]) => void;
}

export function DatasetUploader({ onUploadComplete }: DatasetUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { uploadData, datasets } = useData();
  const { canAddDataset, getCreditCost, hasPersistentStorage, maxStorageMB, canUploadFile, isFree } = useSubscription();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpload = canAddDataset(datasets.length);
  const uploadCost = getCreditCost('upload-dataset');

  const triggerFilePicker = () => {
    if (canUpload && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv'))) {
      const fileSizeMB = droppedFile.size / (1024 * 1024);
      const sizeCheck = canUploadFile(fileSizeMB);
      if (!sizeCheck.allowed) {
        setError(sizeCheck.reason || 'File too large for your plan');
        return;
      }
      setFile(droppedFile);
      setDatasetName(droppedFile.name.replace('.csv', ''));
      setError(null);
    } else {
      setError('Please upload a CSV file');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileSizeMB = selectedFile.size / (1024 * 1024);
      const sizeCheck = canUploadFile(fileSizeMB);
      if (!sizeCheck.allowed) {
        setError(sizeCheck.reason || 'File too large for your plan');
        return;
      }
      setFile(selectedFile);
      setDatasetName(selectedFile.name.replace('.csv', ''));
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    if (!canUpload) {
      setError('Dataset limit reached. Upgrade your plan.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 15, 85));
      }, 100);

      const content = await file.text();
      const data = parseCSV(content);

      if (data.length === 0) {
        throw new Error('No data found in file');
      }

      clearInterval(progressInterval);
      setProgress(90);

      // Upload to backend API — pass file size for storage limit check
      const fileSizeMB = file.size / (1024 * 1024);
      const success = await uploadData(datasetName || file.name, file.name, data, fileSizeMB);

      if (success) {
        setProgress(100);
        setSuccess(true);
        onUploadComplete?.(data);

        setTimeout(() => {
          setFile(null);
          setDatasetName('');
          setProgress(0);
          setSuccess(false);
          setUploading(false);
        }, 2000);
      } else {
        setUploading(false);
        setProgress(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload dataset');
      setUploading(false);
      setProgress(0);
    }
  };

  const removeFile = () => {
    setFile(null);
    setDatasetName('');
    setError(null);
  };

  return (
    <Card className="p-6 bg-card border-border">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Upload Dataset</h3>
          <div className="flex items-center gap-2">
            {isFree && (
              <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-500">
                Session only — no storage
              </Badge>
            )}
            {!isFree && maxStorageMB !== -1 && (
              <Badge variant="outline" className="text-xs">
                {maxStorageMB >= 1024 ? `${(maxStorageMB / 1024).toFixed(0)}GB` : `${maxStorageMB}MB`} storage
              </Badge>
            )}
            {maxStorageMB === -1 && (
              <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                Unlimited storage
              </Badge>
            )}
            {!canUpload && (
              <span className="text-sm text-destructive">
                Dataset limit reached
              </span>
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
          disabled={!canUpload}
        />

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={!file ? triggerFilePicker : undefined}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragging 
              ? "border-primary bg-primary/5" 
              : "border-border hover:border-muted-foreground",
            !canUpload && "opacity-50 pointer-events-none",
            !file && canUpload && "cursor-pointer"
          )}
        >
          {!file ? (
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-foreground">
                  Drag and drop your CSV file here, or{' '}
                  <span className="text-primary cursor-pointer hover:underline">
                    browse
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports CSV files up to 10MB
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeFile(); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {file && (
          <div className="space-y-2">
            <Label htmlFor="datasetName">Dataset Name</Label>
            <Input
              id="datasetName"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              placeholder="Enter dataset name"
            />
          </div>
        )}

        {uploading && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              {progress < 100 ? 'Uploading to server...' : 'Complete!'}
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-emerald-500 text-sm">
            <CheckCircle className="h-4 w-4" />
            Dataset uploaded successfully!
          </div>
        )}

        {file && !uploading && !success && (
          <Button 
            onClick={handleUpload} 
            className="w-full"
            disabled={!datasetName.trim() || !canUpload}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Dataset ({uploadCost} credits)
          </Button>
        )}
      </div>
    </Card>
  );
}
