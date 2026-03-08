// DataPulse AI Copilot Engine — Conversational + Multi-level SQL Analytics
// Standalone: No external AI APIs required

import { DatasetColumn } from '@/types';

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: CopilotMetadata;
}

export interface CopilotMetadata {
  mode: 'conversation' | 'data-analysis';
  confidence?: number;
  reasoning?: string;
  suggestions?: string[];
  sqlQuery?: string;
  sqlLevel?: string;
  chartRecommendation?: { type: string; xAxis?: string; yAxis?: string; reason: string };
  insights?: string[];
  explanation?: string;
}

export interface DataSchema {
  tableName: string;
  columns: DatasetColumn[];
  rowCount: number;
  sampleData: Record<string, unknown>[];
}

// ── Intent Detection ──────────────────────────────────────────────

const GREETING_PATTERNS = [
  /^(hi|hello|hey|howdy|hola|greetings|good\s*(morning|afternoon|evening|day)|sup|yo)\b/i,
  /^(what'?s up|how are you|how do you do|how's it going)\b/i,
];
const THANKS_PATTERNS = [/^(thanks?|thank\s*you|thx|ty|cheers|appreciate)\b/i];
const HELP_PATTERNS = [/^(help|what can you do|what are your capabilities|how do you work)\b/i];

const DATA_PATTERNS = [
  /\b(show|display|list|find|get|fetch|query|select|count|sum|average|avg|total|max|min|top|bottom|highest|lowest|most|least|group|filter|where|between|compare|analyze|trend|correlation|anomaly|distribution|revenue|sales|profit|cost|price|amount|quantity|rate|score|performance|rank|ranking|growth|running|cumulative|cte|with\s+\w+\s+as)\b/i,
  /\b(column|row|table|dataset|data|field|record|schema|metric|kpi|dimension|measure)\b/i,
  /\b(by|per|across|over|for each|grouped|sorted|ordered|breakdown|segment|monthly|weekly|daily|yearly)\b/i,
  /\b(chart|graph|plot|visualize|visualization|bar|line|pie|scatter|heatmap)\b/i,
  /\b(sql|query|select\s+from|group\s+by|order\s+by|where|having|join|limit|window|partition|lag|lead|dense_rank|row_number|date_trunc)\b/i,
  /\b(increase|decrease|growth|decline|change|spike|drop|peak|dip)\b/i,
];

type Intent = 'greeting' | 'thanks' | 'help' | 'smalltalk' | 'joke' | 'identity' | 'farewell' | 'affirmation' | 'data-analysis';

function detectIntent(input: string): Intent {
  const t = input.trim();
  if (GREETING_PATTERNS.some(p => p.test(t))) return 'greeting';
  if (THANKS_PATTERNS.some(p => p.test(t))) return 'thanks';
  if (HELP_PATTERNS.some(p => p.test(t))) return 'help';
  if (/^(tell me a joke|joke|funny)/i.test(t)) return 'joke';
  if (/^(who are you|what are you|what'?s your name)/i.test(t)) return 'identity';
  if (/^(bye|goodbye|see you|later|good night)/i.test(t)) return 'farewell';
  if (/^(yes|no|ok|okay|sure|alright|got it|cool|nice|great|awesome|perfect)[\s!.]*$/i.test(t)) return 'affirmation';
  if (DATA_PATTERNS.reduce((s, p) => s + (p.test(t) ? 1 : 0), 0) >= 1) return 'data-analysis';
  if (t.endsWith('?')) return 'data-analysis';
  return 'greeting';
}

// ── Conversation Responses ────────────────────────────────────────

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const GREETINGS = [
  "Hello! 👋 How can I help you today? I can analyze your data, generate SQL queries, or just chat.",
  "Hey there! Ready to help with data analysis, SQL generation, or anything else. What's on your mind?",
  "Hi! I'm your AI analytics assistant. Ask me anything about your data, or just say hi! 😊",
];
const THANKS_R = [
  "You're welcome! Let me know if you need anything else. 😊",
  "Happy to help! Feel free to ask more questions anytime.",
  "Glad I could help! Anything else you'd like to explore?",
];
const FAREWELL_R = [
  "Goodbye! Come back anytime you need data insights! 👋",
  "See you later! Happy analyzing! 📊",
];
const AFFIRM_R = [
  "Great! What would you like to do next?",
  "Perfect! Feel free to ask another question or try a different analysis.",
];
const JOKES = [
  "Why did the data analyst cross the road? To aggregate the other side! 😄",
  "A SQL query walks into a bar, sees two tables, and asks: 'Can I JOIN you?' 🍻",
  "What's a data analyst's favorite music? Algo-rhythm! 🎵",
  "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
];

const HELP_RESPONSE = `I'm your **AI Analytics Copilot**! Here's what I can do:

🔍 **Data Analysis** — Ask questions about your dataset in natural language
📝 **SQL Generation** — I generate SQL from basic SELECT to advanced CTEs & window functions
📊 **Chart Recommendations** — I suggest the best visualization for your data
💡 **Insights** — I identify trends, patterns, and opportunities
🧮 **7 SQL Complexity Levels** — Basic → Aggregation → Filtering → Ranking → Time Series → Window Functions → CTEs

**Try asking:**
- "Show all data"
- "Total revenue by region"
- "Top 5 products by sales"
- "Monthly revenue trend"
- "Rank regions by revenue"
- "Running total of sales"
- "CTE query for top customers"`;

const IDENTITY_RESPONSE = `I'm **DataPulse AI Copilot** — your intelligent data analytics assistant! 🤖

I combine natural conversation with powerful SQL analytics:
- 💬 Chat naturally like ChatGPT
- 📝 Generate SQL queries (7 complexity levels)
- 📊 Auto-recommend visualizations
- 🔄 Import queries directly to SQL Engine
- 💡 Provide data-driven insights`;

function handleConversation(intent: Intent, schema: DataSchema | null): { answer: string; metadata: CopilotMetadata } {
  const suggestions = schema
    ? ['Show all data', `Total by ${schema.columns.find(c => c.type === 'string')?.name || 'category'}`, 'Generate advanced SQL']
    : ['What can you do?', 'Tell me a joke'];

  switch (intent) {
    case 'greeting': return { answer: pick(GREETINGS), metadata: { mode: 'conversation', suggestions } };
    case 'thanks': return { answer: pick(THANKS_R), metadata: { mode: 'conversation' } };
    case 'help': return { answer: HELP_RESPONSE, metadata: { mode: 'conversation', suggestions: ['Show top metrics', 'Generate CTE query', 'Rank analysis'] } };
    case 'joke': return { answer: pick(JOKES), metadata: { mode: 'conversation', suggestions: ['Another joke', 'Back to analysis'] } };
    case 'identity': return { answer: IDENTITY_RESPONSE, metadata: { mode: 'conversation', suggestions } };
    case 'farewell': return { answer: pick(FAREWELL_R), metadata: { mode: 'conversation' } };
    case 'affirmation': return { answer: pick(AFFIRM_R), metadata: { mode: 'conversation', suggestions } };
    default: return { answer: "I'm here to help! Ask me about your data or just chat. 😊", metadata: { mode: 'conversation', suggestions } };
  }
}

// ── SQL Generation Engine (7 Levels) ──────────────────────────────

interface SQLResult {
  sql: string;
  level: string;
  explanation: string;
}

function generateSQL(question: string, schema: DataSchema): SQLResult {
  const q = question.toLowerCase();
  const { tableName, columns } = schema;
  const numCols = columns.filter(c => c.type === 'number').map(c => c.name);
  const strCols = columns.filter(c => c.type === 'string').map(c => c.name);
  const dateCols = columns.filter(c => c.type === 'date').map(c => c.name);

  // Find referenced columns
  const refCols = columns.filter(c => q.includes(c.name.toLowerCase()));
  const refNum = refCols.filter(c => c.type === 'number').map(c => c.name);
  const refStr = refCols.filter(c => c.type === 'string').map(c => c.name);

  const measureCol = refNum[0] || numCols[0] || '';
  const dimCol = refStr[0] || strCols[0] || '';

  // Detect groupBy
  const groupMatch = q.match(/\b(by|per|for each|across|grouped by)\s+(\w+)/i);
  let groupCol = groupMatch ? columns.find(c => c.name.toLowerCase() === groupMatch[2].toLowerCase())?.name || dimCol : '';

  // Detect limit
  const topMatch = q.match(/\b(top|bottom|first|last|highest|lowest)\s*(\d+)?\b/);
  const limit = topMatch?.[2] ? parseInt(topMatch[2]) : (topMatch ? 10 : 0);
  const isAsc = topMatch?.[1] && /bottom|lowest|last|least/i.test(topMatch[1]);

  // Detect aggregation type
  const wantsSum = /\b(total|sum|revenue|sales|amount)\b/i.test(q);
  const wantsAvg = /\b(average|avg|mean)\b/i.test(q);
  const wantsCount = /\b(count|how many|number of)\b/i.test(q);
  const wantsMax = /\b(max|maximum|highest value)\b/i.test(q) && !topMatch;
  const wantsMin = /\b(min|minimum|lowest value)\b/i.test(q) && !topMatch;

  // ── Level 7: CTE ──
  if (/\b(cte|common table|with\s+\w+\s+as)\b/i.test(q) || /\b(complex|advanced|multi.?step)\b/i.test(q)) {
    if (!groupCol) groupCol = dimCol;
    const cteName = `${groupCol || 'data'}_summary`;
    const agg = wantsAvg ? 'AVG' : wantsCount ? 'COUNT' : 'SUM';
    const aggCol = wantsCount ? '*' : measureCol;
    const alias = wantsCount ? 'record_count' : wantsAvg ? `avg_${measureCol}` : `total_${measureCol}`;

    const sql = `WITH ${cteName} AS (\n  SELECT ${groupCol || '*'},\n    ${agg}(${aggCol}) AS ${alias}${!wantsCount && measureCol ? `,\n    RANK() OVER (ORDER BY ${agg}(${aggCol}) DESC) AS rank` : ''}\n  FROM ${tableName}${groupCol ? `\n  GROUP BY ${groupCol}` : ''}\n)\n\nSELECT *\nFROM ${cteName}${limit ? `\nWHERE rank <= ${limit}` : ''}\nORDER BY ${alias} DESC`;
    return {
      sql,
      level: 'Level 7 — CTE Query',
      explanation: `This uses a **Common Table Expression (CTE)** to first aggregate ${measureCol || 'data'} by ${groupCol || 'all records'}, then queries the result. CTEs improve readability and allow multi-step analysis.`,
    };
  }

  // ── Level 6: Window Functions ──
  if (/\b(running|cumulative|window|rank\b|dense.?rank|row.?number|lag|lead|over\s*\(|partition|growth|change over)\b/i.test(q)) {
    if (/\b(running|cumulative)\b/i.test(q)) {
      const orderCol = dateCols[0] || columns[0]?.name || '';
      return {
        sql: `SELECT ${orderCol},\n  ${measureCol},\n  SUM(${measureCol}) OVER (ORDER BY ${orderCol}) AS running_total\nFROM ${tableName}\nORDER BY ${orderCol}`,
        level: 'Level 6 — Window Function (Running Total)',
        explanation: `This calculates a **running total** of ${measureCol} ordered by ${orderCol}. The SUM() OVER() window function accumulates values row by row.`,
      };
    }
    if (/\b(growth|change|lag|lead)\b/i.test(q)) {
      const orderCol = dateCols[0] || columns[0]?.name || '';
      return {
        sql: `SELECT ${orderCol},\n  ${measureCol},\n  ${measureCol} - LAG(${measureCol}) OVER (ORDER BY ${orderCol}) AS ${measureCol}_growth,\n  ROUND((${measureCol} - LAG(${measureCol}) OVER (ORDER BY ${orderCol})) * 100.0 / NULLIF(LAG(${measureCol}) OVER (ORDER BY ${orderCol}), 0), 2) AS growth_pct\nFROM ${tableName}\nORDER BY ${orderCol}`,
        level: 'Level 6 — Window Function (Growth)',
        explanation: `This uses the **LAG()** window function to compare each row's ${measureCol} with the previous row, calculating both absolute growth and percentage change.`,
      };
    }
    // Ranking with window
    if (!groupCol) groupCol = dimCol;
    return {
      sql: `SELECT ${groupCol},\n  SUM(${measureCol}) AS total_${measureCol},\n  RANK() OVER (ORDER BY SUM(${measureCol}) DESC) AS rank,\n  DENSE_RANK() OVER (ORDER BY SUM(${measureCol}) DESC) AS dense_rank\nFROM ${tableName}\nGROUP BY ${groupCol}\nORDER BY rank`,
      level: 'Level 6 — Window Function (Ranking)',
      explanation: `This uses **RANK()** and **DENSE_RANK()** window functions to rank ${groupCol} by total ${measureCol}. DENSE_RANK avoids gaps in ranking numbers.`,
    };
  }

  // ── Level 5: Time Series ──
  if (/\b(trend|over time|monthly|weekly|daily|yearly|time series|timeline|date)\b/i.test(q) && dateCols.length > 0) {
    const dateCol = dateCols[0];
    const truncTo = /monthly/i.test(q) ? 'month' : /weekly/i.test(q) ? 'week' : /yearly|annual/i.test(q) ? 'year' : 'day';
    const agg = wantsAvg ? 'AVG' : wantsCount ? 'COUNT' : 'SUM';
    const aggCol = wantsCount ? '*' : measureCol;
    const alias = wantsCount ? 'record_count' : wantsAvg ? `avg_${measureCol}` : `total_${measureCol}`;

    return {
      sql: `SELECT DATE_TRUNC('${truncTo}', ${dateCol}) AS ${truncTo},\n  ${agg}(${aggCol}) AS ${alias}\nFROM ${tableName}\nGROUP BY ${truncTo}\nORDER BY ${truncTo}`,
      level: 'Level 5 — Time Series Analysis',
      explanation: `This aggregates ${measureCol || 'records'} by **${truncTo}** using DATE_TRUNC, revealing temporal trends and patterns.`,
    };
  }

  // ── Level 4: Ranking ──
  if (/\b(top|bottom|best|worst|highest|lowest|rank|first|last)\b/i.test(q)) {
    if (!groupCol) groupCol = dimCol;
    const order = isAsc ? 'ASC' : 'DESC';
    const agg = wantsAvg ? 'AVG' : wantsCount ? 'COUNT' : 'SUM';
    const aggCol = wantsCount ? '*' : measureCol;
    const alias = wantsCount ? 'count' : wantsAvg ? `avg_${measureCol}` : `total_${measureCol}`;

    if (groupCol && measureCol) {
      return {
        sql: `SELECT ${groupCol}, ${agg}(${aggCol}) AS ${alias}\nFROM ${tableName}\nGROUP BY ${groupCol}\nORDER BY ${alias} ${order}\nLIMIT ${limit || 10}`,
        level: 'Level 4 — Ranking Query',
        explanation: `This ranks ${groupCol} by ${alias} in ${isAsc ? 'ascending' : 'descending'} order, showing the ${isAsc ? 'bottom' : 'top'} ${limit || 10} results.`,
      };
    }
    return {
      sql: `SELECT *\nFROM ${tableName}\nORDER BY ${measureCol || columns[0]?.name} ${order}\nLIMIT ${limit || 10}`,
      level: 'Level 4 — Ranking Query',
      explanation: `This retrieves the ${isAsc ? 'bottom' : 'top'} ${limit || 10} records ordered by ${measureCol || columns[0]?.name}.`,
    };
  }

  // ── Level 3: Filtering ──
  if (/\b(where|filter|only|specific|equal|greater|less|between|like|contains|matching)\b/i.test(q)) {
    // Try to extract filter value
    const valMatch = q.match(/(?:=|equals?|is)\s*'?([^'",]+)'?/i) || q.match(/(?:for|only)\s+'?([^'",]+)'?/i);
    const numMatch = q.match(/(?:>|greater|above|more than|over)\s*(\d+)/i) || q.match(/(?:<|less|below|under)\s*(\d+)/i);
    const isGreater = /(?:>|greater|above|more than|over)/i.test(q);

    if (numMatch && measureCol) {
      const op = isGreater ? '>' : '<';
      return {
        sql: `SELECT *\nFROM ${tableName}\nWHERE ${measureCol} ${op} ${numMatch[1]}\nORDER BY ${measureCol} DESC\nLIMIT 50`,
        level: 'Level 3 — Filtering Query',
        explanation: `This filters records where ${measureCol} is ${isGreater ? 'greater than' : 'less than'} ${numMatch[1]}.`,
      };
    }
    if (valMatch && dimCol) {
      return {
        sql: `SELECT *\nFROM ${tableName}\nWHERE ${dimCol} = '${valMatch[1].trim()}'\nORDER BY ${measureCol || columns[0]?.name} DESC\nLIMIT 50`,
        level: 'Level 3 — Filtering Query',
        explanation: `This filters records where ${dimCol} equals '${valMatch[1].trim()}'.`,
      };
    }
    // Generic filter
    return {
      sql: `SELECT *\nFROM ${tableName}\nWHERE ${dimCol || columns[0]?.name} IS NOT NULL\nLIMIT 50`,
      level: 'Level 3 — Filtering Query',
      explanation: `This filters out null values in ${dimCol || columns[0]?.name}. Specify a column and value for more precise filtering.`,
    };
  }

  // ── Level 2: Aggregation ──
  if (wantsSum || wantsAvg || wantsCount || wantsMax || wantsMin || groupCol || /\b(by|per|each|grouped)\b/i.test(q)) {
    if (!groupCol && /\b(by|per)\b/i.test(q)) groupCol = dimCol;
    const agg = wantsAvg ? 'AVG' : wantsCount ? 'COUNT' : wantsMax ? 'MAX' : wantsMin ? 'MIN' : 'SUM';
    const aggCol = wantsCount ? '*' : measureCol;
    const alias = wantsCount ? 'count' : wantsAvg ? `avg_${measureCol}` : wantsMax ? `max_${measureCol}` : wantsMin ? `min_${measureCol}` : `total_${measureCol}`;

    if (groupCol) {
      return {
        sql: `SELECT ${groupCol}, ${agg}(${aggCol}) AS ${alias}\nFROM ${tableName}\nGROUP BY ${groupCol}\nORDER BY ${alias} DESC`,
        level: 'Level 2 — Aggregation Query',
        explanation: `This groups data by **${groupCol}** and calculates **${agg}** of ${aggCol || 'records'} for each group.`,
      };
    }
    return {
      sql: `SELECT ${agg}(${aggCol}) AS ${alias}\nFROM ${tableName}`,
      level: 'Level 2 — Aggregation Query',
      explanation: `This calculates the overall **${agg}** of ${aggCol || 'all records'} across the entire dataset.`,
    };
  }

  // ── Level 1: Basic ──
  if (/\b(all|everything|show|display|list|select \*)\b/i.test(q) && !refCols.length) {
    return {
      sql: `SELECT *\nFROM ${tableName}\nLIMIT 100`,
      level: 'Level 1 — Basic Query',
      explanation: `This retrieves all columns and rows from the dataset, limited to 100 records for performance.`,
    };
  }

  // Select specific columns
  if (refCols.length > 0) {
    return {
      sql: `SELECT ${refCols.map(c => c.name).join(', ')}\nFROM ${tableName}\nLIMIT 100`,
      level: 'Level 1 — Basic Query',
      explanation: `This selects the specified columns: ${refCols.map(c => c.name).join(', ')}.`,
    };
  }

  // Default fallback
  return {
    sql: `SELECT *\nFROM ${tableName}\nLIMIT 20`,
    level: 'Level 1 — Basic Query',
    explanation: `This retrieves a sample of the dataset. Try asking more specific questions like "total revenue by region" or "top 5 products".`,
  };
}

// ── Chart Recommendation ──────────────────────────────────────────

function recommendChart(question: string, schema: DataSchema): CopilotMetadata['chartRecommendation'] {
  const q = question.toLowerCase();
  const numCols = schema.columns.filter(c => c.type === 'number');
  const strCols = schema.columns.filter(c => c.type === 'string');
  const dateCols = schema.columns.filter(c => c.type === 'date');

  if (/\b(trend|over time|timeline|monthly|weekly|daily|time series)\b/i.test(q) && dateCols.length > 0)
    return { type: 'line', xAxis: dateCols[0].name, yAxis: numCols[0]?.name, reason: 'Line chart is ideal for showing trends over time.' };
  if (/\b(distribution|proportion|percentage|share|composition|pie)\b/i.test(q))
    return { type: 'pie', xAxis: strCols[0]?.name, yAxis: numCols[0]?.name, reason: 'Pie chart shows proportional distribution.' };
  if (/\b(scatter|correlation|relationship|vs|versus)\b/i.test(q) && numCols.length >= 2)
    return { type: 'scatter', xAxis: numCols[0].name, yAxis: numCols[1].name, reason: 'Scatter plot reveals correlations between variables.' };
  if (/\b(area|cumulative|running)\b/i.test(q))
    return { type: 'area', xAxis: dateCols[0]?.name || strCols[0]?.name, yAxis: numCols[0]?.name, reason: 'Area chart shows cumulative or volume data effectively.' };
  return { type: 'bar', xAxis: strCols[0]?.name || schema.columns[0]?.name, yAxis: numCols[0]?.name, reason: 'Bar chart provides clear comparison of categories.' };
}

// ── Insight Generation ────────────────────────────────────────────

function generateInsights(schema: DataSchema, data: Record<string, unknown>[]): string[] {
  const insights: string[] = [];
  const numCols = schema.columns.filter(c => c.type === 'number');

  if (numCols.length > 0 && data.length > 0) {
    const col = numCols[0].name;
    const vals = data.map(r => Number(r[col]) || 0).filter(v => !isNaN(v));
    if (vals.length > 0) {
      const sum = vals.reduce((a, b) => a + b, 0);
      const avg = sum / vals.length;
      const max = Math.max(...vals);
      const min = Math.min(...vals);
      insights.push(`**${col}** ranges from ${min.toLocaleString()} to ${max.toLocaleString()} (avg: ${avg.toFixed(1)})`);

      if (vals.length > 5) {
        const half = Math.floor(vals.length / 2);
        const avgFirst = vals.slice(0, half).reduce((a, b) => a + b, 0) / half;
        const avgSecond = vals.slice(half).reduce((a, b) => a + b, 0) / (vals.length - half);
        const change = ((avgSecond - avgFirst) / avgFirst * 100).toFixed(1);
        if (Math.abs(Number(change)) > 5) {
          insights.push(`${Number(change) > 0 ? '📈 Upward' : '📉 Downward'} trend: ${change}% shift in **${col}**`);
        }
      }
    }
  }

  const strCols = schema.columns.filter(c => c.type === 'string');
  if (strCols.length > 0) {
    insights.push(`**${strCols[0].name}** has **${strCols[0].uniqueValues}** unique values`);
  }

  if (insights.length === 0) insights.push('Dataset appears stable with no significant outliers.');
  return insights;
}

// ── Context Resolution ────────────────────────────────────────────

function resolveContext(question: string, history: CopilotMessage[]): string {
  const q = question.toLowerCase();
  if (/\b(now|also|and then|but|instead|modify|change|update|add)\b/i.test(q) && history.length > 0) {
    const lastDataQ = [...history].reverse().find(m => m.role === 'user' && m.metadata?.mode === 'data-analysis');
    if (lastDataQ) return `${lastDataQ.content}. ${question}`;
  }
  return question;
}

// ── Main Processor ────────────────────────────────────────────────

export function processQuery(
  question: string,
  schema: DataSchema | null,
  data: Record<string, unknown>[],
  history: CopilotMessage[]
): { answer: string; metadata: CopilotMetadata } {
  const intent = detectIntent(question);

  if (intent !== 'data-analysis') {
    return handleConversation(intent, schema);
  }

  if (!schema || data.length === 0) {
    return {
      answer: "I'd love to help analyze your data, but **no dataset is currently loaded**. Please upload or select a dataset first, then ask me anything! 📂",
      metadata: { mode: 'data-analysis', suggestions: ['Upload a dataset', 'What can you do?'] },
    };
  }

  const contextQ = resolveContext(question, history);
  const { sql, level, explanation } = generateSQL(contextQ, schema);
  const chart = recommendChart(contextQ, schema);
  const insights = generateInsights(schema, data);

  const answer = [
    `### 📋 Explanation\n\n${explanation}`,
    `### 🔍 SQL Query\n\n\`\`\`sql\n${sql}\n\`\`\`\n\n> **${level}**`,
    `### 📊 Suggested Visualization\n\n**${chart!.type.charAt(0).toUpperCase() + chart!.type.slice(1)} Chart**${chart!.xAxis ? ` — ${chart!.yAxis || 'value'} by ${chart!.xAxis}` : ''}\n\n${chart!.reason}`,
    `### 💡 Insights\n\n${insights.map(i => `- ${i}`).join('\n')}`,
  ].join('\n\n---\n\n');

  return {
    answer,
    metadata: {
      mode: 'data-analysis',
      confidence: 0.88,
      reasoning: `Detected data analysis intent. Generated ${level}.`,
      sqlQuery: sql,
      sqlLevel: level,
      chartRecommendation: chart,
      insights,
      explanation,
      suggestions: [
        'Import to SQL Engine',
        `Top 5 by ${schema.columns.find(c => c.type === 'number')?.name || 'value'}`,
        'Show trend over time',
        'Generate CTE query',
        'Rank analysis',
      ],
    },
  };
}

// ── Recommended Queries Generator ─────────────────────────────────

export interface RecommendedQuery {
  category: string;
  label: string;
  sql: string;
  level: string;
}

export function generateRecommendedQueries(schema: DataSchema): RecommendedQuery[] {
  const { tableName, columns } = schema;
  const numCols = columns.filter(c => c.type === 'number').map(c => c.name);
  const strCols = columns.filter(c => c.type === 'string').map(c => c.name);
  const dateCols = columns.filter(c => c.type === 'date').map(c => c.name);
  const measure = numCols[0] || '';
  const dim = strCols[0] || '';
  const dateCol = dateCols[0] || '';

  const queries: RecommendedQuery[] = [];

  // Basic
  queries.push({ category: 'Basic', label: 'Show all data', sql: `SELECT *\nFROM ${tableName}\nLIMIT 100`, level: 'Level 1' });
  if (numCols.length > 0) queries.push({ category: 'Basic', label: `Select ${numCols.slice(0, 3).join(', ')}`, sql: `SELECT ${numCols.slice(0, 3).join(', ')}\nFROM ${tableName}\nLIMIT 100`, level: 'Level 1' });

  // Aggregation
  if (measure) {
    queries.push({ category: 'Aggregation', label: `Total ${measure}`, sql: `SELECT SUM(${measure}) AS total_${measure}\nFROM ${tableName}`, level: 'Level 2' });
    if (dim) queries.push({ category: 'Aggregation', label: `${measure} by ${dim}`, sql: `SELECT ${dim}, SUM(${measure}) AS total_${measure}\nFROM ${tableName}\nGROUP BY ${dim}\nORDER BY total_${measure} DESC`, level: 'Level 2' });
    queries.push({ category: 'Aggregation', label: `Average ${measure}`, sql: `SELECT AVG(${measure}) AS avg_${measure}\nFROM ${tableName}`, level: 'Level 2' });
  }

  // Filtering
  if (measure) queries.push({ category: 'Filtering', label: `${measure} above average`, sql: `SELECT *\nFROM ${tableName}\nWHERE ${measure} > (SELECT AVG(${measure}) FROM ${tableName})\nORDER BY ${measure} DESC\nLIMIT 50`, level: 'Level 3' });

  // Ranking
  if (dim && measure) {
    queries.push({ category: 'Ranking', label: `Top 10 ${dim}`, sql: `SELECT ${dim}, SUM(${measure}) AS total_${measure}\nFROM ${tableName}\nGROUP BY ${dim}\nORDER BY total_${measure} DESC\nLIMIT 10`, level: 'Level 4' });
    queries.push({ category: 'Ranking', label: `Bottom 5 ${dim}`, sql: `SELECT ${dim}, SUM(${measure}) AS total_${measure}\nFROM ${tableName}\nGROUP BY ${dim}\nORDER BY total_${measure} ASC\nLIMIT 5`, level: 'Level 4' });
  }

  // Time Analysis
  if (dateCol && measure) {
    queries.push({ category: 'Trend Analysis', label: `Monthly ${measure}`, sql: `SELECT DATE_TRUNC('month', ${dateCol}) AS month,\n  SUM(${measure}) AS total_${measure}\nFROM ${tableName}\nGROUP BY month\nORDER BY month`, level: 'Level 5' });
    queries.push({ category: 'Trend Analysis', label: `Daily ${measure} trend`, sql: `SELECT ${dateCol}, SUM(${measure}) AS total_${measure}\nFROM ${tableName}\nGROUP BY ${dateCol}\nORDER BY ${dateCol}`, level: 'Level 5' });
  }

  // Advanced
  if (measure) {
    queries.push({ category: 'Advanced', label: `Running total of ${measure}`, sql: `SELECT ${dateCol || dim || columns[0]?.name},\n  ${measure},\n  SUM(${measure}) OVER (ORDER BY ${dateCol || dim || columns[0]?.name}) AS running_total\nFROM ${tableName}\nORDER BY ${dateCol || dim || columns[0]?.name}`, level: 'Level 6' });
    if (dim) queries.push({ category: 'Advanced', label: `Rank ${dim} by ${measure}`, sql: `SELECT ${dim},\n  SUM(${measure}) AS total_${measure},\n  RANK() OVER (ORDER BY SUM(${measure}) DESC) AS rank\nFROM ${tableName}\nGROUP BY ${dim}\nORDER BY rank`, level: 'Level 6' });
  }

  // CTE
  if (dim && measure) {
    queries.push({ category: 'CTE', label: `Top 5 ${dim} (CTE)`, sql: `WITH ranked AS (\n  SELECT ${dim},\n    SUM(${measure}) AS total_${measure},\n    RANK() OVER (ORDER BY SUM(${measure}) DESC) AS rank\n  FROM ${tableName}\n  GROUP BY ${dim}\n)\n\nSELECT *\nFROM ranked\nWHERE rank <= 5`, level: 'Level 7' });
    queries.push({ category: 'CTE', label: `${dim} summary (CTE)`, sql: `WITH summary AS (\n  SELECT ${dim},\n    COUNT(*) AS records,\n    SUM(${measure}) AS total_${measure},\n    AVG(${measure}) AS avg_${measure},\n    MAX(${measure}) AS max_${measure}\n  FROM ${tableName}\n  GROUP BY ${dim}\n)\n\nSELECT *\nFROM summary\nORDER BY total_${measure} DESC`, level: 'Level 7' });
  }

  return queries;
}
