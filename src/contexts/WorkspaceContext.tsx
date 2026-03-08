import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Workspace, Dataset, QualityReport, Insight, Visualization } from '@/types';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  datasets: Dataset[];
  currentDataset: Dataset | null;
  qualityReports: Record<string, QualityReport>;
  insights: Record<string, Insight[]>;
  visualizations: Record<string, Visualization[]>;
  createWorkspace: (name: string) => Workspace;
  selectWorkspace: (id: string) => void;
  addDataset: (dataset: Dataset) => void;
  selectDataset: (id: string) => void;
  setQualityReport: (datasetId: string, report: QualityReport) => void;
  setInsights: (datasetId: string, insights: Insight[]) => void;
  addVisualization: (viz: Visualization) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [currentDataset, setCurrentDataset] = useState<Dataset | null>(null);
  const [qualityReports, setQualityReports] = useState<Record<string, QualityReport>>({});
  const [insights, setInsightsState] = useState<Record<string, Insight[]>>({});
  const [visualizations, setVisualizations] = useState<Record<string, Visualization[]>>({});

  // Load from Supabase on user change
  useEffect(() => {
    if (!user || !isSupabaseConfigured || !supabase) return;

    const loadData = async () => {
      // Load workspaces
      const { data: ws } = await supabase.from('workspaces').select('*').eq('user_id', user.id).order('created_at');
      if (ws) {
        const mapped = ws.map(w => ({ id: w.id, name: w.name, userId: w.user_id, datasets: [], createdAt: w.created_at }));
        setWorkspaces(mapped);
        if (mapped.length > 0) setCurrentWorkspace(mapped[0]);
      }

      // Load datasets
      const { data: ds } = await supabase.from('datasets').select('*').eq('user_id', user.id).order('created_at');
      if (ds) {
        const mapped = ds.map(d => ({
          id: d.id, name: d.dataset_name, fileName: d.file_name,
          rowCount: d.row_count, columns: d.columns || [], qualityScore: d.quality_score,
          uploadedAt: d.created_at, data: [], datasetId: d.id,
        }));
        setDatasets(mapped as any);
      }

      // Load quality reports
      const { data: qr } = await supabase.from('quality_reports').select('*').eq('user_id', user.id);
      if (qr) {
        const mapped: Record<string, QualityReport> = {};
        qr.forEach(r => { mapped[r.dataset_id] = r.report_data as QualityReport; });
        setQualityReports(mapped);
      }

      // Load insights
      const { data: ins } = await supabase.from('insights').select('*').eq('user_id', user.id);
      if (ins) {
        const mapped: Record<string, Insight[]> = {};
        ins.forEach(r => { mapped[r.dataset_id] = r.insights_data as Insight[]; });
        setInsightsState(mapped);
      }

      // Load visualizations
      const { data: viz } = await supabase.from('visualizations').select('*').eq('user_id', user.id);
      if (viz) {
        const mapped: Record<string, Visualization[]> = {};
        viz.forEach(r => {
          const datasetId = r.dataset_id;
          if (!mapped[datasetId]) mapped[datasetId] = [];
          mapped[datasetId].push(r.viz_data as Visualization);
        });
        setVisualizations(mapped);
      }
    };

    loadData();
  }, [user]);

  const createWorkspace = useCallback((name: string): Workspace => {
    const workspace: Workspace = {
      id: crypto.randomUUID(),
      name,
      userId: user?.id || '',
      datasets: [],
      createdAt: new Date().toISOString(),
    };
    setWorkspaces(prev => [...prev, workspace]);
    setCurrentWorkspace(workspace);

    if (isSupabaseConfigured && supabase && user) {
      supabase.from('workspaces').insert({ id: workspace.id, user_id: user.id, name }).then();
    }
    return workspace;
  }, [user]);

  const selectWorkspace = (id: string) => {
    const ws = workspaces.find(w => w.id === id);
    if (ws) setCurrentWorkspace(ws);
  };

  const addDataset = useCallback((dataset: Dataset) => {
    setDatasets(prev => [...prev, dataset]);
    setCurrentDataset(dataset);

    if (isSupabaseConfigured && supabase && user) {
      supabase.from('datasets').insert({
        id: dataset.id, user_id: user.id, dataset_name: (dataset as any).name || dataset.id,
        file_name: (dataset as any).fileName, row_count: (dataset as any).rowCount || 0,
        columns: (dataset as any).columns || [], quality_score: (dataset as any).qualityScore,
      }).then();
    }
  }, [user]);

  const selectDataset = (id: string) => {
    const ds = datasets.find(d => d.id === id);
    if (ds) setCurrentDataset(ds);
  };

  const setQualityReport = useCallback((datasetId: string, report: QualityReport) => {
    setQualityReports(prev => ({ ...prev, [datasetId]: report }));

    if (isSupabaseConfigured && supabase && user) {
      supabase.from('quality_reports').upsert({
        user_id: user.id, dataset_id: datasetId, report_data: report,
      }, { onConflict: 'user_id,dataset_id' }).then();
    }
  }, [user]);

  const setInsightsData = useCallback((datasetId: string, newInsights: Insight[]) => {
    setInsightsState(prev => ({ ...prev, [datasetId]: newInsights }));

    if (isSupabaseConfigured && supabase && user) {
      supabase.from('insights').upsert({
        user_id: user.id, dataset_id: datasetId, insights_data: newInsights,
      }, { onConflict: 'user_id,dataset_id' }).then();
    }
  }, [user]);

  const addVisualization = useCallback((viz: Visualization) => {
    setVisualizations(prev => {
      const datasetViz = prev[viz.datasetId] || [];
      return { ...prev, [viz.datasetId]: [...datasetViz, viz] };
    });

    if (isSupabaseConfigured && supabase && user) {
      supabase.from('visualizations').insert({
        user_id: user.id, dataset_id: viz.datasetId, viz_data: viz,
      }).then();
    }
  }, [user]);

  return (
    <WorkspaceContext.Provider value={{
      workspaces, currentWorkspace, datasets, currentDataset,
      qualityReports, insights, visualizations,
      createWorkspace, selectWorkspace, addDataset, selectDataset,
      setQualityReport, setInsights: setInsightsData, addVisualization,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return context;
}
