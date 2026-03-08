import { useState, useCallback, createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import { listDatasets, getDataset } from '@/lib/api';
import { useSubscription } from '@/hooks/useSubscription';
import { detectSchema } from '@/lib/dataParser';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

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
const LS_KEY = 'datapulse_datasets';
const LS_ACTIVE = 'datapulse_active_dataset';

function saveToLocalStorage(datasets: Dataset[]) {
  try {
    // Store datasets with their data (limit rows to prevent quota issues)
    const toStore = datasets.map(d => ({
      ...d,
      data: (d.data || []).slice(0, 5000), // cap at 5k rows for localStorage
    }));
    localStorage.setItem(LS_KEY, JSON.stringify(toStore));
  } catch (e) {
    console.warn('[DataContext] localStorage save failed (quota?):', e);
  }
}

function loadFromLocalStorage(): Dataset[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[DataContext] localStorage load failed:', e);
  }
  return [];
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [datasets, setDatasets] = useState<Dataset[]>(() => loadFromLocalStorage());
  const [currentDataset, setCurrentDataset] = useState<Dataset | null>(null);
  const [currentData, setCurrentData] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataCleaned, setIsDataCleaned] = useState(false);
  const [cleaningReport, setCleaningReport] = useState<Record<string, unknown> | null>(null);
  const { consumeCredits, canAddDataset, hasPersistentStorage, canUploadFile } = useSubscription();
  const { user } = useAuth();

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

  // Persist datasets to localStorage whenever they change
  useEffect(() => {
    if (datasets.length > 0) saveToLocalStorage(datasets);
  }, [datasets]);



  const refreshDatasets = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !user) return;
    setIsLoading(true);
    try {
      const { data: ds } = await supabase.from('datasets').select('*').eq('user_id', user.id).order('created_at');
      if (ds && ds.length > 0) {
        // Merge: keep local row data if we have it, only update metadata from Supabase
        const localCache = loadFromLocalStorage();
        const mapped = ds.map(d => {
          const cached = localCache.find(c => c.id === d.id);
          return {
            id: d.id, name: d.dataset_name, fileName: d.file_name,
            rowCount: d.row_count, columns: d.columns || [],
            uploadedAt: d.created_at,
            data: cached?.data && cached.data.length > 0 ? cached.data : [],
          };
        });
        setDatasets(mapped as Dataset[]);
      }
    } catch (error) {
      console.error('Failed to refresh datasets:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const activateDataset = useCallback((dataset: Dataset, data: Record<string, unknown>[]) => {
    setCurrentDataset(dataset);
    setCurrentData(data);
    setIsDataCleaned(false);
    setCleaningReport(null);
    historyRef.current = [data];
    historyIndexRef.current = 0;
    localStorage.setItem(LS_ACTIVE, dataset.id);
    console.log('Active dataset:', dataset.name, 'Rows:', data.length);
  }, []);

  // Auto-restore last active dataset on mount
  useEffect(() => {
    if (currentDataset || datasets.length === 0) return;
    const lastActiveId = localStorage.getItem(LS_ACTIVE);
    const target = datasets.find(d => d.id === lastActiveId) || datasets[datasets.length - 1];
    if (target?.data && target.data.length > 0) {
      activateDataset(target, target.data);
    }
  }, [datasets, currentDataset, activateDataset]);


  const uploadData = useCallback(async (name: string, fileName: string, data: Record<string, unknown>[], fileSizeMB?: number): Promise<boolean> => {
    if (!canAddDataset(datasets.length)) {
      toast({ title: 'Dataset Limit Reached', description: 'Upgrade your plan to add more datasets.', variant: 'destructive' });
      return false;
    }

    // Check file size against storage limit
    if (fileSizeMB !== undefined) {
      const sizeCheck = canUploadFile(fileSizeMB);
      if (!sizeCheck.allowed) {
        toast({ title: 'Storage Limit Exceeded', description: sizeCheck.reason, variant: 'destructive' });
        return false;
      }
    }

    if (!consumeCredits('upload-dataset')) return false;

    setIsLoading(true);
    try {
      const columns = detectSchema(data);
      const localDataset: Dataset = {
        id: crypto.randomUUID(), name, fileName, rowCount: data.length, columns,
        uploadedAt: new Date().toISOString(), data,
      };

      // Only save to Supabase if the plan has persistent storage
      if (hasPersistentStorage && isSupabaseConfigured && supabase && user) {
        const { error } = await supabase.from('datasets').insert({
          id: localDataset.id, user_id: user.id, dataset_name: name,
          file_name: fileName, row_count: data.length,
          columns: columns, quality_score: null,
        });
        if (error) console.error('[DataContext] Supabase insert error:', error);
      }

      // Free users: data stays in memory only (session), not persisted to localStorage or DB
      if (!hasPersistentStorage) {
        toast({ title: 'Dataset Loaded (Session Only)', description: `${name} loaded with ${data.length} rows. Data will be lost when you close the browser. Upgrade for persistent storage.` });
      } else {
        toast({ title: 'Dataset Uploaded', description: `${name} uploaded with ${data.length} rows.` });
      }

      setDatasets(prev => [...prev, localDataset]);
      activateDataset(localDataset, data);
      return true;
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Upload Failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [datasets.length, canAddDataset, consumeCredits, activateDataset, user, hasPersistentStorage, canUploadFile]);

  const selectDataset = useCallback(async (id: string) => {
    const dataset = datasets.find(d => d.id === id);
    if (!dataset) return;

    // 1. Check in-memory data
    if (dataset.data && dataset.data.length > 0) {
      activateDataset(dataset, dataset.data);
      return;
    }

    // 2. Check localStorage cache
    const cached = loadFromLocalStorage().find(d => d.id === id);
    if (cached?.data && cached.data.length > 0) {
      activateDataset(dataset, cached.data);
      // Also update in-memory
      setDatasets(prev => prev.map(d => d.id === id ? { ...d, data: cached.data } : d));
      return;
    }

    // 3. Try backend API
    try {
      const fullDataset = await getDataset(WORKSPACE_ID, id);
      if (fullDataset?.data) { activateDataset(dataset, fullDataset.data); return; }
    } catch (error) {
      console.warn('[DataContext] Failed to fetch dataset from backend:', error);
    }

    // 4. No data found — inform user
    activateDataset(dataset, []);
    toast({ title: 'No Row Data', description: 'Dataset metadata loaded but row data is not available. Please re-upload the CSV.', variant: 'destructive' });
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

  const updateCleanedData = useCallback((data: Record<string, unknown>[], report: Record<string, unknown>) => {
    pushHistory(data);
    setCurrentData(data);
    setIsDataCleaned(true);
    setCleaningReport(report);
    if (currentDataset) {
      setDatasets(prev => prev.map(d => d.id === currentDataset.id ? { ...d, data, rowCount: data.length } : d));
    }
    console.log('Cleaned data updated:', data.length, 'rows');
  }, [currentDataset, pushHistory]);

  const deleteDataset = useCallback((id: string) => {
    setDatasets(prev => prev.filter(d => d.id !== id));
    if (currentDataset?.id === id) {
      setCurrentDataset(null);
      setCurrentData([]);
      setIsDataCleaned(false);
      setCleaningReport(null);
      historyRef.current = [];
      historyIndexRef.current = -1;
    }
    if (isSupabaseConfigured && supabase && user) {
      supabase.from('datasets').delete().eq('id', id).then();
    }
    toast({ title: 'Dataset Deleted', description: 'Dataset removed successfully.' });
  }, [currentDataset, user]);

  return (
    <DataContext.Provider value={{
      datasets, currentDataset, currentData, isLoading, isDataCleaned, cleaningReport,
      uploadData, refreshDatasets, selectDataset, getDatasetData, updateCurrentData, updateCleanedData,
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
