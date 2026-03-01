import { DashboardTemplate, DashboardPage, DEFAULT_THEME, createWidget } from '@/types/dashboard';

function makePage(name: string, widgets: ReturnType<typeof createWidget>[]): DashboardPage {
  return { id: crypto.randomUUID(), name, widgets };
}

function kpi(x: number, y: number, col: string, title: string) {
  return createWidget('kpi', x, y, { kpiColumn: col, title });
}
function chart(x: number, y: number, w: number, h: number, chartType: string, title: string) {
  return createWidget('chart', x, y, { chartType, title });
}
function table(x: number, y: number, title: string) {
  return createWidget('table', x, y, { title });
}
function text(x: number, y: number, content: string) {
  return createWidget('text', x, y, { textContent: content, title: '' });
}

// Patch layout overrides
function w(widget: ReturnType<typeof createWidget>, overrides: Partial<typeof widget.layout>) {
  return { ...widget, layout: { ...widget.layout, ...overrides } };
}

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: 'executive-overview', name: 'Executive Overview', category: 'Business',
    description: 'High-level KPIs with trend lines and summary charts for C-suite reporting.',
    thumbnail: '📊',
    theme: DEFAULT_THEME,
    pages: [makePage('Overview', [
      kpi(0, 0, '', 'Revenue'), kpi(3, 0, '', 'Customers'), kpi(6, 0, '', 'Growth'), kpi(9, 0, '', 'Margin'),
      w(chart(0, 2, 6, 4, 'line', 'Revenue Trend'), { w: 6, h: 4 }),
      w(chart(6, 2, 6, 4, 'pie', 'Revenue Split'), { w: 6, h: 4 }),
      w(table(0, 6, 'Top Metrics'), { w: 12 }),
    ])],
  },
  {
    id: 'sales-performance', name: 'Sales Performance', category: 'Sales',
    description: 'Track sales pipeline, conversion rates, and rep performance.',
    thumbnail: '💰',
    theme: DEFAULT_THEME,
    pages: [makePage('Sales', [
      kpi(0, 0, '', 'Total Sales'), kpi(3, 0, '', 'Avg Deal'), kpi(6, 0, '', 'Win Rate'), kpi(9, 0, '', 'Pipeline'),
      w(chart(0, 2, 8, 4, 'bar', 'Sales by Rep'), { w: 8, h: 4 }),
      w(chart(8, 2, 4, 4, 'funnel', 'Sales Funnel'), { w: 4, h: 4 }),
      w(chart(0, 6, 12, 4, 'area', 'Monthly Trend'), { w: 12, h: 4 }),
    ])],
  },
  {
    id: 'marketing-funnel', name: 'Marketing Funnel', category: 'Marketing',
    description: 'Visualize acquisition, conversion, and retention metrics.',
    thumbnail: '📈',
    theme: DEFAULT_THEME,
    pages: [makePage('Funnel', [
      kpi(0, 0, '', 'Impressions'), kpi(3, 0, '', 'Clicks'), kpi(6, 0, '', 'Conversions'), kpi(9, 0, '', 'CAC'),
      w(chart(0, 2, 6, 5, 'funnel', 'Conversion Funnel'), { w: 6, h: 5 }),
      w(chart(6, 2, 6, 5, 'line', 'Campaign Performance'), { w: 6, h: 5 }),
    ])],
  },
  {
    id: 'finance-summary', name: 'Finance Summary', category: 'Finance',
    description: 'P&L overview with waterfall charts and budget tracking.',
    thumbnail: '🏦',
    theme: DEFAULT_THEME,
    pages: [makePage('Finance', [
      kpi(0, 0, '', 'Revenue'), kpi(3, 0, '', 'Expenses'), kpi(6, 0, '', 'Net Income'), kpi(9, 0, '', 'Cash Flow'),
      w(chart(0, 2, 6, 4, 'waterfall', 'P&L Waterfall'), { w: 6, h: 4 }),
      w(chart(6, 2, 6, 4, 'bar', 'Budget vs Actual'), { w: 6, h: 4 }),
    ])],
  },
  {
    id: 'operations-monitor', name: 'Operations Monitoring', category: 'Operations',
    description: 'Real-time operations dashboard with gauges and alerts.',
    thumbnail: '⚙️',
    theme: DEFAULT_THEME,
    pages: [makePage('Ops', [
      kpi(0, 0, '', 'Uptime'), kpi(3, 0, '', 'Throughput'), kpi(6, 0, '', 'Errors'), kpi(9, 0, '', 'Latency'),
      w(chart(0, 2, 4, 4, 'gauge', 'System Health'), { w: 4, h: 4 }),
      w(chart(4, 2, 8, 4, 'line', 'Performance Over Time'), { w: 8, h: 4 }),
    ])],
  },
  {
    id: 'product-analytics', name: 'Product Analytics', category: 'Product',
    description: 'User engagement, feature adoption, and retention analysis.',
    thumbnail: '🚀',
    theme: DEFAULT_THEME,
    pages: [makePage('Product', [
      kpi(0, 0, '', 'DAU'), kpi(3, 0, '', 'MAU'), kpi(6, 0, '', 'Retention'), kpi(9, 0, '', 'Churn'),
      w(chart(0, 2, 6, 4, 'area', 'User Growth'), { w: 6, h: 4 }),
      w(chart(6, 2, 6, 4, 'bar', 'Feature Usage'), { w: 6, h: 4 }),
    ])],
  },
  {
    id: 'customer-analytics', name: 'Customer Analytics', category: 'Customer',
    description: 'Customer segmentation, LTV, and satisfaction metrics.',
    thumbnail: '👥',
    theme: DEFAULT_THEME,
    pages: [makePage('Customers', [
      kpi(0, 0, '', 'Total Customers'), kpi(3, 0, '', 'Avg LTV'), kpi(6, 0, '', 'NPS'), kpi(9, 0, '', 'Churn Rate'),
      w(chart(0, 2, 6, 4, 'pie', 'Segments'), { w: 6, h: 4 }),
      w(chart(6, 2, 6, 4, 'scatter', 'LTV vs Spend'), { w: 6, h: 4 }),
    ])],
  },
  {
    id: 'regional-performance', name: 'Regional Performance', category: 'Business',
    description: 'Compare performance metrics across geographic regions.',
    thumbnail: '🌍',
    theme: DEFAULT_THEME,
    pages: [makePage('Regions', [
      kpi(0, 0, '', 'Top Region'), kpi(3, 0, '', 'Total Markets'), kpi(6, 0, '', 'Growth'), kpi(9, 0, '', 'Coverage'),
      w(chart(0, 2, 12, 5, 'bar', 'Revenue by Region'), { w: 12, h: 5 }),
    ])],
  },
  {
    id: 'hr-dashboard', name: 'HR & People', category: 'HR',
    description: 'Headcount, attrition, and employee satisfaction tracking.',
    thumbnail: '🧑‍💼',
    theme: DEFAULT_THEME,
    pages: [makePage('People', [
      kpi(0, 0, '', 'Headcount'), kpi(3, 0, '', 'Attrition'), kpi(6, 0, '', 'Satisfaction'), kpi(9, 0, '', 'Open Roles'),
      w(chart(0, 2, 6, 4, 'bar', 'Dept Distribution'), { w: 6, h: 4 }),
      w(chart(6, 2, 6, 4, 'line', 'Headcount Trend'), { w: 6, h: 4 }),
    ])],
  },
  {
    id: 'supply-chain', name: 'Supply Chain', category: 'Operations',
    description: 'Inventory levels, lead times, and supplier performance.',
    thumbnail: '📦',
    theme: DEFAULT_THEME,
    pages: [makePage('Supply', [
      kpi(0, 0, '', 'Inventory'), kpi(3, 0, '', 'Lead Time'), kpi(6, 0, '', 'Fill Rate'), kpi(9, 0, '', 'On-Time'),
      w(chart(0, 2, 6, 4, 'bar', 'Stock Levels'), { w: 6, h: 4 }),
      w(chart(6, 2, 6, 4, 'line', 'Delivery Trend'), { w: 6, h: 4 }),
    ])],
  },
  {
    id: 'ecommerce', name: 'E-Commerce', category: 'Sales',
    description: 'Revenue, orders, AOV, and product performance for online stores.',
    thumbnail: '🛒',
    theme: DEFAULT_THEME,
    pages: [makePage('Store', [
      kpi(0, 0, '', 'Revenue'), kpi(3, 0, '', 'Orders'), kpi(6, 0, '', 'AOV'), kpi(9, 0, '', 'Cart Abandon'),
      w(chart(0, 2, 8, 4, 'bar', 'Top Products'), { w: 8, h: 4 }),
      w(chart(8, 2, 4, 4, 'pie', 'Categories'), { w: 4, h: 4 }),
    ])],
  },
  {
    id: 'saas-metrics', name: 'SaaS Metrics', category: 'Product',
    description: 'MRR, ARR, churn, expansion, and unit economics.',
    thumbnail: '💎',
    theme: DEFAULT_THEME,
    pages: [makePage('SaaS', [
      kpi(0, 0, '', 'MRR'), kpi(3, 0, '', 'ARR'), kpi(6, 0, '', 'Churn'), kpi(9, 0, '', 'ARPU'),
      w(chart(0, 2, 6, 4, 'area', 'MRR Growth'), { w: 6, h: 4 }),
      w(chart(6, 2, 6, 4, 'waterfall', 'MRR Movement'), { w: 6, h: 4 }),
    ])],
  },
  {
    id: 'project-management', name: 'Project Management', category: 'Operations',
    description: 'Task completion, team velocity, and milestone tracking.',
    thumbnail: '📋',
    theme: DEFAULT_THEME,
    pages: [makePage('Projects', [
      kpi(0, 0, '', 'Tasks Done'), kpi(3, 0, '', 'In Progress'), kpi(6, 0, '', 'Velocity'), kpi(9, 0, '', 'On Track'),
      w(chart(0, 2, 6, 4, 'bar', 'Tasks by Status'), { w: 6, h: 4 }),
      w(chart(6, 2, 6, 4, 'line', 'Sprint Velocity'), { w: 6, h: 4 }),
    ])],
  },
  {
    id: 'social-media', name: 'Social Media', category: 'Marketing',
    description: 'Engagement, followers, reach, and content performance.',
    thumbnail: '📱',
    theme: DEFAULT_THEME,
    pages: [makePage('Social', [
      kpi(0, 0, '', 'Followers'), kpi(3, 0, '', 'Engagement'), kpi(6, 0, '', 'Reach'), kpi(9, 0, '', 'Posts'),
      w(chart(0, 2, 6, 4, 'line', 'Follower Growth'), { w: 6, h: 4 }),
      w(chart(6, 2, 6, 4, 'bar', 'Engagement by Post'), { w: 6, h: 4 }),
    ])],
  },
  {
    id: 'quality-assurance', name: 'Quality Assurance', category: 'Engineering',
    description: 'Bug tracking, test coverage, and release quality.',
    thumbnail: '🐛',
    theme: DEFAULT_THEME,
    pages: [makePage('QA', [
      kpi(0, 0, '', 'Open Bugs'), kpi(3, 0, '', 'Coverage'), kpi(6, 0, '', 'Pass Rate'), kpi(9, 0, '', 'P1 Issues'),
      w(chart(0, 2, 6, 4, 'bar', 'Bugs by Severity'), { w: 6, h: 4 }),
      w(chart(6, 2, 6, 4, 'area', 'Bug Trend'), { w: 6, h: 4 }),
    ])],
  },
  {
    id: 'energy-utilities', name: 'Energy & Utilities', category: 'Industry',
    description: 'Consumption patterns, grid performance, and cost analysis.',
    thumbnail: '⚡',
    theme: DEFAULT_THEME,
    pages: [makePage('Energy', [
      kpi(0, 0, '', 'Consumption'), kpi(3, 0, '', 'Cost'), kpi(6, 0, '', 'Peak Load'), kpi(9, 0, '', 'Efficiency'),
      w(chart(0, 2, 12, 5, 'area', 'Consumption Over Time'), { w: 12, h: 5 }),
    ])],
  },
  {
    id: 'healthcare', name: 'Healthcare Analytics', category: 'Industry',
    description: 'Patient metrics, outcomes, and resource utilization.',
    thumbnail: '🏥',
    theme: DEFAULT_THEME,
    pages: [makePage('Health', [
      kpi(0, 0, '', 'Patients'), kpi(3, 0, '', 'Avg Stay'), kpi(6, 0, '', 'Readmission'), kpi(9, 0, '', 'Satisfaction'),
      w(chart(0, 2, 6, 4, 'bar', 'By Department'), { w: 6, h: 4 }),
      w(chart(6, 2, 6, 4, 'line', 'Admissions Trend'), { w: 6, h: 4 }),
    ])],
  },
  {
    id: 'real-estate', name: 'Real Estate', category: 'Industry',
    description: 'Property values, occupancy rates, and market trends.',
    thumbnail: '🏠',
    theme: DEFAULT_THEME,
    pages: [makePage('Properties', [
      kpi(0, 0, '', 'Properties'), kpi(3, 0, '', 'Avg Price'), kpi(6, 0, '', 'Occupancy'), kpi(9, 0, '', 'Revenue'),
      w(chart(0, 2, 6, 4, 'scatter', 'Price vs Size'), { w: 6, h: 4 }),
      w(chart(6, 2, 6, 4, 'bar', 'By Location'), { w: 6, h: 4 }),
    ])],
  },
  {
    id: 'education', name: 'Education Dashboard', category: 'Industry',
    description: 'Student performance, enrollment, and course analytics.',
    thumbnail: '🎓',
    theme: DEFAULT_THEME,
    pages: [makePage('Education', [
      kpi(0, 0, '', 'Students'), kpi(3, 0, '', 'Avg Grade'), kpi(6, 0, '', 'Pass Rate'), kpi(9, 0, '', 'Courses'),
      w(chart(0, 2, 6, 4, 'bar', 'Grades Distribution'), { w: 6, h: 4 }),
      w(chart(6, 2, 6, 4, 'line', 'Enrollment Trend'), { w: 6, h: 4 }),
    ])],
  },
  {
    id: 'blank', name: 'Blank Canvas', category: 'Custom',
    description: 'Start from scratch with an empty canvas.',
    thumbnail: '🎨',
    theme: DEFAULT_THEME,
    pages: [makePage('Page 1', [])],
  },
];
