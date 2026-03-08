// Subscription & Credits System Types

export type PlanType = 'free' | 'basic' | 'pro' | 'enterprise';

export interface PlanConfig {
  id: PlanType;
  name: string;
  price: number;
  priceINR: number; // Price in paise for Razorpay
  priceLabel: string;
  maxDatasets: number;
  chartTypes: number;
  credits: number;
  features: string[];
  isUnlimited?: boolean;
  aiModels: string[];
  maxRows: number;
}

export const PLANS: Record<PlanType, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceINR: 0,
    priceLabel: '$0',
    maxDatasets: 1,
    chartTypes: 3,
    credits: 100,
    maxRows: 500,
    aiModels: [], // No AI for free
    features: ['1 dataset', '3 basic charts', '5 credits', 'Data quality scan', 'Basic insights', '500 row limit', 'No AI assistant']
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 5,
    priceINR: 41500, // ~$5 in INR paise
    priceLabel: '$5/mo',
    maxDatasets: 3,
    chartTypes: 8,
    credits: 100,
    maxRows: 5000,
    aiModels: ['grok'],
    features: ['3 datasets', '8 chart types', '100 credits/mo', 'Grok AI assistant', 'CSV export', '5,000 row limit']
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 15,
    priceINR: 124500, // ~$15 in INR paise
    priceLabel: '$15/mo',
    maxDatasets: 10,
    chartTypes: 20,
    credits: 500,
    maxRows: 100000,
    aiModels: ['grok', 'chatgpt'],
    features: ['10 datasets', '20 chart types', '500 credits/mo', 'PDF export', 'Advanced Copilot', 'Forecasting', 'ChatGPT AI', '100K row limit']
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 25,
    priceINR: 207500, // ~$25 in INR paise
    priceLabel: '$25/mo',
    maxDatasets: -1,
    chartTypes: 38,
    credits: -1,
    maxRows: -1,
    isUnlimited: true,
    aiModels: ['grok', 'chatgpt', 'claude'],
    features: ['Unlimited datasets', 'ALL 38 charts', 'Unlimited credits', 'All exports', 'All AI models', 'Geo maps', 'Anomaly detection', 'Team sharing', 'Unlimited rows']
  }
};

export const CREDIT_COSTS = {
  'upload-dataset': 2,
  'quality-scan': 1,
  'generate-insights': 3,
  'copilot-query': 2,
  'render-chart': 1,
  'export-pdf': 5,
  'export-csv': 1,
  'export-png': 1
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

// ALL chart types (50 total)
const ALL_CHARTS = [
  'bar', 'line', 'pie', 'area', 'scatter', 'radar', 'heatmap', 'treemap', 'funnel', 'gauge',
  'boxplot', 'histogram', 'waterfall', 'bubble', 'candlestick', 'sankey', 'sunburst', 'polar', 'stream', 'calendar',
  'geo', 'choropleth', 'network', 'force', 'tree', 'parallel', 'word-cloud', 'timeline', '3d-scatter', '3d-surface',
  'donut', 'stacked-bar', 'grouped-bar', 'stacked-area', 'pareto', 'bullet', 'progress', 'kpi-card',
  // Advanced combinational / statistical charts
  'violin', 'density', 'stripplot', 'swarmplot', 'jointplot', 'rugplot', 'ridgeline',
  'lollipop', 'dumbbell', 'slope', 'marimekko', 'combo',
];

// Chart types available per plan (STRICT)
export const CHART_TYPES_BY_PLAN: Record<PlanType, string[]> = {
  free: ['bar', 'line', 'pie'], // Only 3 basic charts
  basic: ['bar', 'line', 'pie', 'area', 'scatter', 'donut', 'radar', 'heatmap'],
  pro: ['bar', 'line', 'pie', 'area', 'scatter', 'radar', 'heatmap', 'treemap', 'funnel', 'gauge', 
        'boxplot', 'histogram', 'waterfall', 'bubble', 'candlestick', 'sankey', 'sunburst', 'polar', 'stream', 'calendar',
        'violin', 'density', 'lollipop', 'combo'],
  enterprise: ALL_CHARTS,
};

// Features gated by plan (STRICT)
export const FEATURES_BY_PLAN: Record<PlanType, string[]> = {
  free: ['basic-quality', 'basic-insights'], // Very limited - no AI, no export, no copilot
  basic: ['basic-quality', 'advanced-quality', 'basic-insights', 'basic-charts', 'export-csv', 'copilot-basic'],
  pro: ['basic-quality', 'advanced-quality', 'basic-insights', 'advanced-insights', 'basic-charts', 'advanced-charts', 'export-csv', 'export-pdf', 'copilot', 'forecast'],
  enterprise: ['basic-quality', 'advanced-quality', 'basic-insights', 'advanced-insights', 'basic-charts', 'advanced-charts', 'export-csv', 'export-pdf', 'export-pptx', 'copilot', 'copilot-advanced', 'forecast', 
               'geo-maps', 'anomaly-detection', 'advanced-explainability', 'custom-dashboards', 'team-sharing', 'version-history']
};

// Actions that require specific plans
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
