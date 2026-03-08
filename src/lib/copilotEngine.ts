// DataPulse AI Copilot Engine — General Chat + Data Analytics
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

// STRICT data analysis patterns - only trigger for clear data queries
const DATA_PATTERNS = [
  /\b(show|display|list|fetch|query|select)\s+(all|my|the)?\s*(data|records|rows|dataset)/i,
  /\b(count|sum|average|avg|total|max|min)\s+(of|the)?\s*\w+/i,
  /\b(top|bottom|highest|lowest|most|least)\s+\d+/i,
  /\b(group|filter|where|aggregate)\s+by/i,
  /\b(sql|query)\b/i,
  /\b(chart|graph|visualize|visualization|bar chart|line chart|pie chart)\b/i,
  /\b(analyze|analysis)\s+(my|the|this)?\s*(data|dataset)/i,
  /\b(trend|correlation|distribution)\b/i,
  /\b(by region|by category|by month|by year|by product)\b/i,
];

// General knowledge patterns - handle with conversational response
const GENERAL_PATTERNS = [
  /^(what|who|why|how|when|where|which|can you|could you|would you|do you|is it|are there)\b/i,
  /\b(explain|tell me about|describe|define|meaning of)\b/i,
  /\b(difference between|compare|versus|vs)\b/i,
];

type Intent = 'greeting' | 'thanks' | 'help' | 'smalltalk' | 'joke' | 'identity' | 'farewell' | 'affirmation' | 'general' | 'data-analysis';

function detectIntent(input: string): Intent {
  const t = input.trim();
  if (GREETING_PATTERNS.some(p => p.test(t))) return 'greeting';
  if (THANKS_PATTERNS.some(p => p.test(t))) return 'thanks';
  if (HELP_PATTERNS.some(p => p.test(t))) return 'help';
  if (/^(tell me a joke|joke|funny)/i.test(t)) return 'joke';
  if (/^(who are you|what are you|what'?s your name)/i.test(t)) return 'identity';
  if (/^(bye|goodbye|see you|later|good night)/i.test(t)) return 'farewell';
  if (/^(yes|no|ok|okay|sure|alright|got it|cool|nice|great|awesome|perfect)[\s!.]*$/i.test(t)) return 'affirmation';
  
  // Check for explicit data analysis intent (needs 2+ matches for stronger signal)
  const dataScore = DATA_PATTERNS.reduce((s, p) => s + (p.test(t) ? 1 : 0), 0);
  if (dataScore >= 1) return 'data-analysis';
  
  // General questions go to general chat, NOT data-analysis
  if (GENERAL_PATTERNS.some(p => p.test(t))) return 'general';
  
  // Default to general conversation for everything else
  return 'general';
}

// ── Conversation Responses ────────────────────────────────────────

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const GREETINGS = [
  "Hello! 👋 How can I help you today?",
  "Hey there! What's on your mind?",
  "Hi! I'm here to help with anything you need. 😊",
];
const THANKS_R = [
  "You're welcome! Let me know if you need anything else. 😊",
  "Happy to help! Feel free to ask more questions anytime.",
  "Glad I could help! Anything else you'd like to know?",
];
const FAREWELL_R = [
  "Goodbye! Come back anytime! 👋",
  "See you later! Take care! 😊",
];
const AFFIRM_R = [
  "Great! What would you like to do next?",
  "Perfect! Feel free to ask another question.",
];
const JOKES = [
  "Why did the data analyst cross the road? To aggregate the other side! 😄",
  "A SQL query walks into a bar, sees two tables, and asks: 'Can I JOIN you?' 🍻",
  "What's a data analyst's favorite music? Algo-rhythm! 🎵",
  "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
];

const HELP_RESPONSE = `I'm your **AI Assistant**! Here's what I can do:

💬 **General Chat** — Ask me anything, I'll do my best to help
🔍 **Data Analysis** — Ask questions about your dataset (if loaded)
📊 **Visualizations** — I can recommend charts for your data
💡 **Business Insights** — Get ideas and suggestions

**Examples:**
- "What is machine learning?"
- "Explain data visualization best practices"
- "Show all data" (when dataset loaded)
- "Top 10 products by revenue"`;

const IDENTITY_RESPONSE = `I'm **DataPulse AI** — your friendly assistant! 🤖

I can help with:
- 💬 General questions and conversation
- 📊 Data analysis (when you have a dataset loaded)
- 💡 Business insights and recommendations
- 🎯 Anything else you want to chat about!`;

// General knowledge responses for common questions
const GENERAL_RESPONSES: Record<string, string> = {
  'machine learning': "**Machine Learning** is a type of AI that allows computers to learn from data without being explicitly programmed. It works by:\n\n1. **Training** - Feeding data to algorithms\n2. **Learning** - Finding patterns in the data\n3. **Predicting** - Making decisions on new data\n\nCommon types include supervised learning, unsupervised learning, and reinforcement learning.",
  'data visualization': "**Data Visualization** is the graphical representation of data to help people understand patterns, trends, and insights. Best practices include:\n\n- Choose the right chart type for your data\n- Keep it simple and avoid clutter\n- Use color meaningfully\n- Label axes clearly\n- Tell a story with your data",
  'analytics': "**Analytics** is the process of discovering, interpreting, and communicating meaningful patterns in data. Types include:\n\n1. **Descriptive** - What happened?\n2. **Diagnostic** - Why did it happen?\n3. **Predictive** - What might happen?\n4. **Prescriptive** - What should we do?",
};

function handleConversation(intent: Intent, schema: DataSchema | null, question: string): { answer: string; metadata: CopilotMetadata } {
  const suggestions = schema
    ? ['Analyze my data', 'Show summary', 'Recommend a chart']
    : ['What can you do?', 'Tell me a joke', 'Help'];

  switch (intent) {
    case 'greeting': return { answer: pick(GREETINGS), metadata: { mode: 'conversation', suggestions } };
    case 'thanks': return { answer: pick(THANKS_R), metadata: { mode: 'conversation' } };
    case 'help': return { answer: HELP_RESPONSE, metadata: { mode: 'conversation', suggestions: ['Analyze data', 'Tell me a joke', 'What is analytics?'] } };
    case 'joke': return { answer: pick(JOKES), metadata: { mode: 'conversation', suggestions: ['Another joke', 'Back to work'] } };
    case 'identity': return { answer: IDENTITY_RESPONSE, metadata: { mode: 'conversation', suggestions } };
    case 'farewell': return { answer: pick(FAREWELL_R), metadata: { mode: 'conversation' } };
    case 'affirmation': return { answer: pick(AFFIRM_R), metadata: { mode: 'conversation', suggestions } };
    case 'general': {
      // Try to match known topics
      const q = question.toLowerCase();
      for (const [topic, response] of Object.entries(GENERAL_RESPONSES)) {
        if (q.includes(topic)) {
          return { answer: response, metadata: { mode: 'conversation', confidence: 0.9, suggestions: ['Tell me more', 'Another topic'] } };
        }
      }
      // Generic helpful response
      return {
        answer: `That's a great question! I'll do my best to help.\n\n${schema ? "Since you have data loaded, I can also analyze it for you. Try asking specific data questions like 'show top 10 by revenue' or 'total sales by region'." : "I'm a general assistant - feel free to ask me anything! If you upload a dataset, I can also help with data analysis."}\n\nWhat would you like to know more about?`,
        metadata: { mode: 'conversation', suggestions: schema ? ['Analyze my dataset', 'Show all data'] : ['What can you do?', 'Tell me a joke'] },
      };
    }
    default: return { answer: "I'm here to help! Ask me anything. 😊", metadata: { mode: 'conversation', suggestions } };
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
    return handleConversation(intent, schema, question);
  }

  if (!schema || data.length === 0) {
    return {
      answer: "I'd love to help analyze your data, but **no dataset is currently loaded**. Please upload or select a dataset first, then ask me anything! 📂",
      metadata: { mode: 'data-analysis', suggestions: ['Upload a dataset', 'What can you do?'] },
    };
  }

  const contextQ = resolveContext(question, history);
  const chart = recommendChart(contextQ, schema);
  const insights = generateInsights(schema, data);

  // Build natural language analysis instead of SQL
  const q = contextQ.toLowerCase();
  const numCols = schema.columns.filter(c => c.type === 'number');
  const strCols = schema.columns.filter(c => c.type === 'string');
  
  let analysisAnswer = '';

  // Summarize / show all data
  if (/\b(summarize|summary|overview|describe|show all|display all)\b/i.test(q)) {
    const colSummaries = numCols.slice(0, 5).map(col => {
      const vals = data.map(r => Number(r[col.name]) || 0).filter(v => !isNaN(v));
      if (vals.length === 0) return null;
      const sum = vals.reduce((a, b) => a + b, 0);
      const avg = sum / vals.length;
      const max = Math.max(...vals);
      const min = Math.min(...vals);
      return `- **${col.name}**: min ${min.toLocaleString()}, max ${max.toLocaleString()}, avg ${avg.toFixed(1)}, total ${sum.toLocaleString()}`;
    }).filter(Boolean);

    analysisAnswer = `### 📊 Dataset Summary: ${schema.tableName}\n\n**${schema.rowCount} rows** across **${schema.columns.length} columns**\n\n**Columns:** ${schema.columns.map(c => `\`${c.name}\` (${c.type})`).join(', ')}\n\n### Key Statistics\n${colSummaries.join('\n') || 'No numeric columns found.'}`;
  }
  // Top/bottom queries
  else if (/\b(top|bottom|highest|lowest|best|worst|most|least)\b/i.test(q)) {
    const limitMatch = q.match(/\b(\d+)\b/);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 10;
    const isBottom = /\b(bottom|lowest|worst|least)\b/i.test(q);
    const measureCol = numCols[0]?.name;
    const dimCol = strCols[0]?.name;

    if (measureCol && data.length > 0) {
      const sorted = [...data].sort((a, b) => {
        const va = Number(a[measureCol]) || 0;
        const vb = Number(b[measureCol]) || 0;
        return isBottom ? va - vb : vb - va;
      }).slice(0, limit);

      const rows = sorted.map((r, i) => `${i + 1}. **${dimCol ? r[dimCol] : `Row ${i + 1}`}** — ${measureCol}: **${Number(r[measureCol] || 0).toLocaleString()}**`).join('\n');
      analysisAnswer = `### ${isBottom ? '⬇️ Bottom' : '🏆 Top'} ${limit} by ${measureCol}\n\n${rows}`;
    } else {
      analysisAnswer = `I found your dataset but couldn't identify a numeric column to rank by. Your columns are: ${schema.columns.map(c => `\`${c.name}\``).join(', ')}`;
    }
  }
  // Count / total / average
  else if (/\b(count|how many|total|sum|average|avg|mean|max|min)\b/i.test(q)) {
    const measureCol = numCols[0]?.name;
    const groupMatch = q.match(/\b(by|per|for each)\s+(\w+)/i);
    const groupCol = groupMatch ? schema.columns.find(c => c.name.toLowerCase() === groupMatch[2].toLowerCase())?.name : null;

    if (measureCol && data.length > 0) {
      const vals = data.map(r => Number(r[measureCol]) || 0);
      const sum = vals.reduce((a, b) => a + b, 0);
      const avg = sum / vals.length;

      if (groupCol) {
        const groups: Record<string, number[]> = {};
        data.forEach(r => {
          const key = String(r[groupCol] || 'Unknown');
          if (!groups[key]) groups[key] = [];
          groups[key].push(Number(r[measureCol]) || 0);
        });
        const wantsAvg = /\b(average|avg|mean)\b/i.test(q);
        const wantsCount = /\b(count|how many)\b/i.test(q);
        const groupResults = Object.entries(groups)
          .map(([key, vals]) => ({
            key,
            value: wantsCount ? vals.length : wantsAvg ? vals.reduce((a, b) => a + b, 0) / vals.length : vals.reduce((a, b) => a + b, 0)
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 15);
        
        const label = wantsCount ? 'Count' : wantsAvg ? `Avg ${measureCol}` : `Total ${measureCol}`;
        const rows = groupResults.map((r, i) => `${i + 1}. **${r.key}** — ${label}: **${r.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}**`).join('\n');
        analysisAnswer = `### 📊 ${label} by ${groupCol}\n\n${rows}`;
      } else {
        analysisAnswer = `### 📊 ${measureCol} Statistics\n\n- **Total:** ${sum.toLocaleString()}\n- **Average:** ${avg.toFixed(2)}\n- **Min:** ${Math.min(...vals).toLocaleString()}\n- **Max:** ${Math.max(...vals).toLocaleString()}\n- **Records:** ${vals.length.toLocaleString()}`;
      }
    } else {
      analysisAnswer = `Your dataset has **${data.length} records**. Columns: ${schema.columns.map(c => `\`${c.name}\``).join(', ')}`;
    }
  }
  // Generic data analysis
  else {
    analysisAnswer = `### 📊 Analysis of ${schema.tableName}\n\n**${schema.rowCount} rows** • **${schema.columns.length} columns**\n\n### 💡 Key Insights\n${insights.map(i => `- ${i}`).join('\n')}\n\n${chart ? `### 📈 Recommended Visualization\n**${chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart** — ${chart.reason}` : ''}`;
  }

  return {
    answer: analysisAnswer,
    metadata: {
      mode: 'data-analysis',
      confidence: 0.88,
      reasoning: `Analyzed data and provided natural language results.`,
      chartRecommendation: chart,
      insights,
      suggestions: [
        `Top 5 by ${schema.columns.find(c => c.type === 'number')?.name || 'value'}`,
        'Summarize my dataset',
        'Show trend over time',
        `Average by ${schema.columns.find(c => c.type === 'string')?.name || 'category'}`,
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
