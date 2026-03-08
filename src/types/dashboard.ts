// Dashboard Runtime Schema — JSON-driven, renderer-agnostic

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'kpi' | 'table' | 'text' | 'filter' | 'image';
  // Grid position (react-grid-layout compatible)
  layout: { x: number; y: number; w: number; h: number; minW?: number; minH?: number };
  // Chart/KPI config
  config: WidgetConfig;
}

export interface WidgetConfig {
  chartType?: string;
  title?: string;
  xAxis?: string;
  yAxis?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  colorPalette?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  showLabels?: boolean;
  // Field wells (Power BI-style)
  values?: string[];
  legend?: string;
  tooltip?: string[];
  details?: string[];
  smallMultiples?: string;
  filters?: string[];
  rows?: string[];
  columns?: string[];
  drillThrough?: string[];
  secondaryYAxis?: string;
  // KPI
  kpiColumn?: string;
  kpiFormat?: 'number' | 'currency' | 'percent';
  // Text
  textContent?: string;
  textSize?: 'sm' | 'md' | 'lg' | 'xl';
  // Table
  tableColumns?: string[];
  tableRowLimit?: number;
  // Filter
  filterColumn?: string;
  // Conditional formatting
  conditionalRules?: ConditionalRule[];
  // Sort
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface ConditionalRule {
  field: string;
  operator: '>' | '<' | '=' | '>=' | '<=' | '!=';
  value: number;
  color: string;
}

export interface DashboardPage {
  id: string;
  name: string;
  widgets: DashboardWidget[];
}

export interface DashboardSchema {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  pages: DashboardPage[];
  theme: DashboardTheme;
  // Global filters applied to all widgets
  globalFilters: Record<string, string>;
}

export interface DashboardTheme {
  colorPalette: string;
  gridBackground: string;
  widgetBackground: string;
  accentColor: string;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: string; // emoji
  pages: DashboardPage[];
  theme: DashboardTheme;
}

// History entry for undo/redo
export interface DashboardHistoryEntry {
  pages: DashboardPage[];
  timestamp: number;
}

export const DEFAULT_THEME: DashboardTheme = {
  colorPalette: 'default',
  gridBackground: 'hsl(var(--background))',
  widgetBackground: 'hsl(var(--card))',
  accentColor: 'hsl(var(--primary))',
};

export function createWidget(type: DashboardWidget['type'], x: number, y: number, config?: Partial<WidgetConfig>): DashboardWidget {
  const defaults: Record<string, { w: number; h: number; minW: number; minH: number }> = {
    chart: { w: 6, h: 4, minW: 3, minH: 3 },
    kpi: { w: 3, h: 2, minW: 2, minH: 2 },
    table: { w: 12, h: 4, minW: 4, minH: 3 },
    text: { w: 4, h: 2, minW: 2, minH: 1 },
    filter: { w: 3, h: 2, minW: 2, minH: 1 },
    image: { w: 4, h: 3, minW: 2, minH: 2 },
  };
  const d = defaults[type] || defaults.chart;
  return {
    id: crypto.randomUUID(),
    type,
    layout: { x, y, ...d },
    config: {
      title: type === 'kpi' ? 'KPI' : type === 'chart' ? 'Chart' : type === 'table' ? 'Data Table' : '',
      chartType: type === 'chart' ? 'bar' : undefined,
      showLegend: true,
      showGrid: true,
      colorPalette: 'default',
      ...config,
    },
  };
}
