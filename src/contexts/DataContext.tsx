import { useState, useCallback, createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import { uploadDataset, listDatasets, getDataset } from '@/lib/api';
import { useSubscription } from '@/hooks/useSubscription';
import { detectSchema } from '@/lib/dataParser';
import { toast } from '@/hooks/use-toast';

export interface Dataset {
  id: string;
  name: string;
  fileName: string;
  rowCount: number;
  columns: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    nullable: boolean;
    uniqueValues: number;
    sampleValues: unknown[];
  }>;
  uploadedAt: string;
  data?: Record<string, unknown>[];
}

interface DataContextType {
  datasets: Dataset[];
  currentDataset: Dataset | null;
  currentData: Record<string, unknown>[];
  isLoading: boolean;
  isDataCleaned: boolean;
  cleaningReport: Record<string, unknown> | null;
  uploadData: (name: string, fileName: string, data: Record<string, unknown>[]) => Promise<boolean>;
  refreshDatasets: () => Promise<void>;
  selectDataset: (id: string) => Promise<void>;
  getDatasetData: (id: string) => Promise<Record<string, unknown>[]>;
  updateCurrentData: (data: Record<string, unknown>[]) => void;
  updateCleanedData: (data: Record<string, unknown>[], report: Record<string, unknown>) => void;
  deleteDataset: (id: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const WORKSPACE_ID = 'default';
const MAX_HISTORY = 20;

export function DataProvider({ children }: { children: ReactNode }) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [currentDataset, setCurrentDataset] = useState<Dataset | null>(null);
  const [currentData, setCurrentData] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataCleaned, setIsDataCleaned] = useState(false);
  const [cleaningReport, setCleaningReport] = useState<Record<string, unknown> | null>(null);
  const { consumeCredits, canAddDataset } = useSubscription();

  // Undo/Redo history
  const historyRef = useRef<Record<string, unknown>[][]>([]);
  const historyIndexRef = useRef(-1);

  const pushHistory = useCallback((data: Record<string, unknown>[]) => {
    const idx = historyIndexRef.current;
    // Trim future states
    historyRef.current = historyRef.current.slice(0, idx + 1);
    historyRef.current.push(data);
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const prev = historyRef.current[historyIndexRef.current];
    setCurrentData(prev);
    if (currentDataset) {
      setDatasets(ds => ds.map(d => d.id === currentDataset.id ? { ...d, data: prev, rowCount: prev.length } : d));
    }
    toast({ title: 'Undo', description: 'Reverted to previous data state.' });
  }, [currentDataset]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const next = historyRef.current[historyIndexRef.current];
    setCurrentData(next);
    if (currentDataset) {
      setDatasets(ds => ds.map(d => d.id === currentDataset.id ? { ...d, data: next, rowCount: next.length } : d));
    }
    toast({ title: 'Redo', description: 'Reapplied data change.' });
  }, [currentDataset]);

  useEffect(() => { refreshDatasets(); }, []);

  const refreshDatasets = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listDatasets(WORKSPACE_ID);
      if (result.length > 0) setDatasets(result);
    } catch (error) {
      console.error('Failed to refresh datasets:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const activateDataset = useCallback((dataset: Dataset, data: Record<string, unknown>[]) => {
    setCurrentDataset(dataset);
    setCurrentData(data);
    // Reset history for new dataset
    historyRef.current = [data];
    historyIndexRef.current = 0;
    console.log('Active dataset:', dataset.name, 'Rows:', data.length);
  }, []);

  const uploadData = useCallback(async (name: string, fileName: string, data: Record<string, unknown>[]): Promise<boolean> => {
    if (!canAddDataset(datasets.length)) {
      toast({ title: 'Dataset Limit Reached', description: 'Upgrade your plan to add more datasets.', variant: 'destructive' });
      return false;
    }
    if (!consumeCredits('upload-dataset')) return false;

    setIsLoading(true);
    try {
      const columns = detectSchema(data);
      const localDataset: Dataset = {
        id: crypto.randomUUID(), name, fileName, rowCount: data.length, columns,
        uploadedAt: new Date().toISOString(), data,
      };

      try {
        const result = await uploadDataset(WORKSPACE_ID, name, fileName, data, columns);
        if (result.success && result.dataset) localDataset.id = result.dataset.id;
      } catch (apiError) {
        console.warn('[DataContext] Backend unavailable, using local-only mode:', apiError);
      }

      setDatasets(prev => [...prev, localDataset]);
      activateDataset(localDataset, data);
      toast({ title: 'Dataset Uploaded', description: `${name} uploaded with ${data.length} rows.` });
      return true;
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Upload Failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [datasets.length, canAddDataset, consumeCredits, activateDataset]);

  const selectDataset = useCallback(async (id: string) => {
    const dataset = datasets.find(d => d.id === id);
    if (!dataset) return;

    if (dataset.data && dataset.data.length > 0) {
      activateDataset(dataset, dataset.data);
      return;
    }

    try {
      const fullDataset = await getDataset(WORKSPACE_ID, id);
      if (fullDataset?.data) { activateDataset(dataset, fullDataset.data); return; }
    } catch (error) {
      console.warn('[DataContext] Failed to fetch dataset from backend:', error);
    }
    activateDataset(dataset, []);
  }, [datasets, activateDataset]);

  const getDatasetData = useCallback(async (id: string): Promise<Record<string, unknown>[]> => {
    const dataset = datasets.find(d => d.id === id);
    if (dataset?.data && dataset.data.length > 0) return dataset.data;
    try {
      const fullDataset = await getDataset(WORKSPACE_ID, id);
      return fullDataset?.data || [];
    } catch { return []; }
  }, [datasets]);

  const updateCurrentData = useCallback((data: Record<string, unknown>[]) => {
    pushHistory(data);
    setCurrentData(data);
    if (currentDataset) {
      setDatasets(prev => prev.map(d => d.id === currentDataset.id ? { ...d, data, rowCount: data.length } : d));
    }
    console.log('Data updated:', data.length, 'rows');
  }, [currentDataset, pushHistory]);

  const deleteDataset = useCallback((id: string) => {
    setDatasets(prev => prev.filter(d => d.id !== id));
    if (currentDataset?.id === id) {
      setCurrentDataset(null);
      setCurrentData([]);
      historyRef.current = [];
      historyIndexRef.current = -1;
    }
    toast({ title: 'Dataset Deleted', description: 'Dataset removed successfully.' });
  }, [currentDataset]);

  return (
    <DataContext.Provider value={{
      datasets, currentDataset, currentData, isLoading,
      uploadData, refreshDatasets, selectDataset, getDatasetData, updateCurrentData,
      deleteDataset, undo, redo, canUndo, canRedo,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
}
