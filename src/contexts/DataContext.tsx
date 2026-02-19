import { useState, useCallback, createContext, useContext, ReactNode, useEffect } from 'react';
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
  uploadData: (name: string, fileName: string, data: Record<string, unknown>[]) => Promise<boolean>;
  refreshDatasets: () => Promise<void>;
  selectDataset: (id: string) => Promise<void>;
  getDatasetData: (id: string) => Promise<Record<string, unknown>[]>;
  updateCurrentData: (data: Record<string, unknown>[]) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const WORKSPACE_ID = 'default';

export function DataProvider({ children }: { children: ReactNode }) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [currentDataset, setCurrentDataset] = useState<Dataset | null>(null);
  const [currentData, setCurrentData] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { consumeCredits, canAddDataset } = useSubscription();

  // Load datasets on mount
  useEffect(() => {
    refreshDatasets();
  }, []);

  const refreshDatasets = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listDatasets(WORKSPACE_ID);
      if (result.length > 0) {
        setDatasets(result);
      }
    } catch (error) {
      console.error('Failed to refresh datasets:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Activate a dataset: set it as currentDataset and load its rows into currentData.
   * This is the single convergence point for both upload and selection flows.
   */
  const activateDataset = useCallback((dataset: Dataset, data: Record<string, unknown>[]) => {
    setCurrentDataset(dataset);
    setCurrentData(data);
    console.log('Active dataset:', dataset.name);
    console.log('Rows loaded:', data.length);
  }, []);

  const uploadData = useCallback(async (name: string, fileName: string, data: Record<string, unknown>[]): Promise<boolean> => {
    if (!canAddDataset(datasets.length)) {
      toast({
        title: 'Dataset Limit Reached',
        description: 'Upgrade your plan to add more datasets.',
        variant: 'destructive'
      });
      return false;
    }

    if (!consumeCredits('upload-dataset')) {
      return false;
    }

    setIsLoading(true);
    try {
      // Detect schema from the parsed data
      const columns = detectSchema(data);

      // Build the dataset object locally from the parsed CSV
      const localDataset: Dataset = {
        id: crypto.randomUUID(),
        name,
        fileName,
        rowCount: data.length,
        columns,
        uploadedAt: new Date().toISOString(),
        data,
      };

      // Try sending to backend, but don't block on failure
      try {
        const result = await uploadDataset(WORKSPACE_ID, name, fileName, data, columns);
        if (result.success && result.dataset) {
          // Use backend-assigned ID if available
          localDataset.id = result.dataset.id;
        }
      } catch (apiError) {
        console.warn('[DataContext] Backend unavailable, using local-only mode:', apiError);
      }

      // Add to datasets list
      setDatasets(prev => [...prev, localDataset]);

      // CRITICAL: Immediately activate the uploaded dataset
      activateDataset(localDataset, data);

      toast({
        title: 'Dataset Uploaded',
        description: `${name} uploaded with ${data.length} rows.`
      });
      return true;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [datasets.length, canAddDataset, consumeCredits, activateDataset]);

  const selectDataset = useCallback(async (id: string) => {
    // Check local datasets first (includes uploaded-in-session datasets)
    const dataset = datasets.find(d => d.id === id);
    if (!dataset) return;

    // If dataset already has data in memory, use it directly
    if (dataset.data && dataset.data.length > 0) {
      activateDataset(dataset, dataset.data);
      return;
    }

    // Otherwise try fetching from backend
    try {
      const fullDataset = await getDataset(WORKSPACE_ID, id);
      if (fullDataset?.data) {
        activateDataset(dataset, fullDataset.data);
        return;
      }
    } catch (error) {
      console.warn('[DataContext] Failed to fetch dataset from backend:', error);
    }

    // Fallback: activate with empty data (schema-only)
    activateDataset(dataset, []);
  }, [datasets, activateDataset]);

  const getDatasetData = useCallback(async (id: string): Promise<Record<string, unknown>[]> => {
    const dataset = datasets.find(d => d.id === id);
    if (dataset?.data && dataset.data.length > 0) {
      return dataset.data;
    }
    try {
      const fullDataset = await getDataset(WORKSPACE_ID, id);
      return fullDataset?.data || [];
    } catch {
      return [];
    }
  }, [datasets]);

  const updateCurrentData = useCallback((data: Record<string, unknown>[]) => {
    setCurrentData(data);
    if (currentDataset) {
      setDatasets(prev => prev.map(d => d.id === currentDataset.id ? { ...d, data, rowCount: data.length } : d));
    }
    console.log('Data updated:', data.length, 'rows');
  }, [currentDataset]);

  return (
    <DataContext.Provider value={{
      datasets,
      currentDataset,
      currentData,
      isLoading,
      uploadData,
      refreshDatasets,
      selectDataset,
      getDatasetData,
      updateCurrentData,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
