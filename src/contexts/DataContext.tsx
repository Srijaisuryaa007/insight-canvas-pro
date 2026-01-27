import { useState, useCallback, createContext, useContext, ReactNode, useEffect } from 'react';
import { uploadDataset, listDatasets, getDataset } from '@/lib/api';
import { useSubscription } from '@/hooks/useSubscription';
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
      setDatasets(result);
    } catch (error) {
      console.error('Failed to refresh datasets:', error);
    } finally {
      setIsLoading(false);
    }
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
      const result = await uploadDataset(WORKSPACE_ID, name, fileName, data);
      
      if (result.success && result.dataset) {
        await refreshDatasets();
        toast({
          title: 'Dataset Uploaded',
          description: `${name} uploaded with ${data.length} rows.`
        });
        return true;
      } else {
        toast({
          title: 'Upload Failed',
          description: result.error || 'Unknown error',
          variant: 'destructive'
        });
        return false;
      }
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
  }, [datasets.length, canAddDataset, consumeCredits, refreshDatasets]);

  const selectDataset = useCallback(async (id: string) => {
    const dataset = datasets.find(d => d.id === id);
    if (dataset) {
      setCurrentDataset(dataset);
      // Fetch full data
      const fullDataset = await getDataset(WORKSPACE_ID, id);
      if (fullDataset?.data) {
        setCurrentData(fullDataset.data);
      }
    }
  }, [datasets]);

  const getDatasetData = useCallback(async (id: string): Promise<Record<string, unknown>[]> => {
    const fullDataset = await getDataset(WORKSPACE_ID, id);
    return fullDataset?.data || [];
  }, []);

  return (
    <DataContext.Provider value={{
      datasets,
      currentDataset,
      currentData,
      isLoading,
      uploadData,
      refreshDatasets,
      selectDataset,
      getDatasetData
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
