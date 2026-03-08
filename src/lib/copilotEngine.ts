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
  /\b(charts?|graphs?|visuali[sz](e|ation)|bar\s*charts?|line\s*charts?|pie\s*charts?|scatter|heatmap|histogram|plot)\b/i,
  /\b(suggest|recommend)\b.*\b(charts?|visuals?|graphs?|visuali[sz]ation)\b/i,
  /\b(analyze|analysis|analyse)\s*(my|the|this)?\s*(data|dataset)?/i,
  /\b(trends?|correlations?|distributions?|patterns?|outliers?|anomal\w*|insights?|segments?|clusters?)\b/i,
  /\b(by region|by category|by month|by year|by product)\b/i,
  /\b(summarize|summary|overview|describe)\s*(my|the|this)?\s*(data|dataset)?/i,
  /\b(find|detect|discover|check|scan)\s*(pattern|trend|outlier|anomal|insight|correlation)/i,
  /\b(kpi|metric|dashboard|report)\b/i,
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

const GREETINGS_WITH_DATA = [
  "Hello! 👋 I'm your senior data scientist assistant. I see you have data loaded — want me to run a quick analysis, suggest some charts, or just chat?",
  "Hey there! 🧑‍🔬 Ready to dive into your data or just talk shop. What's on your mind?",
  "Hi! I can help with data analysis, chart recommendations, business strategy, or general questions. What would you like? 😊",
];
const GREETINGS_NO_DATA = [
  "Hello! 👋 I'm DataPulse AI — your senior data science assistant. I can help with analytics concepts, chart selection, business strategy, or any general questions. What's on your mind?",
  "Hey! 🧑‍🔬 I'm here to help — from choosing the right visualization to explaining statistical concepts. Ask me anything!",
  "Hi there! Whether it's data strategy, chart types, machine learning concepts, or general chat — I've got you covered. 😊",
];

const THANKS_R = [
  "You're welcome! Let me know if you need more analysis or have other questions. 😊",
  "Happy to help! Feel free to ask about charts, data patterns, or anything else.",
  "Glad I could help! I'm here for deeper dives anytime.",
];
const FAREWELL_R = [
  "Goodbye! Come back when you need data insights! 👋📊",
  "See you later! Happy analyzing! 😊",
];
const AFFIRM_R = [
  "Great! Want me to suggest some charts, analyze patterns, or explore something else?",
  "Perfect! I can dig deeper into your data or help with something new — what's next?",
];
const JOKES = [
  "Why did the data analyst break up with the pie chart? Because they found someone with more dimensions! 😄📊",
  "A SQL query walks into a bar, sees two tables, and asks: 'Can I JOIN you?' 🍻",
  "What's a data scientist's favorite snack? Correlation chips — they always come in clusters! 🎵",
  "Why do data scientists prefer dark mode? Because light attracts outliers! 🐛",
  "How does a statistician propose? 'With 95% confidence, will you marry me?' 💍",
];

const HELP_RESPONSE = `I'm **DataPulse AI** — your expert Data Analyst assistant! 🧑‍🔬

I'm a senior Data Analyst + BI Developer with 10+ years experience. Here's what I do:

### ✅ What I Can Help With:
- 📊 **DAX Formulas** — Measures, calculated columns, time intelligence
- 🔍 **SQL Queries** — Data extraction, optimization, CTEs, window functions
- 📈 **Data Analysis** — Trends, patterns, anomalies, correlations
- 📉 **Chart Recommendations** — Best visualization for your data
- 🐍 **Python/Pandas** — Data cleaning and transformation
- 🎯 **KPIs & Metrics** — Business goal tracking
- 🏗️ **Data Models** — Relationships and schema design

### 💡 Try These:
- *"Suggest charts for my data"*
- *"Create a DAX measure for total revenue"*
- *"Find patterns in my dataset"*
- *"Write a SQL query to get top 10 products"*
- *"What KPIs should I track?"*`;

const IDENTITY_RESPONSE = `I'm **DataPulse AI** — your expert Data Analyst + BI Developer! 🧑‍🔬

With 10+ years of experience in:
- 📊 **DAX & Power BI** — Measures, time intelligence, data modeling
- 🔍 **SQL** — Complex queries, CTEs, window functions, optimization
- 📈 **Data Visualization** — Chart selection, dashboard design
- 🐍 **Python (Pandas)** — Data cleaning, transformation, analysis
- 🎯 **Business Analytics** — KPIs, metrics, stakeholder insights

I analyze your data, generate formulas, write queries, and recommend the best charts — all with detailed explanations and business context.

Load a dataset and I'll immediately start finding insights! 📂`;

// Expanded general knowledge base
const GENERAL_KNOWLEDGE: Array<{ patterns: RegExp[]; response: string; suggestions: string[] }> = [
  {
    patterns: [/\b(machine learning|ml)\b/i],
    response: "**Machine Learning** is a subset of AI where systems learn from data to make predictions. 🧠\n\n### Types:\n1. **Supervised** — Learn from labeled data (classification, regression)\n2. **Unsupervised** — Find hidden patterns (clustering, dimensionality reduction)\n3. **Reinforcement** — Learn through trial and reward\n\n### In Analytics:\n- **Predictive models** for forecasting revenue or churn\n- **Clustering** customers into segments\n- **Anomaly detection** to flag unusual transactions\n\n> 💡 **Pro Tip:** Start with simple linear regression before jumping to deep learning — it's interpretable and often surprisingly effective.",
    suggestions: ['Explain regression', 'What is clustering?', 'Best chart for ML results'],
  },
  {
    patterns: [/\b(data visualization|best chart|chart type|which chart|visualization best practices)\b/i],
    response: "### 📊 Data Visualization Best Practices\n\nAs a data scientist, here's my chart selection framework:\n\n| Goal | Best Chart |\n|------|------------|\n| **Compare categories** | Bar / Column |\n| **Show trends over time** | Line / Area |\n| **Show proportions** | Pie / Donut / Treemap |\n| **Show relationships** | Scatter / Bubble |\n| **Show distributions** | Histogram / Box Plot |\n| **Show geographic data** | Map / Choropleth |\n| **Show flow/process** | Sankey / Funnel |\n| **Show KPIs** | Card / Gauge |\n\n### 🎯 Golden Rules:\n- **Less is more** — remove chart junk\n- **Color with purpose** — highlight, don't decorate\n- **Label clearly** — axes, titles, legends\n- **Tell a story** — lead the viewer's eye\n- **Choose right scale** — don't truncate y-axis misleadingly",
    suggestions: ['Recommend a chart for my data', 'Explain scatter plots', 'Dashboard design tips'],
  },
  {
    patterns: [/\b(analytics|types of analytics)\b/i],
    response: "### 📈 The Analytics Maturity Model\n\n1. **Descriptive Analytics** — *What happened?*\n   - Reports, dashboards, KPIs\n   - Charts: bar, line, pie\n\n2. **Diagnostic Analytics** — *Why did it happen?*\n   - Drill-downs, correlations, root cause analysis\n   - Charts: scatter, heatmap, treemap\n\n3. **Predictive Analytics** — *What will happen?*\n   - Forecasting, regression, ML models\n   - Charts: line with forecast bands, probability distributions\n\n4. **Prescriptive Analytics** — *What should we do?*\n   - Optimization, simulation, decision trees\n   - Charts: decision trees, scenario comparisons\n\n> 💡 Most organizations are at level 1-2. Moving to 3-4 is where the competitive advantage lies.",
    suggestions: ['Explain predictive analytics', 'What KPIs should I track?', 'Analyze my data'],
  },
  {
    patterns: [/\b(dashboard design|dashboard tips|good dashboard)\b/i],
    response: "### 🎯 Dashboard Design — Senior DS Perspective\n\n**The 5-Second Rule:** Your dashboard should communicate its main message within 5 seconds.\n\n### Structure:\n1. **Top row** — KPI cards (3-5 key metrics)\n2. **Middle** — Primary visualization (the main story)\n3. **Bottom** — Supporting charts (drill-down context)\n\n### Do's:\n- ✅ Use consistent color coding\n- ✅ Add comparison context (vs last period, vs target)\n- ✅ Include filters for interactivity\n- ✅ Use sparklines for inline trends\n\n### Don'ts:\n- ❌ More than 7-8 visuals per dashboard\n- ❌ 3D charts (they distort perception)\n- ❌ Pie charts with >5 slices\n- ❌ Red/green only (colorblind users)\n\n> 💡 **Pro Tip:** Design for your audience — executives want KPIs, analysts want drill-downs.",
    suggestions: ['What KPIs should I track?', 'Best chart for my data', 'Analyze my dataset'],
  },
  {
    patterns: [/\b(kpi|key performance|metrics|what to track)\b/i],
    response: "### 🎯 KPI Selection Framework\n\n**Good KPIs are SMART:**\n- **S**pecific — clearly defined\n- **M**easurable — quantifiable\n- **A**chievable — realistic targets\n- **R**elevant — tied to business goals\n- **T**ime-bound — measured over a period\n\n### Common KPIs by Function:\n\n📈 **Sales:** Revenue, Conversion Rate, Average Order Value, Customer Acquisition Cost\n\n📊 **Marketing:** CAC, ROAS, Click-Through Rate, Engagement Rate\n\n🏭 **Operations:** Efficiency Rate, Defect Rate, Cycle Time, Utilization\n\n💰 **Finance:** Profit Margin, Cash Flow, ROI, Burn Rate\n\n👥 **HR:** Turnover Rate, Time to Hire, Employee Satisfaction\n\n> 💡 **Pro Tip:** Track no more than 5-7 KPIs per dashboard. Too many = information overload.",
    suggestions: ['Dashboard design tips', 'Analyze my data', 'Best visualization for KPIs'],
  },
  {
    patterns: [/\b(regression|linear regression)\b/i],
    response: "### 📈 Regression Analysis\n\n**Linear Regression** predicts a continuous outcome based on input variables.\n\n**Formula:** y = mx + b\n- **y** = predicted value\n- **m** = slope (relationship strength)\n- **x** = input variable\n- **b** = intercept\n\n### Key Metrics:\n- **R²** — How much variance is explained (0-1, higher = better)\n- **p-value** — Statistical significance (<0.05 is significant)\n- **RMSE** — Average prediction error\n\n### When to Use:\n- Predicting revenue from ad spend\n- Forecasting sales based on season\n- Understanding price elasticity\n\n> 💡 **Visualize with:** Scatter plot + trend line. If R² > 0.7, you have a strong model.",
    suggestions: ['What is correlation?', 'Explain clustering', 'Analyze my data trends'],
  },
  {
    patterns: [/\b(correlation|r squared|r-squared)\b/i],
    response: "### 🔗 Correlation Analysis\n\n**Correlation** measures the strength and direction of a relationship between two variables.\n\n### Correlation Coefficient (r):\n- **+1.0** = Perfect positive correlation\n- **+0.7 to +1.0** = Strong positive\n- **+0.3 to +0.7** = Moderate positive\n- **-0.3 to +0.3** = Weak/no correlation\n- **-0.7 to -1.0** = Strong negative\n\n⚠️ **Correlation ≠ Causation!**\nIce cream sales correlate with drowning rates — both increase in summer, not because one causes the other.\n\n### Best Visualization:\n- **Scatter plot** for two variables\n- **Heatmap** for correlation matrix\n- **Bubble chart** for three variables\n\n> 💡 Always check for confounding variables before drawing conclusions.",
    suggestions: ['What is regression?', 'Best chart for relationships', 'Analyze correlations in my data'],
  },
  {
    patterns: [/\b(outlier|anomaly|anomalies)\b/i],
    response: "### 🔍 Outlier & Anomaly Detection\n\n**Outliers** are data points that significantly differ from the rest.\n\n### Detection Methods:\n1. **Z-Score** — Points beyond ±3 standard deviations\n2. **IQR Method** — Below Q1-1.5×IQR or above Q3+1.5×IQR\n3. **Isolation Forest** — ML-based, great for multi-dimensional data\n4. **Visual** — Box plots, scatter plots\n\n### What to Do:\n- ✅ Investigate — is it a data error or genuine?\n- ✅ Document your decision\n- ❌ Don't blindly remove outliers\n- ❌ Don't ignore them either\n\n> 💡 **Visualize with:** Box plot (1D), Scatter plot (2D), or highlight outliers in any chart with conditional formatting.",
    suggestions: ['Check my data for outliers', 'What is IQR?', 'Data quality best practices'],
  },
  {
    patterns: [/\b(a\/b test|ab test|hypothesis|statistical significance)\b/i],
    response: "### 🧪 A/B Testing & Hypothesis Testing\n\n**A/B Testing** compares two variants to determine which performs better.\n\n### Steps:\n1. **Hypothesis** — \"Variant B will increase conversions by 10%\"\n2. **Sample Size** — Calculate using desired confidence & effect size\n3. **Randomize** — Split traffic equally\n4. **Measure** — Track your primary metric\n5. **Analyze** — Check statistical significance\n\n### Key Concepts:\n- **p-value < 0.05** = statistically significant\n- **Confidence Level** — typically 95%\n- **Statistical Power** — typically 80%\n- **Effect Size** — minimum detectable difference\n\n> 💡 **Visualize with:** Bar chart with confidence intervals, or a time series showing both variants' performance over time.",
    suggestions: ['Explain p-values', 'What sample size do I need?', 'Analyze my data'],
  },
  {
    patterns: [/\b(clustering|k-means|segments|segmentation)\b/i],
    response: "### 🎯 Clustering & Segmentation\n\n**Clustering** groups similar data points together without predefined labels.\n\n### Popular Algorithms:\n1. **K-Means** — Fast, requires specifying k clusters\n2. **Hierarchical** — Builds a tree of clusters, no need to specify k\n3. **DBSCAN** — Finds arbitrary-shaped clusters, handles noise\n\n### Business Applications:\n- **Customer segmentation** — high-value, at-risk, new\n- **Product grouping** — by sales pattern\n- **Anomaly detection** — outlier cluster\n\n### How Many Clusters?\n- **Elbow Method** — plot cost vs k, find the bend\n- **Silhouette Score** — measures cluster quality\n\n> 💡 **Visualize with:** Scatter plot with color-coded clusters, or a parallel coordinates chart for multi-dimensional segments.",
    suggestions: ['Explain K-means', 'Best chart for segments', 'Analyze patterns in my data'],
  },
];

function handleConversation(intent: Intent, schema: DataSchema | null, question: string, data: Record<string, unknown>[]): { answer: string; metadata: CopilotMetadata } {
  const hasData = schema && data.length > 0;
  const dataSuggestions = hasData
    ? ['Recommend charts for my data', 'Summarize my dataset', 'Find patterns', 'What KPIs should I track?']
    : ['What chart should I use?', 'Dashboard design tips', 'Explain analytics types', 'What is machine learning?'];

  switch (intent) {
    case 'greeting': {
      const greeting = pick(hasData ? GREETINGS_WITH_DATA : GREETINGS_NO_DATA);
      // If data is loaded, proactively suggest analysis
      let proactiveHint = '';
      if (hasData) {
        const numCols = schema.columns.filter(c => c.type === 'number');
        const strCols = schema.columns.filter(c => c.type === 'string');
        const dateCols = schema.columns.filter(c => c.type === 'date');
        proactiveHint = `\n\n📊 **Quick look at your data:**\n- **${schema.rowCount}** rows, **${schema.columns.length}** columns\n- ${numCols.length} numeric, ${strCols.length} categorical${dateCols.length ? `, ${dateCols.length} date` : ''} columns\n\n💡 I'd suggest starting with ${dateCols.length ? 'a **line chart** to spot time trends' : numCols.length > 1 ? 'a **scatter plot** to check correlations' : 'a **bar chart** to compare categories'}.`;
      }
      return { answer: greeting + proactiveHint, metadata: { mode: 'conversation', suggestions: dataSuggestions } };
    }
    case 'thanks': return { answer: pick(THANKS_R), metadata: { mode: 'conversation', suggestions: dataSuggestions } };
    case 'help': return { answer: HELP_RESPONSE, metadata: { mode: 'conversation', suggestions: dataSuggestions } };
    case 'joke': return { answer: pick(JOKES), metadata: { mode: 'conversation', suggestions: ['Another joke', ...dataSuggestions.slice(0, 2)] } };
    case 'identity': return { answer: IDENTITY_RESPONSE, metadata: { mode: 'conversation', suggestions: dataSuggestions } };
    case 'farewell': return { answer: pick(FAREWELL_R), metadata: { mode: 'conversation' } };
    case 'affirmation': return { answer: pick(AFFIRM_R), metadata: { mode: 'conversation', suggestions: dataSuggestions } };
    case 'general': {
      const q = question.toLowerCase();
      
      // Check expanded knowledge base
      for (const topic of GENERAL_KNOWLEDGE) {
        if (topic.patterns.some(p => p.test(q))) {
          return { answer: topic.response, metadata: { mode: 'conversation', confidence: 0.92, suggestions: topic.suggestions } };
        }
      }

      // Chart recommendation question without data
      if (/\b(recommend|suggest|best|which|what)\b.*\b(charts?|visuals?|graphs?|plots?|visuali[sz]ation)\b/i.test(q) || /\b(charts?|visuals?)\b.*\b(recommend|suggest|should|use)\b/i.test(q)) {
        if (hasData) {
          const chart = recommendChart(question, schema);
          const numCols = schema.columns.filter(c => c.type === 'number');
          const strCols = schema.columns.filter(c => c.type === 'string');
          const dateCols = schema.columns.filter(c => c.type === 'date');
          
          const recommendations: string[] = [];
          if (dateCols.length > 0 && numCols.length > 0)
            recommendations.push(`📈 **Line Chart** — \`${dateCols[0].name}\` vs \`${numCols[0].name}\` to spot trends over time`);
          if (strCols.length > 0 && numCols.length > 0)
            recommendations.push(`📊 **Bar Chart** — Compare \`${numCols[0].name}\` across \`${strCols[0].name}\` categories`);
          if (numCols.length >= 2)
            recommendations.push(`🔵 **Scatter Plot** — \`${numCols[0].name}\` vs \`${numCols[1].name}\` to find correlations`);
          if (strCols.length > 0)
            recommendations.push(`🍩 **Pie/Donut Chart** — Distribution of \`${strCols[0].name}\` values`);
          if (numCols.length > 0)
            recommendations.push(`📦 **Box Plot** — Distribution & outliers in \`${numCols[0].name}\``);
          
          return {
            answer: `### 📊 Chart Recommendations for Your Data\n\nBased on your dataset (${schema.rowCount} rows, ${schema.columns.length} cols), here are my top picks:\n\n${recommendations.join('\n\n')}\n\n> 🎯 **My #1 pick:** ${chart!.type.charAt(0).toUpperCase() + chart!.type.slice(1)} Chart — ${chart!.reason}`,
            metadata: { mode: 'conversation', confidence: 0.9, chartRecommendation: chart, suggestions: ['Summarize my data', 'Top 10 analysis', 'Find patterns'] },
          };
        }
        return {
          answer: "### 📊 Chart Selection Guide\n\nHere's my expert recommendation framework:\n\n| Your Goal | Best Chart | Why |\n|-----------|-----------|-----|\n| **Compare categories** | Bar / Column | Clear side-by-side comparison |\n| **Show trends over time** | Line / Area | Reveals patterns & seasonality |\n| **Show proportions** | Pie / Donut (≤5 slices) | Easy part-of-whole view |\n| **Find relationships** | Scatter Plot | Reveals correlations |\n| **Show distributions** | Histogram / Box Plot | Spots outliers & skew |\n| **Display KPIs** | Card / Gauge | At-a-glance metrics |\n| **Compare many categories** | Treemap / Heatmap | Dense data display |\n\n> 💡 Load a dataset and I'll give you **specific recommendations** based on your actual data structure!",
          metadata: { mode: 'conversation', confidence: 0.85, suggestions: ['Upload a dataset', 'Dashboard design tips', 'Explain scatter plots'] },
        };
      }

      // Intelligent fallback - try to give a helpful answer about the topic
      const topicKeywords = q.match(/\b(\w{4,})\b/g)?.filter(w => !['what', 'how', 'when', 'where', 'which', 'that', 'this', 'with', 'from', 'your', 'about', 'some', 'have', 'been', 'will', 'would', 'could', 'should', 'does', 'make', 'give', 'tell', 'know'].includes(w)) || [];
      const topic = topicKeywords.slice(0, 3).join(' ');
      
      let answer = '';
      if (hasData) {
        answer = `### 💬 About "${topic}"\n\nThat's an interesting question! While I work best with specific data queries or analytics concepts, here's what I can do for you right now:\n\n`;
        answer += `📊 **Your dataset "${schema.tableName}"** has ${schema.rowCount} rows and ${schema.columns.length} columns ready for analysis.\n\n`;
        answer += `Here are some things I can help with:\n`;
        answer += `- "Summarize my dataset" — full statistical overview\n`;
        answer += `- "Suggest charts" — visual recommendations for your data\n`;
        answer += `- "Find patterns" — detect correlations and outliers\n`;
        answer += `- "Top 10 by ${schema.columns.find(c => c.type === 'number')?.name || 'value'}" — ranking analysis\n`;
      } else {
        answer = `### 💬 About "${topic}"\n\nI'm DataPulse AI — a data science assistant! I can help you with:\n\n`;
        answer += `- 📊 **Chart Selection** — Ask "which chart should I use for comparing sales?"\n`;
        answer += `- 🔬 **Data Concepts** — Ask "explain regression" or "what is K-means clustering?"\n`;
        answer += `- 🎯 **Strategy** — Ask "dashboard design best practices"\n`;
        answer += `- 📈 **Analysis** — Upload a dataset and I'll analyze it!\n\n`;
        answer += `> Try asking me something specific and I'll give you a detailed answer!`;
      }

      return {
        answer,
        metadata: { mode: 'conversation', suggestions: dataSuggestions },
      };
    }
    default: return { answer: "I'm here to help! Ask me about data, charts, analytics, or anything else. 😊", metadata: { mode: 'conversation', suggestions: dataSuggestions } };
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
    return handleConversation(intent, schema, question, data);
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

  // Helper: generate chart recommendation section
  const chartSection = (chart: CopilotMetadata['chartRecommendation']) => {
    if (!chart) return '';
    const dateCols = schema.columns.filter(c => c.type === 'date');
    const alternatives: string[] = [];
    if (chart.type !== 'bar' && strCols.length > 0) alternatives.push('Bar Chart');
    if (chart.type !== 'line' && dateCols.length > 0) alternatives.push('Line Chart');
    if (chart.type !== 'scatter' && numCols.length >= 2) alternatives.push('Scatter Plot');
    if (chart.type !== 'pie' && strCols.length > 0) alternatives.push('Pie Chart');
    
    return `\n\n---\n\n### 📈 Chart Recommendation\n🎯 **Best fit: ${chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart**${chart.xAxis ? ` — \`${chart.xAxis}\` ${chart.yAxis ? `vs \`${chart.yAxis}\`` : ''}` : ''}\n\n${chart.reason}${alternatives.length > 0 ? `\n\n**Alternatives:** ${alternatives.join(', ')}` : ''}`;
  };

  // Helper: generate actionable insights section
  const insightSection = () => {
    if (insights.length === 0) return '';
    const actions: string[] = [];
    const vals = numCols.length > 0 ? data.map(r => Number(r[numCols[0].name]) || 0).filter(v => !isNaN(v)) : [];
    if (vals.length > 0) {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const stdDev = Math.sqrt(vals.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / vals.length);
      const cv = (stdDev / avg * 100);
      if (cv > 50) actions.push(`⚠️ High variability detected in \`${numCols[0].name}\` (CV: ${cv.toFixed(0)}%) — investigate outliers`);
      if (cv < 10) actions.push(`✅ \`${numCols[0].name}\` is very stable (CV: ${cv.toFixed(0)}%) — consistent performance`);
      const outliers = vals.filter(v => Math.abs(v - avg) > 2 * stdDev).length;
      if (outliers > 0) actions.push(`🔍 Found **${outliers} potential outliers** in \`${numCols[0].name}\` (>2σ from mean)`);
    }
    if (strCols.length > 0 && strCols[0].uniqueValues < 5) {
      actions.push(`💡 \`${strCols[0].name}\` has only ${strCols[0].uniqueValues} categories — perfect for a pie/donut chart`);
    }
    if (strCols.length > 0 && strCols[0].uniqueValues > 20) {
      actions.push(`💡 \`${strCols[0].name}\` has ${strCols[0].uniqueValues} categories — consider grouping into top N + "Other"`);
    }
    
    return `\n\n---\n\n### 💡 Insights & Recommendations\n${insights.map(i => `- ${i}`).join('\n')}${actions.length > 0 ? `\n\n### 🎯 Actionable Next Steps\n${actions.map(a => `- ${a}`).join('\n')}` : ''}`;
  };

  // Summarize / show all data
  if (/\b(summarize|summary|overview|describe|show all|display all)\b/i.test(q)) {
    const colSummaries = numCols.slice(0, 5).map(col => {
      const vals = data.map(r => Number(r[col.name]) || 0).filter(v => !isNaN(v));
      if (vals.length === 0) return null;
      const sum = vals.reduce((a, b) => a + b, 0);
      const avg = sum / vals.length;
      const max = Math.max(...vals);
      const min = Math.min(...vals);
      const range = max - min;
      return `| \`${col.name}\` | ${min.toLocaleString()} | ${max.toLocaleString()} | ${avg.toFixed(1)} | ${sum.toLocaleString()} | ${range.toLocaleString()} |`;
    }).filter(Boolean);

    analysisAnswer = `### 📊 Dataset Summary: ${schema.tableName}\n\n**${schema.rowCount} rows** across **${schema.columns.length} columns**\n\n**Columns:** ${schema.columns.map(c => `\`${c.name}\` (${c.type})`).join(', ')}\n\n### 📐 Key Statistics\n| Column | Min | Max | Avg | Total | Range |\n|--------|-----|-----|-----|-------|-------|\n${colSummaries.join('\n') || '| No numeric columns found | — | — | — | — | — |'}`;
    analysisAnswer += chartSection(chart);
    analysisAnswer += insightSection();
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

      const topVal = Number(sorted[0]?.[measureCol] || 0);
      const bottomVal = Number(sorted[sorted.length - 1]?.[measureCol] || 0);
      const gap = topVal - bottomVal;

      const rows = sorted.map((r, i) => `${i + 1}. **${dimCol ? r[dimCol] : `Row ${i + 1}`}** — ${measureCol}: **${Number(r[measureCol] || 0).toLocaleString()}**`).join('\n');
      analysisAnswer = `### ${isBottom ? '⬇️ Bottom' : '🏆 Top'} ${limit} by ${measureCol}\n\n${rows}\n\n> 📊 **Gap between #1 and #${limit}:** ${gap.toLocaleString()} (${topVal > 0 ? ((gap / topVal) * 100).toFixed(0) : 0}% difference)`;
      analysisAnswer += chartSection({ type: 'bar', xAxis: dimCol, yAxis: measureCol, reason: `Bar chart clearly shows the ranking of ${isBottom ? 'bottom' : 'top'} performers.` });
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
      const stdDev = Math.sqrt(vals.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / vals.length);

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
        analysisAnswer += chartSection({ type: 'bar', xAxis: groupCol, yAxis: measureCol, reason: `Bar chart is ideal for comparing ${label} across ${groupCol} categories.` });
      } else {
        analysisAnswer = `### 📊 ${measureCol} Statistics\n\n- **Total:** ${sum.toLocaleString()}\n- **Average:** ${avg.toFixed(2)}\n- **Std Dev:** ${stdDev.toFixed(2)}\n- **Min:** ${Math.min(...vals).toLocaleString()}\n- **Max:** ${Math.max(...vals).toLocaleString()}\n- **Range:** ${(Math.max(...vals) - Math.min(...vals)).toLocaleString()}\n- **Records:** ${vals.length.toLocaleString()}\n\n> 🧑‍🔬 **DS Note:** ${stdDev / avg > 0.5 ? 'High variance — your data is widely spread. Consider segmenting by category.' : 'Low variance — data is fairly consistent.'}`;
        analysisAnswer += chartSection({ type: 'histogram', reason: `Histogram shows the distribution of ${measureCol} values — useful for spotting skewness and outliers.` });
      }
    } else {
      analysisAnswer = `Your dataset has **${data.length} records**. Columns: ${schema.columns.map(c => `\`${c.name}\``).join(', ')}`;
    }
  }
  // Chart recommendation request
  else if (/\b(charts?|graphs?|visuali[sz]e?|visuali[sz]ation|recommend|suggest)\b/i.test(q)) {
    const dateCols = schema.columns.filter(c => c.type === 'date');
    const recommendations: string[] = [];
    if (dateCols.length > 0 && numCols.length > 0)
      recommendations.push(`📈 **Line Chart** — \`${dateCols[0].name}\` vs \`${numCols[0].name}\` — spot trends and seasonality`);
    if (strCols.length > 0 && numCols.length > 0)
      recommendations.push(`📊 **Bar Chart** — \`${numCols[0].name}\` by \`${strCols[0].name}\` — compare categories`);
    if (numCols.length >= 2)
      recommendations.push(`🔵 **Scatter Plot** — \`${numCols[0].name}\` vs \`${numCols[1].name}\` — find correlations`);
    if (strCols.length > 0 && strCols[0].uniqueValues <= 8)
      recommendations.push(`🍩 **Pie/Donut** — Distribution of \`${strCols[0].name}\` (${strCols[0].uniqueValues} categories)`);
    if (numCols.length > 0)
      recommendations.push(`📦 **Box Plot** — Outlier detection in \`${numCols[0].name}\``);
    if (data.length > 100)
      recommendations.push(`🗺️ **Heatmap** — Density patterns across multiple dimensions`);
    
    analysisAnswer = `### 📊 Chart Recommendations for ${schema.tableName}\n\nBased on **${schema.rowCount} rows** with **${numCols.length} numeric**, **${strCols.length} categorical**${dateCols.length ? `, **${dateCols.length} date**` : ''} columns:\n\n${recommendations.join('\n\n')}\n\n> 🎯 **My #1 pick:** ${chart!.type.charAt(0).toUpperCase() + chart!.type.slice(1)} Chart — ${chart!.reason}`;
  }
  // Find patterns / analyze
  else if (/\b(patterns?|find|discover|analy[sz]e|analysis|insights?|anomal\w*|outliers?|correlat\w*|trends?)\b/i.test(q)) {
    const patternFindings: string[] = [];
    
    // Check for concentration
    if (strCols.length > 0) {
      const valueCounts: Record<string, number> = {};
      data.forEach(r => {
        const val = String(r[strCols[0].name] || 'Unknown');
        valueCounts[val] = (valueCounts[val] || 0) + 1;
      });
      const sorted = Object.entries(valueCounts).sort((a, b) => b[1] - a[1]);
      const topPct = (sorted[0][1] / data.length * 100).toFixed(0);
      patternFindings.push(`📊 **Category Concentration:** "${sorted[0][0]}" dominates \`${strCols[0].name}\` at **${topPct}%** of records`);
    }
    
    // Check for numeric patterns
    if (numCols.length > 0) {
      const vals = data.map(r => Number(r[numCols[0].name]) || 0).filter(v => !isNaN(v));
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const stdDev = Math.sqrt(vals.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / vals.length);
      const skewness = vals.reduce((s, v) => s + Math.pow((v - avg) / stdDev, 3), 0) / vals.length;
      
      if (Math.abs(skewness) > 1) {
        patternFindings.push(`📐 **Skewed Distribution:** \`${numCols[0].name}\` is ${skewness > 0 ? 'right-skewed (long tail of high values)' : 'left-skewed (long tail of low values)'}`);
      }
      const outliers = vals.filter(v => Math.abs(v - avg) > 2 * stdDev);
      if (outliers.length > 0) {
        patternFindings.push(`🔍 **${outliers.length} Outliers Found** in \`${numCols[0].name}\` (values beyond 2σ: ${outliers.slice(0, 3).map(v => v.toLocaleString()).join(', ')}${outliers.length > 3 ? '...' : ''})`);
      }
    }
    
    // Check for correlations between numeric columns
    if (numCols.length >= 2) {
      const col1 = numCols[0].name;
      const col2 = numCols[1].name;
      const v1 = data.map(r => Number(r[col1]) || 0);
      const v2 = data.map(r => Number(r[col2]) || 0);
      const mean1 = v1.reduce((a, b) => a + b, 0) / v1.length;
      const mean2 = v2.reduce((a, b) => a + b, 0) / v2.length;
      const cov = v1.reduce((s, v, i) => s + (v - mean1) * (v2[i] - mean2), 0) / v1.length;
      const std1 = Math.sqrt(v1.reduce((s, v) => s + Math.pow(v - mean1, 2), 0) / v1.length);
      const std2 = Math.sqrt(v2.reduce((s, v) => s + Math.pow(v - mean2, 2), 0) / v2.length);
      const corr = std1 * std2 > 0 ? cov / (std1 * std2) : 0;
      
      const strength = Math.abs(corr) > 0.7 ? 'Strong' : Math.abs(corr) > 0.4 ? 'Moderate' : 'Weak';
      const direction = corr > 0 ? 'positive' : 'negative';
      patternFindings.push(`🔗 **${strength} ${direction} correlation** between \`${col1}\` and \`${col2}\` (r = ${corr.toFixed(2)})`);
    }
    
    analysisAnswer = `### 🔬 Pattern Analysis: ${schema.tableName}\n\n${patternFindings.join('\n\n')}`;
    analysisAnswer += insightSection();
    analysisAnswer += chartSection(chart);
  }
  // Generic data analysis
  else {
    analysisAnswer = `### 📊 Analysis of ${schema.tableName}\n\n**${schema.rowCount} rows** • **${schema.columns.length} columns** (${numCols.length} numeric, ${strCols.length} categorical)\n\n### 💡 Key Insights\n${insights.map(i => `- ${i}`).join('\n')}`;
    analysisAnswer += chartSection(chart);
    analysisAnswer += insightSection();
  }

  return {
    answer: analysisAnswer,
    metadata: {
      mode: 'data-analysis',
      confidence: 0.88,
      reasoning: `Analyzed data and provided natural language results with chart recommendations.`,
      chartRecommendation: chart,
      insights,
      suggestions: [
        'Recommend charts for my data',
        `Top 5 by ${schema.columns.find(c => c.type === 'number')?.name || 'value'}`,
        'Find patterns & correlations',
        'Summarize my dataset',
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
  const allCols = columns.map(c => c.name);
  const measure = numCols[0] || '';
  const measure2 = numCols[1] || '';
  const measure3 = numCols[2] || '';
  const dim = strCols[0] || '';
  const dim2 = strCols[1] || '';
  const dateCol = dateCols[0] || '';
  const firstCol = allCols[0] || '';

  const queries: RecommendedQuery[] = [];

  // ── Basic (Level 1) ──
  queries.push({ category: 'Basic', label: 'Preview all data (100 rows)', sql: `SELECT *\nFROM ${tableName}\nLIMIT 100`, level: 'Level 1' });
  queries.push({ category: 'Basic', label: 'Count total rows', sql: `SELECT COUNT(*) AS total_rows\nFROM ${tableName}`, level: 'Level 1' });
  if (numCols.length > 0) {
    queries.push({ category: 'Basic', label: `Select numeric columns`, sql: `SELECT ${numCols.slice(0, 4).join(', ')}\nFROM ${tableName}\nLIMIT 100`, level: 'Level 1' });
  }
  if (strCols.length > 0) {
    queries.push({ category: 'Basic', label: `Select text columns`, sql: `SELECT ${strCols.slice(0, 4).join(', ')}\nFROM ${tableName}\nLIMIT 100`, level: 'Level 1' });
  }
  if (dim) {
    queries.push({ category: 'Basic', label: `Unique ${dim} values`, sql: `SELECT DISTINCT ${dim}\nFROM ${tableName}\nORDER BY ${dim}`, level: 'Level 1' });
  }

  // ── Aggregation (Level 2) ──
  if (measure) {
    queries.push({ category: 'Aggregation', label: `Total ${measure}`, sql: `SELECT SUM(${measure}) AS total_${measure}\nFROM ${tableName}`, level: 'Level 2' });
    queries.push({ category: 'Aggregation', label: `Average ${measure}`, sql: `SELECT AVG(${measure}) AS avg_${measure}\nFROM ${tableName}`, level: 'Level 2' });
    queries.push({ category: 'Aggregation', label: `Min & Max ${measure}`, sql: `SELECT MIN(${measure}) AS min_${measure},\n  MAX(${measure}) AS max_${measure}\nFROM ${tableName}`, level: 'Level 2' });
    queries.push({ category: 'Aggregation', label: `Full statistics for ${measure}`, sql: `SELECT\n  COUNT(*) AS total_rows,\n  SUM(${measure}) AS total,\n  AVG(${measure}) AS average,\n  MIN(${measure}) AS minimum,\n  MAX(${measure}) AS maximum\nFROM ${tableName}`, level: 'Level 2' });
    if (dim) {
      queries.push({ category: 'Aggregation', label: `${measure} by ${dim}`, sql: `SELECT ${dim}, SUM(${measure}) AS total_${measure}\nFROM ${tableName}\nGROUP BY ${dim}\nORDER BY total_${measure} DESC`, level: 'Level 2' });
      queries.push({ category: 'Aggregation', label: `Average ${measure} by ${dim}`, sql: `SELECT ${dim}, AVG(${measure}) AS avg_${measure}\nFROM ${tableName}\nGROUP BY ${dim}\nORDER BY avg_${measure} DESC`, level: 'Level 2' });
      queries.push({ category: 'Aggregation', label: `Count records by ${dim}`, sql: `SELECT ${dim}, COUNT(*) AS record_count\nFROM ${tableName}\nGROUP BY ${dim}\nORDER BY record_count DESC`, level: 'Level 2' });
    }
    if (dim && dim2) {
      queries.push({ category: 'Aggregation', label: `${measure} by ${dim} and ${dim2}`, sql: `SELECT ${dim}, ${dim2}, SUM(${measure}) AS total_${measure}\nFROM ${tableName}\nGROUP BY ${dim}, ${dim2}\nORDER BY total_${measure} DESC`, level: 'Level 2' });
    }
    if (measure2) {
      queries.push({ category: 'Aggregation', label: `Sum all numeric columns`, sql: `SELECT\n  ${numCols.map(c => `SUM(${c}) AS total_${c}`).join(',\n  ')}\nFROM ${tableName}`, level: 'Level 2' });
    }
  }

  // ── Filtering (Level 3) ──
  if (measure) {
    queries.push({ category: 'Filtering', label: `${measure} above average`, sql: `SELECT *\nFROM ${tableName}\nWHERE ${measure} > (SELECT AVG(${measure}) FROM ${tableName})\nORDER BY ${measure} DESC\nLIMIT 50`, level: 'Level 3' });
    queries.push({ category: 'Filtering', label: `${measure} below average`, sql: `SELECT *\nFROM ${tableName}\nWHERE ${measure} < (SELECT AVG(${measure}) FROM ${tableName})\nORDER BY ${measure} ASC\nLIMIT 50`, level: 'Level 3' });
    queries.push({ category: 'Filtering', label: `Top 20% by ${measure}`, sql: `SELECT *\nFROM ${tableName}\nWHERE ${measure} > (SELECT MAX(${measure}) * 0.8 FROM ${tableName})\nORDER BY ${measure} DESC`, level: 'Level 3' });
    queries.push({ category: 'Filtering', label: `Zero or null ${measure}`, sql: `SELECT *\nFROM ${tableName}\nWHERE ${measure} = 0 OR ${measure} IS NULL`, level: 'Level 3' });
  }
  if (dim) {
    queries.push({ category: 'Filtering', label: `Filter by specific ${dim}`, sql: `SELECT *\nFROM ${tableName}\nWHERE ${dim} = 'value'\nORDER BY ${measure || firstCol} DESC\nLIMIT 50`, level: 'Level 3' });
    queries.push({ category: 'Filtering', label: `Search ${dim} with LIKE`, sql: `SELECT *\nFROM ${tableName}\nWHERE ${dim} LIKE '%keyword%'\nLIMIT 50`, level: 'Level 3' });
  }
  if (dateCol) {
    queries.push({ category: 'Filtering', label: `Recent records`, sql: `SELECT *\nFROM ${tableName}\nORDER BY ${dateCol} DESC\nLIMIT 50`, level: 'Level 3' });
    queries.push({ category: 'Filtering', label: `Oldest records`, sql: `SELECT *\nFROM ${tableName}\nORDER BY ${dateCol} ASC\nLIMIT 50`, level: 'Level 3' });
  }
  if (measure && measure2) {
    queries.push({ category: 'Filtering', label: `Where ${measure} > ${measure2}`, sql: `SELECT *\nFROM ${tableName}\nWHERE ${measure} > ${measure2}\nORDER BY ${measure} DESC\nLIMIT 50`, level: 'Level 3' });
  }

  // ── Ranking (Level 4) ──
  if (dim && measure) {
    queries.push({ category: 'Ranking', label: `Top 10 ${dim} by ${measure}`, sql: `SELECT ${dim}, SUM(${measure}) AS total_${measure}\nFROM ${tableName}\nGROUP BY ${dim}\nORDER BY total_${measure} DESC\nLIMIT 10`, level: 'Level 4' });
    queries.push({ category: 'Ranking', label: `Top 5 ${dim} by ${measure}`, sql: `SELECT ${dim}, SUM(${measure}) AS total_${measure}\nFROM ${tableName}\nGROUP BY ${dim}\nORDER BY total_${measure} DESC\nLIMIT 5`, level: 'Level 4' });
    queries.push({ category: 'Ranking', label: `Bottom 5 ${dim} by ${measure}`, sql: `SELECT ${dim}, SUM(${measure}) AS total_${measure}\nFROM ${tableName}\nGROUP BY ${dim}\nORDER BY total_${measure} ASC\nLIMIT 5`, level: 'Level 4' });
    queries.push({ category: 'Ranking', label: `Top 3 ${dim} by count`, sql: `SELECT ${dim}, COUNT(*) AS record_count\nFROM ${tableName}\nGROUP BY ${dim}\nORDER BY record_count DESC\nLIMIT 3`, level: 'Level 4' });
    if (measure2) {
      queries.push({ category: 'Ranking', label: `Top 10 ${dim} by ${measure2}`, sql: `SELECT ${dim}, SUM(${measure2}) AS total_${measure2}\nFROM ${tableName}\nGROUP BY ${dim}\nORDER BY total_${measure2} DESC\nLIMIT 10`, level: 'Level 4' });
    }
  }

  // ── Percentage & Ratio (Level 4) ──
  if (dim && measure) {
    queries.push({ category: 'Percentage & Ratio', label: `% share of ${measure} by ${dim}`, sql: `SELECT ${dim},\n  SUM(${measure}) AS total_${measure},\n  SUM(${measure}) * 100.0 / (SELECT SUM(${measure}) FROM ${tableName}) AS pct_share\nFROM ${tableName}\nGROUP BY ${dim}\nORDER BY pct_share DESC`, level: 'Level 4' });
  }
  if (measure && measure2) {
    queries.push({ category: 'Percentage & Ratio', label: `${measure} to ${measure2} ratio`, sql: `SELECT ${dim || firstCol},\n  ${measure},\n  ${measure2},\n  ROUND(${measure} * 1.0 / NULLIF(${measure2}, 0), 2) AS ratio\nFROM ${tableName}\nORDER BY ratio DESC\nLIMIT 50`, level: 'Level 4' });
    queries.push({ category: 'Percentage & Ratio', label: `Margin (${measure} - ${measure2})`, sql: `SELECT ${dim || firstCol},\n  ${measure},\n  ${measure2},\n  (${measure} - ${measure2}) AS margin,\n  ROUND((${measure} - ${measure2}) * 100.0 / NULLIF(${measure}, 0), 2) AS margin_pct\nFROM ${tableName}\nORDER BY margin DESC\nLIMIT 50`, level: 'Level 4' });
  }

  // ── Trend Analysis (Level 5) ──
  if (dateCol && measure) {
    queries.push({ category: 'Trend Analysis', label: `Daily ${measure} trend`, sql: `SELECT ${dateCol}, SUM(${measure}) AS total_${measure}\nFROM ${tableName}\nGROUP BY ${dateCol}\nORDER BY ${dateCol}`, level: 'Level 5' });
    queries.push({ category: 'Trend Analysis', label: `Monthly ${measure}`, sql: `SELECT DATE_TRUNC('month', ${dateCol}) AS month,\n  SUM(${measure}) AS total_${measure}\nFROM ${tableName}\nGROUP BY month\nORDER BY month`, level: 'Level 5' });
    queries.push({ category: 'Trend Analysis', label: `Quarterly ${measure}`, sql: `SELECT DATE_TRUNC('quarter', ${dateCol}) AS quarter,\n  SUM(${measure}) AS total_${measure}\nFROM ${tableName}\nGROUP BY quarter\nORDER BY quarter`, level: 'Level 5' });
    queries.push({ category: 'Trend Analysis', label: `Yearly ${measure}`, sql: `SELECT DATE_TRUNC('year', ${dateCol}) AS year,\n  SUM(${measure}) AS total_${measure}\nFROM ${tableName}\nGROUP BY year\nORDER BY year`, level: 'Level 5' });
    queries.push({ category: 'Trend Analysis', label: `Daily average ${measure}`, sql: `SELECT ${dateCol},\n  AVG(${measure}) AS avg_${measure},\n  COUNT(*) AS records\nFROM ${tableName}\nGROUP BY ${dateCol}\nORDER BY ${dateCol}`, level: 'Level 5' });
    if (dim) {
      queries.push({ category: 'Trend Analysis', label: `Monthly ${measure} by ${dim}`, sql: `SELECT DATE_TRUNC('month', ${dateCol}) AS month,\n  ${dim},\n  SUM(${measure}) AS total_${measure}\nFROM ${tableName}\nGROUP BY month, ${dim}\nORDER BY month, ${dim}`, level: 'Level 5' });
    }
    queries.push({ category: 'Trend Analysis', label: `Daily record count`, sql: `SELECT ${dateCol}, COUNT(*) AS daily_count\nFROM ${tableName}\nGROUP BY ${dateCol}\nORDER BY ${dateCol}`, level: 'Level 5' });
  }

  // ── Window Functions (Level 6) ──
  if (measure) {
    queries.push({ category: 'Window Functions', label: `Running total of ${measure}`, sql: `SELECT ${dateCol || dim || firstCol},\n  ${measure},\n  SUM(${measure}) OVER (ORDER BY ${dateCol || dim || firstCol}) AS running_total\nFROM ${tableName}\nORDER BY ${dateCol || dim || firstCol}`, level: 'Level 6' });
    if (dim) {
      queries.push({ category: 'Window Functions', label: `Rank ${dim} by ${measure}`, sql: `SELECT ${dim},\n  SUM(${measure}) AS total_${measure},\n  RANK() OVER (ORDER BY SUM(${measure}) DESC) AS rank\nFROM ${tableName}\nGROUP BY ${dim}\nORDER BY rank`, level: 'Level 6' });
      queries.push({ category: 'Window Functions', label: `Dense rank ${dim} by ${measure}`, sql: `SELECT ${dim},\n  SUM(${measure}) AS total_${measure},\n  DENSE_RANK() OVER (ORDER BY SUM(${measure}) DESC) AS dense_rank\nFROM ${tableName}\nGROUP BY ${dim}\nORDER BY dense_rank`, level: 'Level 6' });
      queries.push({ category: 'Window Functions', label: `Row number by ${dim}`, sql: `SELECT ${dim},\n  ${measure},\n  ROW_NUMBER() OVER (ORDER BY ${measure} DESC) AS row_num\nFROM ${tableName}`, level: 'Level 6' });
    }
    if (dateCol) {
      queries.push({ category: 'Window Functions', label: `${measure} growth (LAG)`, sql: `SELECT ${dateCol},\n  ${measure},\n  LAG(${measure}) OVER (ORDER BY ${dateCol}) AS prev_${measure},\n  ${measure} - LAG(${measure}) OVER (ORDER BY ${dateCol}) AS growth\nFROM ${tableName}\nORDER BY ${dateCol}`, level: 'Level 6' });
      queries.push({ category: 'Window Functions', label: `${measure} next value (LEAD)`, sql: `SELECT ${dateCol},\n  ${measure},\n  LEAD(${measure}) OVER (ORDER BY ${dateCol}) AS next_${measure}\nFROM ${tableName}\nORDER BY ${dateCol}`, level: 'Level 6' });
      queries.push({ category: 'Window Functions', label: `Moving average (3 period)`, sql: `SELECT ${dateCol},\n  ${measure},\n  AVG(${measure}) OVER (ORDER BY ${dateCol} ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS moving_avg_3\nFROM ${tableName}\nORDER BY ${dateCol}`, level: 'Level 6' });
      queries.push({ category: 'Window Functions', label: `Cumulative % of ${measure}`, sql: `SELECT ${dateCol},\n  ${measure},\n  SUM(${measure}) OVER (ORDER BY ${dateCol}) * 100.0 / SUM(${measure}) OVER () AS cumulative_pct\nFROM ${tableName}\nORDER BY ${dateCol}`, level: 'Level 6' });
    }
    if (dim && measure) {
      queries.push({ category: 'Window Functions', label: `% of total per ${dim}`, sql: `SELECT ${dim},\n  ${measure},\n  ${measure} * 100.0 / SUM(${measure}) OVER () AS pct_of_total\nFROM ${tableName}\nORDER BY pct_of_total DESC`, level: 'Level 6' });
    }
  }

  // ── Statistical (Level 5) ──
  if (measure) {
    queries.push({ category: 'Statistical', label: `Distribution of ${measure}`, sql: `SELECT\n  CASE\n    WHEN ${measure} < (SELECT AVG(${measure}) FROM ${tableName}) THEN 'Below Average'\n    ELSE 'Above Average'\n  END AS bucket,\n  COUNT(*) AS count\nFROM ${tableName}\nGROUP BY bucket`, level: 'Level 5' });
    queries.push({ category: 'Statistical', label: `${measure} quartiles`, sql: `SELECT\n  MIN(${measure}) AS min_val,\n  MAX(${measure}) AS max_val,\n  AVG(${measure}) AS mean,\n  COUNT(*) AS count,\n  SUM(CASE WHEN ${measure} > (SELECT AVG(${measure}) FROM ${tableName}) THEN 1 ELSE 0 END) AS above_avg_count\nFROM ${tableName}`, level: 'Level 5' });
    if (dim) {
      queries.push({ category: 'Statistical', label: `${measure} stats by ${dim}`, sql: `SELECT ${dim},\n  COUNT(*) AS count,\n  SUM(${measure}) AS total,\n  AVG(${measure}) AS average,\n  MIN(${measure}) AS min_val,\n  MAX(${measure}) AS max_val\nFROM ${tableName}\nGROUP BY ${dim}\nORDER BY total DESC`, level: 'Level 5' });
    }
  }
  if (measure && measure2) {
    queries.push({ category: 'Statistical', label: `Compare ${measure} vs ${measure2}`, sql: `SELECT\n  'Total' AS metric,\n  SUM(${measure}) AS ${measure}_total,\n  SUM(${measure2}) AS ${measure2}_total,\n  SUM(${measure}) - SUM(${measure2}) AS difference\nFROM ${tableName}`, level: 'Level 5' });
  }

  // ── Data Quality (Level 3) ──
  queries.push({ category: 'Data Quality', label: 'Null count per column', sql: `SELECT\n  ${allCols.slice(0, 6).map(c => `SUM(CASE WHEN ${c} IS NULL THEN 1 ELSE 0 END) AS null_${c}`).join(',\n  ')}\nFROM ${tableName}`, level: 'Level 3' });
  if (dim) {
    queries.push({ category: 'Data Quality', label: `Duplicate ${dim} values`, sql: `SELECT ${dim}, COUNT(*) AS occurrences\nFROM ${tableName}\nGROUP BY ${dim}\nHAVING COUNT(*) > 1\nORDER BY occurrences DESC`, level: 'Level 3' });
  }
  if (measure) {
    queries.push({ category: 'Data Quality', label: `Outliers in ${measure}`, sql: `SELECT *\nFROM ${tableName}\nWHERE ${measure} > (SELECT AVG(${measure}) + 2 * AVG(${measure}) FROM ${tableName})\n  OR ${measure} < 0\nORDER BY ${measure} DESC\nLIMIT 20`, level: 'Level 3' });
  }

  // ── Grouping & HAVING (Level 4) ──
  if (dim && measure) {
    queries.push({ category: 'Grouping & HAVING', label: `${dim} with total > average`, sql: `SELECT ${dim}, SUM(${measure}) AS total_${measure}\nFROM ${tableName}\nGROUP BY ${dim}\nHAVING SUM(${measure}) > (SELECT AVG(${measure}) FROM ${tableName})\nORDER BY total_${measure} DESC`, level: 'Level 4' });
    queries.push({ category: 'Grouping & HAVING', label: `${dim} with multiple records`, sql: `SELECT ${dim}, COUNT(*) AS record_count\nFROM ${tableName}\nGROUP BY ${dim}\nHAVING COUNT(*) > 1\nORDER BY record_count DESC`, level: 'Level 4' });
    queries.push({ category: 'Grouping & HAVING', label: `${dim} with single record`, sql: `SELECT ${dim}, COUNT(*) AS record_count\nFROM ${tableName}\nGROUP BY ${dim}\nHAVING COUNT(*) = 1`, level: 'Level 4' });
  }

  // ── CASE Statements (Level 5) ──
  if (measure) {
    queries.push({ category: 'CASE Statements', label: `Categorize ${measure}`, sql: `SELECT ${dim || firstCol},\n  ${measure},\n  CASE\n    WHEN ${measure} >= (SELECT MAX(${measure}) * 0.75 FROM ${tableName}) THEN 'High'\n    WHEN ${measure} >= (SELECT MAX(${measure}) * 0.25 FROM ${tableName}) THEN 'Medium'\n    ELSE 'Low'\n  END AS ${measure}_category\nFROM ${tableName}\nORDER BY ${measure} DESC`, level: 'Level 5' });
    queries.push({ category: 'CASE Statements', label: `${measure} tier summary`, sql: `SELECT\n  CASE\n    WHEN ${measure} >= (SELECT MAX(${measure}) * 0.75 FROM ${tableName}) THEN 'High'\n    WHEN ${measure} >= (SELECT MAX(${measure}) * 0.25 FROM ${tableName}) THEN 'Medium'\n    ELSE 'Low'\n  END AS tier,\n  COUNT(*) AS count,\n  SUM(${measure}) AS total_${measure}\nFROM ${tableName}\nGROUP BY tier\nORDER BY total_${measure} DESC`, level: 'Level 5' });
  }

  // ── CTE (Level 7) ──
  if (dim && measure) {
    queries.push({ category: 'CTE', label: `Top 5 ${dim} (CTE)`, sql: `WITH ranked AS (\n  SELECT ${dim},\n    SUM(${measure}) AS total_${measure},\n    RANK() OVER (ORDER BY SUM(${measure}) DESC) AS rank\n  FROM ${tableName}\n  GROUP BY ${dim}\n)\n\nSELECT *\nFROM ranked\nWHERE rank <= 5`, level: 'Level 7' });
    queries.push({ category: 'CTE', label: `${dim} summary (CTE)`, sql: `WITH summary AS (\n  SELECT ${dim},\n    COUNT(*) AS records,\n    SUM(${measure}) AS total_${measure},\n    AVG(${measure}) AS avg_${measure},\n    MAX(${measure}) AS max_${measure}\n  FROM ${tableName}\n  GROUP BY ${dim}\n)\n\nSELECT *\nFROM summary\nORDER BY total_${measure} DESC`, level: 'Level 7' });
    queries.push({ category: 'CTE', label: `Above avg ${dim} (CTE)`, sql: `WITH avg_calc AS (\n  SELECT AVG(${measure}) AS overall_avg\n  FROM ${tableName}\n),\ngrouped AS (\n  SELECT ${dim},\n    SUM(${measure}) AS total_${measure}\n  FROM ${tableName}\n  GROUP BY ${dim}\n)\n\nSELECT g.${dim}, g.total_${measure}, a.overall_avg\nFROM grouped g, avg_calc a\nWHERE g.total_${measure} > a.overall_avg\nORDER BY g.total_${measure} DESC`, level: 'Level 7' });
    if (dateCol) {
      queries.push({ category: 'CTE', label: `Monthly growth (CTE)`, sql: `WITH monthly AS (\n  SELECT DATE_TRUNC('month', ${dateCol}) AS month,\n    SUM(${measure}) AS total_${measure}\n  FROM ${tableName}\n  GROUP BY month\n)\n\nSELECT month,\n  total_${measure},\n  LAG(total_${measure}) OVER (ORDER BY month) AS prev_month,\n  total_${measure} - LAG(total_${measure}) OVER (ORDER BY month) AS growth\nFROM monthly\nORDER BY month`, level: 'Level 7' });
    }
  }

  // ── Comparison (Level 5) ──
  if (measure && measure2) {
    queries.push({ category: 'Comparison', label: `${measure} vs ${measure2} by ${dim || firstCol}`, sql: `SELECT ${dim || firstCol},\n  SUM(${measure}) AS total_${measure},\n  SUM(${measure2}) AS total_${measure2}\nFROM ${tableName}\nGROUP BY ${dim || firstCol}\nORDER BY total_${measure} DESC\nLIMIT 20`, level: 'Level 5' });
    queries.push({ category: 'Comparison', label: `Where ${measure} exceeds ${measure2}`, sql: `SELECT ${dim || firstCol},\n  ${measure},\n  ${measure2},\n  (${measure} - ${measure2}) AS difference\nFROM ${tableName}\nWHERE ${measure} > ${measure2}\nORDER BY difference DESC\nLIMIT 20`, level: 'Level 5' });
  }
  if (measure && measure2 && measure3) {
    queries.push({ category: 'Comparison', label: `All metrics side by side`, sql: `SELECT ${dim || firstCol},\n  ${measure}, ${measure2}, ${measure3}\nFROM ${tableName}\nORDER BY ${measure} DESC\nLIMIT 30`, level: 'Level 5' });
  }

  // ── Cross-Tab / Pivot (Level 6) ──
  if (dim && dim2 && measure) {
    queries.push({ category: 'Cross-Tab', label: `${measure} by ${dim} × ${dim2}`, sql: `SELECT ${dim}, ${dim2},\n  SUM(${measure}) AS total_${measure},\n  COUNT(*) AS count\nFROM ${tableName}\nGROUP BY ${dim}, ${dim2}\nORDER BY total_${measure} DESC`, level: 'Level 6' });
  }

  return queries;
}
