// Core Types for DataPulse Analytics

export type SubscriptionPlan = 'free' | 'pro' | 'enterprise';

export type ChartType = 
  | 'bar' 
  | 'line' 
  | 'area' 
  | 'scatter' 
  | 'pie' 
  | 'heatmap' 
  | 'boxplot' 
  | 'radar' 
  | 'treemap'
  | 'geo';

export type AddonType = 'forecast' | 'anomaly' | 'geo-maps';

export interface User {
  id: string;
  email: string;
  name: string;
  plan: SubscriptionPlan;
  credits: number;
  addons: AddonType[];
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  userId: string;
  datasets: string[];
  createdAt: string;
}

export interface DatasetColumn {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  nullable: boolean;
  uniqueValues: number;
  sampleValues: unknown[];
}

export interface Dataset {
  id: string;
  name: string;
  workspaceId: string;
  fileName: string;
  rowCount: number;
  columns: DatasetColumn[];
  uploadedAt: string;
  qualityScore?: number;
}

export interface QualityIssue {
  column: string;
  type: 'missing' | 'duplicate' | 'outlier' | 'invalid';
  severity: 'low' | 'medium' | 'high';
  count: number;
  percentage: number;
  suggestion: string;
}

export interface QualityReport {
  datasetId: string;
  overallScore: number;
  issues: QualityIssue[];
  scannedAt: string;
}

export interface Insight {
  id: string;
  datasetId: string;
  type: 'trend' | 'correlation' | 'anomaly' | 'distribution';
  title: string;
  description: string;
  confidence: number;
  chartType: ChartType;
  config: Record<string, unknown>;
}

export interface Visualization {
  id: string;
  datasetId: string;
  chartType: ChartType;
  title: string;
  xAxis?: string;
  yAxis?: string;
  config: Record<string, unknown>;
}

export interface CreditAction {
  action: string;
  cost: number;
}

export const CREDIT_COSTS: Record<string, number> = {
  'upload-dataset': 5,
  'quality-scan': 10,
  'generate-insights': 15,
  'render-chart': 2,
  'forecast': 25,
  'copilot-query': 5,
  'anomaly-detection': 20,
};

export const PLAN_LIMITS: Record<SubscriptionPlan, {
  maxDatasets: number;
  charts: ChartType[];
  features: string[];
  creditsPerMonth: number;
}> = {
  free: {
    maxDatasets: 1,
    charts: ['bar', 'line'],
    features: ['basic-quality'],
    creditsPerMonth: 100,
  },
  pro: {
    maxDatasets: -1, // unlimited
    charts: ['bar', 'line', 'area', 'scatter', 'pie', 'heatmap'],
    features: ['basic-quality', 'advanced-quality', 'export-pdf', 'forecast'],
    creditsPerMonth: 1000,
  },
  enterprise: {
    maxDatasets: -1,
    charts: ['bar', 'line', 'area', 'scatter', 'pie', 'heatmap', 'boxplot', 'radar', 'treemap', 'geo'],
    features: ['basic-quality', 'advanced-quality', 'export-pdf', 'forecast', 'anomaly', 'rag-copilot', 'team-sharing'],
    creditsPerMonth: -1, // unlimited
  },
};

export const CHART_LABELS: Record<ChartType, string> = {
  bar: 'Bar Chart',
  line: 'Line Chart',
  area: 'Area Chart',
  scatter: 'Scatter Plot',
  pie: 'Pie Chart',
  heatmap: 'Heatmap',
  boxplot: 'Box Plot',
  radar: 'Radar Chart',
  treemap: 'Treemap',
  geo: 'Geo Map',
};
