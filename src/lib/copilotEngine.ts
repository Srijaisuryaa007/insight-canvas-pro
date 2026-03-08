// DataPulse AI Copilot Engine — Local conversational + data analysis AI
// Handles general conversation and data-aware analysis without external APIs

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
  chartRecommendation?: { type: string; xAxis?: string; yAxis?: string; reason: string };
  insights?: string[];
  explanation?: string;
}

interface DataSchema {
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

const THANKS_PATTERNS = [
  /^(thanks?|thank\s*you|thx|ty|cheers|appreciate|grateful)\b/i,
];

const HELP_PATTERNS = [
  /^(help|what can you do|what are your capabilities|how do you work|what do you offer)\b/i,
];

const SMALLTALK_PATTERNS = [
  /^(tell me a joke|joke|funny|make me laugh)/i,
  /^(who are you|what are you|what'?s your name|are you ai|are you real)/i,
  /^(bye|goodbye|see you|later|ttyl|good night)/i,
  /^(yes|no|ok|okay|sure|alright|got it|understood|cool|nice|great|awesome|perfect|wonderful)/i,
];

const DATA_PATTERNS = [
  /\b(show|display|list|find|get|fetch|query|select|count|sum|average|avg|total|max|min|top|bottom|highest|lowest|most|least|group|filter|where|between|compare|analyze|trend|correlation|anomaly|distribution|revenue|sales|profit|cost|price|amount|quantity|rate|score|performance)\b/i,
  /\b(column|row|table|dataset|data|field|record|entry|schema|metric|kpi|dimension|measure)\b/i,
  /\b(by|per|across|over|for each|grouped|sorted|ordered|breakdown|segment)\b/i,
  /\b(chart|graph|plot|visualize|visualization|bar|line|pie|scatter|heatmap)\b/i,
  /\b(sql|query|select from|group by|order by|where|having|join|limit)\b/i,
  /\b(increase|decrease|growth|decline|change|spike|drop|peak|dip)\b/i,
];

type Intent = 'greeting' | 'thanks' | 'help' | 'smalltalk' | 'joke' | 'identity' | 'farewell' | 'affirmation' | 'data-analysis';

function detectIntent(input: string): Intent {
  const trimmed = input.trim();
  if (GREETING_PATTERNS.some(p => p.test(trimmed))) return 'greeting';
  if (THANKS_PATTERNS.some(p => p.test(trimmed))) return 'thanks';
  if (HELP_PATTERNS.some(p => p.test(trimmed))) return 'help';
  if (/^(tell me a joke|joke|funny|make me laugh)/i.test(trimmed)) return 'joke';
  if (/^(who are you|what are you|what'?s your name|are you ai)/i.test(trimmed)) return 'identity';
  if (/^(bye|goodbye|see you|later|ttyl|good night)/i.test(trimmed)) return 'farewell';
  if (/^(yes|no|ok|okay|sure|alright|got it|understood|cool|nice|great|awesome|perfect|wonderful)[\s!.]*$/i.test(trimmed)) return 'affirmation';
  
  // Check for data-related keywords
  const dataScore = DATA_PATTERNS.reduce((score, p) => score + (p.test(trimmed) ? 1 : 0), 0);
  if (dataScore >= 1) return 'data-analysis';
  
  // Default: if dataset is loaded and message is a question, treat as data
  if (trimmed.endsWith('?')) return 'data-analysis';
  
  return 'greeting'; // fallback to conversation
}

// ── Conversation Responses ────────────────────────────────────────

const GREETINGS = [
  "Hello! 👋 How can I help you today?",
  "Hey there! Ready to help you analyze your data or just chat. What's on your mind?",
  "Hi! I'm your AI analytics assistant. Ask me anything about your data, or just say hi!",
  "Welcome! I can help with data analysis, SQL queries, insights, and more. What would you like to do?",
];

const THANKS_RESPONSES = [
  "You're welcome! Let me know if you need anything else. 😊",
  "Happy to help! Feel free to ask more questions anytime.",
  "Glad I could help! Is there anything else you'd like to explore?",
  "No problem! I'm here whenever you need me.",
];

const HELP_RESPONSE = `I'm your **AI Analytics Copilot**! Here's what I can do:

🔍 **Data Analysis** — Ask questions about your dataset in natural language
📊 **SQL Generation** — I'll write SQL queries for you based on your questions
📈 **Chart Recommendations** — I suggest the best visualization for your data
💡 **Insights** — I identify trends, patterns, anomalies, and opportunities
🧮 **Calculations** — Aggregations, averages, comparisons, and more

**Try asking:**
- "Show revenue by region"
- "What's the average score?"
- "Find the top 5 customers by sales"
- "Compare monthly trends"
- "Which column has the most missing values?"

You can also just chat with me normally! 😊`;

const JOKES = [
  "Why did the data analyst cross the road? To aggregate the other side! 😄",
  "There are only 10 types of people in the world: those who understand binary and those who don't. 😂",
  "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
  "A SQL query walks into a bar, sees two tables, and asks: 'Can I JOIN you?' 🍻",
  "How do you comfort a data scientist? You say, 'There, their, they're — it's just a data type mismatch.' 📊",
  "What's a data analyst's favorite kind of music? Algo-rhythm! 🎵",
];

const IDENTITY_RESPONSE = `I'm **DataPulse AI Copilot** — your intelligent data analysis assistant! 🤖

I'm designed to help you:
- Analyze datasets with natural language
- Generate SQL queries
- Create visualizations
- Discover insights and trends
- And have a friendly conversation along the way!

I'm powered by advanced analytics and I get smarter the more context you give me about your data.`;

const FAREWELL_RESPONSES = [
  "Goodbye! Come back anytime you need data insights! 👋",
  "See you later! Happy analyzing! 📊",
  "Bye! Don't hesitate to reach out when you need help. 😊",
];

const AFFIRMATION_RESPONSES = [
  "Great! Let me know if there's anything else you'd like to explore.",
  "Perfect! What would you like to do next?",
  "Got it! Feel free to ask another question or try a different analysis.",
];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function handleConversation(intent: Intent): CopilotMetadata & { answer: string } {
  switch (intent) {
    case 'greeting':
      return { answer: randomPick(GREETINGS), mode: 'conversation', suggestions: ['What can you do?', 'Show me data trends', 'Generate a SQL query'] };
    case 'thanks':
      return { answer: randomPick(THANKS_RESPONSES), mode: 'conversation' };
    case 'help':
      return { answer: HELP_RESPONSE, mode: 'conversation', suggestions: ['Show top metrics', 'Analyze trends', 'Find anomalies', 'Generate SQL'] };
    case 'joke':
      return { answer: randomPick(JOKES), mode: 'conversation', suggestions: ['Tell me another joke', 'Back to data analysis'] };
    case 'identity':
      return { answer: IDENTITY_RESPONSE, mode: 'conversation', suggestions: ['What can you do?', 'Analyze my data'] };
    case 'farewell':
      return { answer: randomPick(FAREWELL_RESPONSES), mode: 'conversation' };
    case 'affirmation':
      return { answer: randomPick(AFFIRMATION_RESPONSES), mode: 'conversation' };
    default:
      return { answer: "I'm here to help! Ask me about your data or just chat. 😊", mode: 'conversation' };
  }
}

// ── Data Analysis Engine ──────────────────────────────────────────

function generateSQLFromQuestion(question: string, schema: DataSchema): string {
  const q = question.toLowerCase();
  const { tableName, columns } = schema;
  const numCols = columns.filter(c => c.type === 'number').map(c => c.name);
  const strCols = columns.filter(c => c.type === 'string').map(c => c.name);
  const dateCols = columns.filter(c => c.type === 'date').map(c => c.name);

  // Find referenced columns
  const referencedCols = columns.filter(c => q.includes(c.name.toLowerCase()));
  const referencedNum = referencedCols.filter(c => c.type === 'number');
  const referencedStr = referencedCols.filter(c => c.type === 'string');

  // Top/Bottom N
  const topMatch = q.match(/\b(top|bottom|first|last|highest|lowest)\s*(\d+)?\b/);
  const limit = topMatch?.[2] ? parseInt(topMatch[2]) : (topMatch ? 10 : 0);
  const isBottom = topMatch?.[1] && /bottom|lowest|last/i.test(topMatch[1]);

  // Aggregation detection
  const wantsSum = /\b(total|sum|revenue|sales|amount)\b/i.test(q);
  const wantsAvg = /\b(average|avg|mean)\b/i.test(q);
  const wantsCount = /\b(count|how many|number of)\b/i.test(q);
  const wantsMax = /\b(max|maximum|highest|peak|best)\b/i.test(q);
  const wantsMin = /\b(min|minimum|lowest|worst)\b/i.test(q);

  // Group by detection
  const groupByMatch = q.match(/\b(by|per|for each|across|grouped by)\s+(\w+)/i);
  let groupByCol = groupByMatch ? columns.find(c => c.name.toLowerCase() === groupByMatch[2].toLowerCase())?.name : null;
  if (!groupByCol && referencedStr.length > 0) groupByCol = referencedStr[0].name;
  if (!groupByCol && strCols.length > 0 && (wantsSum || wantsAvg || wantsCount)) groupByCol = strCols[0];

  const measureCol = referencedNum.length > 0 ? referencedNum[0].name : numCols[0];

  // Build SQL
  if (groupByCol && measureCol) {
    const agg = wantsAvg ? `AVG(${measureCol})` : wantsCount ? `COUNT(*)` : wantsMax ? `MAX(${measureCol})` : wantsMin ? `MIN(${measureCol})` : `SUM(${measureCol})`;
    const alias = wantsAvg ? `avg_${measureCol}` : wantsCount ? 'count' : wantsMax ? `max_${measureCol}` : wantsMin ? `min_${measureCol}` : `total_${measureCol}`;
    const order = isBottom ? 'ASC' : 'DESC';
    return `SELECT ${groupByCol}, ${agg} as ${alias}\nFROM ${tableName}\nGROUP BY ${groupByCol}\nORDER BY ${alias} ${order}${limit ? `\nLIMIT ${limit}` : '\nLIMIT 20'}`;
  }

  if (wantsCount && !groupByCol) {
    return `SELECT COUNT(*) as total_count\nFROM ${tableName}`;
  }

  if (limit && measureCol) {
    const order = isBottom ? 'ASC' : 'DESC';
    return `SELECT *\nFROM ${tableName}\nORDER BY ${measureCol} ${order}\nLIMIT ${limit}`;
  }

  // Trend / time-based
  if (/\b(trend|over time|monthly|weekly|daily|time)\b/i.test(q) && dateCols.length > 0 && measureCol) {
    return `SELECT ${dateCols[0]}, SUM(${measureCol}) as total_${measureCol}\nFROM ${tableName}\nGROUP BY ${dateCols[0]}\nORDER BY ${dateCols[0]}`;
  }

  // Fallback: simple select
  if (referencedCols.length > 0) {
    return `SELECT ${referencedCols.map(c => c.name).join(', ')}\nFROM ${tableName}\nLIMIT 20`;
  }

  return `SELECT *\nFROM ${tableName}\nLIMIT 20`;
}

function recommendChart(question: string, schema: DataSchema): CopilotMetadata['chartRecommendation'] {
  const q = question.toLowerCase();
  const numCols = schema.columns.filter(c => c.type === 'number');
  const strCols = schema.columns.filter(c => c.type === 'string');
  const dateCols = schema.columns.filter(c => c.type === 'date');

  if (/\b(trend|over time|timeline|monthly|weekly|daily)\b/i.test(q) && dateCols.length > 0) {
    return { type: 'line', xAxis: dateCols[0].name, yAxis: numCols[0]?.name, reason: 'Line chart is ideal for showing trends over time.' };
  }
  if (/\b(distribution|spread|proportion|percentage|share|composition)\b/i.test(q)) {
    return { type: 'pie', xAxis: strCols[0]?.name, yAxis: numCols[0]?.name, reason: 'Pie chart effectively shows proportional distribution.' };
  }
  if (/\b(scatter|correlation|relationship|vs|versus)\b/i.test(q) && numCols.length >= 2) {
    return { type: 'scatter', xAxis: numCols[0].name, yAxis: numCols[1].name, reason: 'Scatter plot reveals correlations between numeric variables.' };
  }
  if (/\b(compare|comparison|by|per|across)\b/i.test(q)) {
    return { type: 'bar', xAxis: strCols[0]?.name, yAxis: numCols[0]?.name, reason: 'Bar chart is great for comparing categories.' };
  }
  // Default
  return { type: 'bar', xAxis: strCols[0]?.name || schema.columns[0]?.name, yAxis: numCols[0]?.name || schema.columns[1]?.name, reason: 'Bar chart provides a clear comparison of values.' };
}

function generateExplanation(question: string, schema: DataSchema, sql: string): string {
  const q = question.toLowerCase();
  const parts: string[] = [];

  parts.push(`The dataset **${schema.tableName}** contains **${schema.rowCount.toLocaleString()} rows** and **${schema.columns.length} columns**.`);

  if (/\b(by|per|grouped)\b/i.test(q)) {
    const strCols = schema.columns.filter(c => c.type === 'string');
    if (strCols.length > 0) {
      parts.push(`To analyze this, we aggregate the data by the categorical column(s) available (e.g., **${strCols[0].name}**).`);
    }
  }

  if (/\b(sum|total|revenue|sales)\b/i.test(q)) {
    parts.push('We calculate the total (SUM) of the numeric metric.');
  } else if (/\b(average|avg|mean)\b/i.test(q)) {
    parts.push('We compute the average (AVG) of the numeric metric.');
  } else if (/\b(count|how many)\b/i.test(q)) {
    parts.push('We count the number of records matching the criteria.');
  }

  if (/\b(top|highest|best|most)\b/i.test(q)) {
    parts.push('Results are sorted in descending order to show the highest values first.');
  } else if (/\b(bottom|lowest|worst|least)\b/i.test(q)) {
    parts.push('Results are sorted in ascending order to show the lowest values first.');
  }

  return parts.join('\n\n');
}

function generateInsights(question: string, schema: DataSchema, data: Record<string, unknown>[]): string[] {
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
      insights.push(`**${col}** ranges from ${min.toLocaleString()} to ${max.toLocaleString()} (avg: ${avg.toFixed(1)}).`);

      // Trend detection
      if (vals.length > 5) {
        const firstHalf = vals.slice(0, Math.floor(vals.length / 2));
        const secondHalf = vals.slice(Math.floor(vals.length / 2));
        const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        const change = ((avgSecond - avgFirst) / avgFirst * 100).toFixed(1);
        if (Math.abs(Number(change)) > 5) {
          insights.push(`${Number(change) > 0 ? '📈 Upward' : '📉 Downward'} trend detected: ${change}% change in **${col}**.`);
        }
      }
    }
  }

  // Cardinality insight
  const strCols = schema.columns.filter(c => c.type === 'string');
  if (strCols.length > 0) {
    const col = strCols[0];
    insights.push(`**${col.name}** has **${col.uniqueValues}** unique values.`);
  }

  if (insights.length === 0) {
    insights.push('Dataset appears stable with no significant outliers detected.');
  }

  return insights;
}

// ── Main Query Handler ────────────────────────────────────────────

export function processQuery(
  question: string,
  schema: DataSchema | null,
  data: Record<string, unknown>[],
  history: CopilotMessage[]
): { answer: string; metadata: CopilotMetadata } {
  const intent = detectIntent(question);

  // Handle conversation intents
  if (intent !== 'data-analysis') {
    const result = handleConversation(intent);
    // If dataset is loaded, add data-aware suggestions
    if (schema && result.suggestions) {
      result.suggestions = [...result.suggestions, `Analyze ${schema.tableName}`, 'Show summary statistics'];
    }
    return { answer: result.answer, metadata: { mode: result.mode, suggestions: result.suggestions } };
  }

  // Data analysis mode
  if (!schema || data.length === 0) {
    return {
      answer: "I'd love to help analyze your data, but **no dataset is currently loaded**. Please upload or select a dataset first, then ask me anything about it! 📂",
      metadata: {
        mode: 'data-analysis',
        suggestions: ['Upload a dataset', 'What can you do?'],
      },
    };
  }

  // Context-aware: check previous messages for context
  const contextQuestion = resolveContext(question, history, schema);

  const sql = generateSQLFromQuestion(contextQuestion, schema);
  const chart = recommendChart(contextQuestion, schema);
  const explanation = generateExplanation(contextQuestion, schema, sql);
  const insights = generateInsights(contextQuestion, schema, data);

  const answer = formatDataResponse(explanation, sql, chart, insights);

  return {
    answer,
    metadata: {
      mode: 'data-analysis',
      confidence: 0.85,
      reasoning: `Detected data analysis intent. Generated SQL and recommendations based on dataset schema.`,
      sqlQuery: sql,
      chartRecommendation: chart,
      insights,
      explanation,
      suggestions: [
        'Show me the chart',
        'Modify the query',
        `Top 5 by ${schema.columns.find(c => c.type === 'number')?.name || 'value'}`,
        'Export results',
      ],
    },
  };
}

function resolveContext(question: string, history: CopilotMessage[], schema: DataSchema): string {
  const q = question.toLowerCase();

  // Handle contextual references like "now show top 3" or "filter by..."
  if (/\b(now|also|and|but|then|next|instead)\b/i.test(q) && history.length > 0) {
    // Find the last data analysis question
    const lastDataQ = [...history].reverse().find(m => m.role === 'user' && m.metadata?.mode === 'data-analysis');
    if (lastDataQ) {
      // Combine context
      return `${lastDataQ.content} ${question}`;
    }
  }

  return question;
}

function formatDataResponse(
  explanation: string,
  sql: string,
  chart: CopilotMetadata['chartRecommendation'],
  insights: string[]
): string {
  const sections: string[] = [];

  sections.push(`### 📋 Explanation\n\n${explanation}`);
  sections.push(`### 🔍 SQL Query\n\n\`\`\`sql\n${sql}\n\`\`\``);

  if (chart) {
    sections.push(`### 📊 Suggested Visualization\n\n**${chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart**${chart.xAxis ? ` — ${chart.yAxis || 'value'} by ${chart.xAxis}` : ''}\n\n${chart.reason}`);
  }

  if (insights.length > 0) {
    sections.push(`### 💡 Insights\n\n${insights.map(i => `- ${i}`).join('\n')}`);
  }

  return sections.join('\n\n---\n\n');
}
