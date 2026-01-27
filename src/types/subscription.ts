// Subscription & Credits System Types

export type PlanType = 'free' | 'basic' | 'pro' | 'enterprise';

export interface PlanConfig {
  id: PlanType;
  name: string;
  price: number;
  priceLabel: string;
  maxDatasets: number;
  chartTypes: number;
  credits: number;
  features: string[];
  isUnlimited?: boolean;
}

export const PLANS: Record<PlanType, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '$0',
    maxDatasets: 1,
    chartTypes: 5,
    credits: 10,
    features: ['1 dataset', '5 chart types', '10 credits']
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 5,
    priceLabel: '$5/mo',
    maxDatasets: 3,
    chartTypes: 10,
    credits: 200,
    features: ['3 datasets', '10 chart types', '200 credits']
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 15,
    priceLabel: '$15/mo',
    maxDatasets: -1,
    chartTypes: 20,
    credits: 1000,
    features: ['Unlimited datasets', '20 chart types', '1000 credits', 'PDF export', 'Copilot', 'Forecast']
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 25,
    priceLabel: '$25/mo',
    maxDatasets: -1,
    chartTypes: 30,
    credits: -1,
    isUnlimited: true,
    features: ['Unlimited datasets', 'ALL 30 chart types', 'Unlimited credits', 'Geo maps', 'Anomaly detection', 'Advanced explainability', 'Custom dashboards']
  }
};

export const CREDIT_COSTS = {
  'upload-dataset': 5,
  'quality-scan': 10,
  'generate-insights': 20,
  'copilot-query': 5,
  'render-chart': 1,
  'export-pdf': 10,
  'export-csv': 2,
  'export-png': 2
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

// Chart types available per plan
export const CHART_TYPES_BY_PLAN: Record<PlanType, string[]> = {
  free: ['bar', 'line', 'pie', 'area', 'scatter'],
  basic: ['bar', 'line', 'pie', 'area', 'scatter', 'radar', 'heatmap', 'treemap', 'funnel', 'gauge'],
  pro: ['bar', 'line', 'pie', 'area', 'scatter', 'radar', 'heatmap', 'treemap', 'funnel', 'gauge', 
        'boxplot', 'histogram', 'waterfall', 'bubble', 'candlestick', 'sankey', 'sunburst', 'polar', 'stream', 'calendar'],
  enterprise: ['bar', 'line', 'pie', 'area', 'scatter', 'radar', 'heatmap', 'treemap', 'funnel', 'gauge',
               'boxplot', 'histogram', 'waterfall', 'bubble', 'candlestick', 'sankey', 'sunburst', 'polar', 'stream', 'calendar',
               'geo', 'choropleth', 'network', 'force', 'tree', 'parallel', 'word-cloud', 'timeline', '3d-scatter', '3d-surface']
};

// Features gated by plan
export const FEATURES_BY_PLAN: Record<PlanType, string[]> = {
  free: ['basic-quality', 'basic-charts'],
  basic: ['basic-quality', 'basic-charts', 'advanced-charts'],
  pro: ['basic-quality', 'advanced-quality', 'basic-charts', 'advanced-charts', 'export-pdf', 'copilot', 'forecast'],
  enterprise: ['basic-quality', 'advanced-quality', 'basic-charts', 'advanced-charts', 'export-pdf', 'copilot', 'forecast', 
               'geo-maps', 'anomaly-detection', 'advanced-explainability', 'custom-dashboards', 'team-sharing']
};
