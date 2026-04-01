// Subscription & Credits System Types

export type PlanType = 'free' | 'basic' | 'pro' | 'enterprise';

export interface PlanConfig {
  id: PlanType;
  name: string;
  price: number;
  priceINR: number;
  priceLabel: string;
  maxDatasets: number;
  chartTypes: number;
  credits: number;
  features: string[];
  excludedFeatures?: string[];
  isUnlimited?: boolean;
  aiModels: string[];
  maxRows: number;
  maxStorageMB: number;
  hasPersistentStorage: boolean;
}

export const PLANS: Record<PlanType, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceINR: 0,
    priceLabel: '₹0',
    maxDatasets: 1,
    chartTypes: 3,
    credits: 100,
    maxRows: 500,
    maxStorageMB: 5,
    hasPersistentStorage: false,
    aiModels: [],
    features: ['1 dataset', '3 basic charts', '5 credits', 'Data quality scan', 'Basic insights', '500 row limit'],
    excludedFeatures: ['No AI assistant', 'No persistent storage', '5MB upload limit'],
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 415,
    priceINR: 41500,
    priceLabel: '₹415/mo',
    maxDatasets: 3,
    chartTypes: 8,
    credits: 100,
    maxRows: 5000,
    maxStorageMB: 100,
    hasPersistentStorage: true,
    aiModels: ['grok'],
    features: ['3 datasets', '8 chart types', '100 credits/mo', 'Grok AI assistant', 'CSV export', '5,000 row limit', '100MB storage'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 1245,
    priceINR: 124500,
    priceLabel: '₹1,245/mo',
    maxDatasets: 10,
    chartTypes: 20,
    credits: 500,
    maxRows: 100000,
    maxStorageMB: 3072,
    hasPersistentStorage: true,
    aiModels: ['grok', 'chatgpt'],
    features: ['10 datasets', '20 chart types', '500 credits/mo', 'PDF export', 'Advanced Copilot', 'Web Scraping', 'ChatGPT AI', '100K row limit', '3GB storage'],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 2075,
    priceINR: 207500,
    priceLabel: '₹2,075/mo',
    maxDatasets: -1,
    chartTypes: 38,
    credits: -1,
    maxRows: -1,
    maxStorageMB: -1,
    hasPersistentStorage: true,
    isUnlimited: true,
    aiModels: ['grok', 'chatgpt', 'claude'],
    features: ['Unlimited datasets', 'ALL 38 charts', 'Unlimited credits', 'All exports', 'All AI models', 'Geo maps', 'Anomaly detection', 'Team sharing', 'Unlimited rows', 'Unlimited storage'],
  }
};

export const CREDIT_COSTS = {
  'upload-dataset': 2,
  'quality-scan': 1,
  'generate-insights': 3,
  'copilot-query': 2,
  'render-chart': 1,
  'export-pdf': 5,
  'export-pptx': 8,
  'export-docx': 5,
  'export-csv': 1,
  'export-png': 1
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

const ALL_CHARTS = [
  'bar', 'line', 'pie', 'area', 'scatter', 'radar', 'heatmap', 'treemap', 'funnel', 'gauge',
  'boxplot', 'histogram', 'waterfall', 'bubble', 'candlestick', 'sankey', 'sunburst', 'polar', 'stream', 'calendar',
  'geo', 'choropleth', 'network', 'force', 'tree', 'parallel', 'word-cloud', 'timeline', '3d-scatter', '3d-surface',
  'donut', 'stacked-bar', 'grouped-bar', 'stacked-area', 'pareto', 'bullet', 'progress', 'kpi-card',
  'violin', 'density', 'stripplot', 'swarmplot', 'jointplot', 'rugplot', 'ridgeline',
  'lollipop', 'dumbbell', 'slope', 'marimekko', 'combo',
];

export const CHART_TYPES_BY_PLAN: Record<PlanType, string[]> = {
  free: ['bar', 'line', 'pie'],
  basic: ['bar', 'line', 'pie', 'area', 'scatter', 'donut', 'radar', 'heatmap'],
  pro: ['bar', 'line', 'pie', 'area', 'scatter', 'radar', 'heatmap', 'treemap', 'funnel', 'gauge', 
        'boxplot', 'histogram', 'waterfall', 'bubble', 'candlestick', 'sankey', 'sunburst', 'polar', 'stream', 'calendar',
        'violin', 'density', 'lollipop', 'combo'],
  enterprise: ALL_CHARTS,
};

export const FEATURES_BY_PLAN: Record<PlanType, string[]> = {
  free: ['basic-quality', 'basic-insights'],
  basic: ['basic-quality', 'advanced-quality', 'basic-insights', 'basic-charts', 'export-csv', 'copilot-basic'],
  pro: ['basic-quality', 'advanced-quality', 'basic-insights', 'advanced-insights', 'basic-charts', 'advanced-charts', 'export-csv', 'export-pdf', 'copilot', 'forecast'],
  enterprise: ['basic-quality', 'advanced-quality', 'basic-insights', 'advanced-insights', 'basic-charts', 'advanced-charts', 'export-csv', 'export-pdf', 'export-pptx', 'copilot', 'copilot-advanced', 'forecast', 
               'geo-maps', 'anomaly-detection', 'advanced-explainability', 'custom-dashboards', 'team-sharing', 'version-history']
};

export const PLAN_REQUIRED_FOR_ACTION: Record<string, PlanType> = {
  'copilot': 'basic',
  'copilot-query': 'basic',
  'ai-assistant': 'basic',
  'export-pdf': 'pro',
  'export-pptx': 'enterprise',
  'forecast': 'pro',
  'anomaly-detection': 'enterprise',
  'geo-maps': 'enterprise',
  'team-sharing': 'enterprise',
  'version-history': 'enterprise',
};
