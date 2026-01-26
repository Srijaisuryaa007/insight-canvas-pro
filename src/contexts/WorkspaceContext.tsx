import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Workspace, Dataset, QualityReport, Insight, Visualization } from '@/types';
import { useAuth } from './AuthContext';

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
  const [insights, setInsights] = useState<Record<string, Insight[]>>({});
  const [visualizations, setVisualizations] = useState<Record<string, Visualization[]>>({});

  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`datapulse_workspaces_${user.id}`);
      if (stored) {
        const ws = JSON.parse(stored);
        setWorkspaces(ws);
        if (ws.length > 0) setCurrentWorkspace(ws[0]);
      }
      
      const storedDatasets = localStorage.getItem(`datapulse_datasets_${user.id}`);
      if (storedDatasets) setDatasets(JSON.parse(storedDatasets));
      
      const storedReports = localStorage.getItem(`datapulse_reports_${user.id}`);
      if (storedReports) setQualityReports(JSON.parse(storedReports));
      
      const storedInsights = localStorage.getItem(`datapulse_insights_${user.id}`);
      if (storedInsights) setInsights(JSON.parse(storedInsights));
      
      const storedViz = localStorage.getItem(`datapulse_viz_${user.id}`);
      if (storedViz) setVisualizations(JSON.parse(storedViz));
    }
  }, [user]);

  const persistWorkspaces = (ws: Workspace[]) => {
    if (user) {
      localStorage.setItem(`datapulse_workspaces_${user.id}`, JSON.stringify(ws));
    }
    setWorkspaces(ws);
  };

  const persistDatasets = (ds: Dataset[]) => {
    if (user) {
      localStorage.setItem(`datapulse_datasets_${user.id}`, JSON.stringify(ds));
    }
    setDatasets(ds);
  };

  const createWorkspace = (name: string): Workspace => {
    const workspace: Workspace = {
      id: crypto.randomUUID(),
      name,
      userId: user?.id || '',
      datasets: [],
      createdAt: new Date().toISOString(),
    };
    const updated = [...workspaces, workspace];
    persistWorkspaces(updated);
    setCurrentWorkspace(workspace);
    return workspace;
  };

  const selectWorkspace = (id: string) => {
    const ws = workspaces.find(w => w.id === id);
    if (ws) setCurrentWorkspace(ws);
  };

  const addDataset = (dataset: Dataset) => {
    const updated = [...datasets, dataset];
    persistDatasets(updated);
    setCurrentDataset(dataset);
  };

  const selectDataset = (id: string) => {
    const ds = datasets.find(d => d.id === id);
    if (ds) setCurrentDataset(ds);
  };

  const setQualityReport = (datasetId: string, report: QualityReport) => {
    const updated = { ...qualityReports, [datasetId]: report };
    if (user) {
      localStorage.setItem(`datapulse_reports_${user.id}`, JSON.stringify(updated));
    }
    setQualityReports(updated);
  };

  const setInsightsData = (datasetId: string, newInsights: Insight[]) => {
    const updated = { ...insights, [datasetId]: newInsights };
    if (user) {
      localStorage.setItem(`datapulse_insights_${user.id}`, JSON.stringify(updated));
    }
    setInsights(updated);
  };

  const addVisualization = (viz: Visualization) => {
    const datasetViz = visualizations[viz.datasetId] || [];
    const updated = { ...visualizations, [viz.datasetId]: [...datasetViz, viz] };
    if (user) {
      localStorage.setItem(`datapulse_viz_${user.id}`, JSON.stringify(updated));
    }
    setVisualizations(updated);
  };

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      currentWorkspace,
      datasets,
      currentDataset,
      qualityReports,
      insights,
      visualizations,
      createWorkspace,
      selectWorkspace,
      addDataset,
      selectDataset,
      setQualityReport,
      setInsights: setInsightsData,
      addVisualization,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
