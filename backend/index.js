// DataPulse Analytics - Local Backend Server
// Run with: node backend/index.js

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// In-memory datastore
const datastore = {
  workspaces: {
    default: {
      id: 'default',
      name: 'Default Workspace',
      datasets: [],
      createdAt: new Date().toISOString()
    }
  },
  datasets: {},
  qualityReports: {},
  insights: {}
};

// ============ DATASET ENDPOINTS ============

// POST /api/workspace/:workspaceId/dataset - Upload dataset
app.post('/api/workspace/:workspaceId/dataset', (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, fileName, data, columns, rowCount } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    const datasetId = `ds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const dataset = {
      id: datasetId,
      workspaceId,
      name: name || fileName || 'Untitled Dataset',
      fileName: fileName || 'data.csv',
      rowCount: rowCount || data.length,
      columns: columns || detectColumns(data),
      data,
      uploadedAt: new Date().toISOString()
    };

    datastore.datasets[datasetId] = dataset;
    
    if (!datastore.workspaces[workspaceId]) {
      datastore.workspaces[workspaceId] = {
        id: workspaceId,
        name: workspaceId,
        datasets: [],
        createdAt: new Date().toISOString()
      };
    }
    datastore.workspaces[workspaceId].datasets.push(datasetId);

    console.log(`[UPLOAD] Dataset "${dataset.name}" created with ${data.length} rows`);

    res.json({
      success: true,
      dataset: { ...dataset, data: undefined }, // Don't return data in response
      message: `Dataset uploaded successfully with ${data.length} rows`
    });
  } catch (error) {
    console.error('[UPLOAD ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/workspace/:workspaceId/dataset - List datasets
app.get('/api/workspace/:workspaceId/dataset', (req, res) => {
  try {
    const { workspaceId } = req.params;
    const workspace = datastore.workspaces[workspaceId];
    
    if (!workspace) {
      return res.json({ datasets: [] });
    }

    const datasets = workspace.datasets.map(id => {
      const ds = datastore.datasets[id];
      return ds ? { ...ds, data: undefined } : null;
    }).filter(Boolean);

    res.json({ datasets });
  } catch (error) {
    console.error('[LIST ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/workspace/:workspaceId/dataset/:datasetId - Get single dataset with data
app.get('/api/workspace/:workspaceId/dataset/:datasetId', (req, res) => {
  try {
    const { datasetId } = req.params;
    const dataset = datastore.datasets[datasetId];
    
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    res.json({ dataset });
  } catch (error) {
    console.error('[GET DATASET ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ QUALITY SCAN ENDPOINT ============

app.post('/api/quality', (req, res) => {
  try {
    const { datasetId } = req.body;
    const dataset = datastore.datasets[datasetId];

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    const data = dataset.data;
    const issues = [];
    let totalIssues = 0;

    // Analyze each column
    dataset.columns.forEach(column => {
      const values = data.map(row => row[column.name]);
      const totalRows = values.length;

      // Check for missing values
      const missingCount = values.filter(v => v === null || v === undefined || v === '').length;
      if (missingCount > 0) {
        const severity = missingCount / totalRows > 0.2 ? 'high' : missingCount / totalRows > 0.05 ? 'medium' : 'low';
        issues.push({
          column: column.name,
          type: 'missing',
          severity,
          count: missingCount,
          percentage: Math.round((missingCount / totalRows) * 100),
          suggestion: `Fill missing values with ${column.type === 'number' ? 'mean/median' : 'mode or a default value'}`,
          confidence: 0.95,
          reasoning: `Detected ${missingCount} null/empty values out of ${totalRows} total rows`
        });
        totalIssues += missingCount;
      }

      // Check for duplicates
      const uniqueValues = new Set(values.filter(v => v !== null && v !== undefined));
      const duplicateCount = values.length - uniqueValues.size;
      if (duplicateCount > totalRows * 0.5 && column.type !== 'boolean') {
        issues.push({
          column: column.name,
          type: 'duplicate',
          severity: 'medium',
          count: duplicateCount,
          percentage: Math.round((duplicateCount / totalRows) * 100),
          suggestion: 'Consider if duplicates are expected or if deduplication is needed',
          confidence: 0.88,
          reasoning: `Found ${duplicateCount} duplicate values which may indicate data redundancy`
        });
      }

      // Check for outliers (numeric columns only)
      if (column.type === 'number') {
        const numericValues = values.filter(v => typeof v === 'number');
        if (numericValues.length > 0) {
          const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
          const std = Math.sqrt(numericValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numericValues.length);
          const outlierCount = numericValues.filter(v => Math.abs(v - mean) > 3 * std).length;

          if (outlierCount > 0) {
            issues.push({
              column: column.name,
              type: 'outlier',
              severity: outlierCount / totalRows > 0.1 ? 'high' : 'low',
              count: outlierCount,
              percentage: Math.round((outlierCount / totalRows) * 100),
              suggestion: 'Review outliers - they may be errors or valid extreme values',
              confidence: 0.82,
              reasoning: `Identified ${outlierCount} values beyond 3 standard deviations from the mean (${mean.toFixed(2)} ± ${(3*std).toFixed(2)})`
            });
            totalIssues += outlierCount;
          }
        }
      }
    });

    // Calculate overall score
    const maxPossibleIssues = dataset.rowCount * dataset.columns.length;
    const issueRatio = totalIssues / maxPossibleIssues;
    const overallScore = Math.max(0, Math.round((1 - issueRatio) * 100));

    const report = {
      datasetId,
      overallScore,
      issues,
      scannedAt: new Date().toISOString(),
      confidence: 0.92,
      reasoning: `Analyzed ${dataset.columns.length} columns across ${dataset.rowCount} rows. Found ${issues.length} issue types affecting ${totalIssues} cells.`,
      suggestedActions: issues.slice(0, 3).map(i => `Fix ${i.type} in ${i.column}`)
    };

    datastore.qualityReports[datasetId] = report;
    console.log(`[QUALITY] Scanned dataset ${datasetId}: Score ${overallScore}%, ${issues.length} issues`);

    res.json({ report });
  } catch (error) {
    console.error('[QUALITY ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ INSIGHTS ENDPOINT ============

app.post('/api/insights', (req, res) => {
  try {
    const { datasetId } = req.body;
    const dataset = datastore.datasets[datasetId];

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    const data = dataset.data;
    const insights = [];

    // Find numeric columns for trend analysis
    const numericCols = dataset.columns.filter(c => c.type === 'number');
    const stringCols = dataset.columns.filter(c => c.type === 'string');

    // Trend insight
    if (numericCols.length > 0) {
      const col = numericCols[0];
      const values = data.map(r => Number(r[col.name])).filter(v => !isNaN(v));
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const change = ((secondAvg - firstAvg) / firstAvg * 100).toFixed(1);

      insights.push({
        id: `insight_${Date.now()}_1`,
        datasetId,
        type: 'trend',
        title: `${col.name} ${Number(change) > 0 ? 'Increasing' : 'Decreasing'} Trend`,
        description: `${col.name} shows a ${Math.abs(Number(change))}% ${Number(change) > 0 ? 'increase' : 'decrease'} from first half to second half of the data.`,
        confidence: 0.87,
        chartType: 'line',
        config: { xAxis: stringCols[0]?.name || 'index', yAxis: col.name },
        reasoning: `Compared average of first ${firstHalf.length} records (${firstAvg.toFixed(2)}) vs last ${secondHalf.length} records (${secondAvg.toFixed(2)})`,
        suggestedActions: ['Investigate the cause of the trend', 'Consider time-series forecasting', 'Review data collection methods']
      });
    }

    // Distribution insight
    if (stringCols.length > 0 && numericCols.length > 0) {
      const catCol = stringCols[0];
      const valCol = numericCols[0];
      const grouped = {};
      data.forEach(row => {
        const key = String(row[catCol.name]);
        grouped[key] = (grouped[key] || 0) + Number(row[valCol.name] || 0);
      });
      const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
      const topCategory = entries[0];
      const totalValue = entries.reduce((sum, [, v]) => sum + v, 0);

      if (topCategory) {
        insights.push({
          id: `insight_${Date.now()}_2`,
          datasetId,
          type: 'distribution',
          title: `${catCol.name} Distribution Analysis`,
          description: `"${topCategory[0]}" leads with ${((topCategory[1] / totalValue) * 100).toFixed(1)}% of total ${valCol.name}.`,
          confidence: 0.94,
          chartType: 'pie',
          config: { xAxis: catCol.name, yAxis: valCol.name },
          reasoning: `Aggregated ${valCol.name} by ${catCol.name}. Top category accounts for ${topCategory[1].toFixed(0)} out of ${totalValue.toFixed(0)} total.`,
          suggestedActions: ['Analyze underperforming categories', 'Consider market expansion', 'Review resource allocation']
        });
      }
    }

    // Correlation insight
    if (numericCols.length >= 2) {
      const col1 = numericCols[0];
      const col2 = numericCols[1];
      const vals1 = data.map(r => Number(r[col1.name])).filter(v => !isNaN(v));
      const vals2 = data.map(r => Number(r[col2.name])).filter(v => !isNaN(v));
      
      if (vals1.length === vals2.length && vals1.length > 2) {
        const mean1 = vals1.reduce((a, b) => a + b, 0) / vals1.length;
        const mean2 = vals2.reduce((a, b) => a + b, 0) / vals2.length;
        let num = 0, den1 = 0, den2 = 0;
        for (let i = 0; i < vals1.length; i++) {
          num += (vals1[i] - mean1) * (vals2[i] - mean2);
          den1 += Math.pow(vals1[i] - mean1, 2);
          den2 += Math.pow(vals2[i] - mean2, 2);
        }
        const correlation = num / Math.sqrt(den1 * den2);

        if (Math.abs(correlation) > 0.3) {
          insights.push({
            id: `insight_${Date.now()}_3`,
            datasetId,
            type: 'correlation',
            title: `${col1.name} & ${col2.name} Correlation`,
            description: `${Math.abs(correlation) > 0.7 ? 'Strong' : 'Moderate'} ${correlation > 0 ? 'positive' : 'negative'} correlation (r=${correlation.toFixed(2)}) detected.`,
            confidence: 0.85,
            chartType: 'scatter',
            config: { xAxis: col1.name, yAxis: col2.name },
            reasoning: `Calculated Pearson correlation coefficient between ${col1.name} and ${col2.name} across ${vals1.length} data points.`,
            suggestedActions: ['Investigate causal relationship', 'Consider regression analysis', 'Review for confounding variables']
          });
        }
      }
    }

    // Anomaly insight
    if (numericCols.length > 0) {
      const col = numericCols[0];
      const values = data.map(r => Number(r[col.name])).filter(v => !isNaN(v));
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
      const anomalies = values.filter(v => Math.abs(v - mean) > 2 * std);

      if (anomalies.length > 0 && anomalies.length < values.length * 0.1) {
        insights.push({
          id: `insight_${Date.now()}_4`,
          datasetId,
          type: 'anomaly',
          title: `Anomalies Detected in ${col.name}`,
          description: `Found ${anomalies.length} anomalous values that deviate significantly from the mean.`,
          confidence: 0.79,
          chartType: 'bar',
          config: { xAxis: 'index', yAxis: col.name },
          reasoning: `Identified ${anomalies.length} values beyond 2 standard deviations (>${(mean + 2*std).toFixed(2)} or <${(mean - 2*std).toFixed(2)})`,
          suggestedActions: ['Investigate anomalous records', 'Validate data entry process', 'Consider outlier treatment']
        });
      }
    }

    datastore.insights[datasetId] = insights;
    console.log(`[INSIGHTS] Generated ${insights.length} insights for dataset ${datasetId}`);

    res.json({ 
      insights,
      confidence: 0.88,
      reasoning: `Analyzed ${dataset.columns.length} columns to identify trends, distributions, correlations, and anomalies.`
    });
  } catch (error) {
    console.error('[INSIGHTS ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ COPILOT ENDPOINT ============

app.post('/api/copilot', async (req, res) => {
  try {
    const { question, datasetId, history } = req.body;
    const dataset = datasetId ? datastore.datasets[datasetId] : null;

    // Check for GROK API key
    const GROK_API_KEY = process.env.GROK_API_KEY;

    let answer, suggestions, chartRecommendation, confidence, reasoning;

    if (GROK_API_KEY) {
      // Use real AI API
      try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'grok-beta',
            messages: [
              {
                role: 'system',
                content: `You are DataPulse AI, an analytics assistant. ${dataset ? `Current dataset: ${dataset.name} with columns: ${dataset.columns.map(c => c.name).join(', ')}. Row count: ${dataset.rowCount}.` : 'No dataset loaded.'} 
                
                Always respond with JSON in this format:
                {
                  "answer": "your helpful response",
                  "confidence": 0.0-1.0,
                  "reasoning": "explanation of your analysis",
                  "suggestions": ["suggestion 1", "suggestion 2"],
                  "chartRecommendation": {"type": "bar|line|pie|scatter", "reason": "why this chart"}
                }`
              },
              ...(history || []),
              { role: 'user', content: question }
            ],
            temperature: 0.7,
            max_tokens: 1000
          })
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0]?.message?.content;
          try {
            const parsed = JSON.parse(content);
            answer = parsed.answer;
            confidence = parsed.confidence || 0.85;
            reasoning = parsed.reasoning;
            suggestions = parsed.suggestions;
            chartRecommendation = parsed.chartRecommendation;
          } catch {
            answer = content;
            confidence = 0.75;
            reasoning = 'AI-generated response';
          }
        } else {
          throw new Error('API call failed');
        }
      } catch (apiError) {
        console.log('[COPILOT] AI API failed, using fallback:', apiError.message);
        // Fall through to mock response
      }
    }

    // Fallback to intelligent mock responses
    if (!answer) {
      const questionLower = question.toLowerCase();
      
      if (questionLower.includes('trend')) {
        answer = dataset 
          ? `Analyzing trends in ${dataset.name}: I can see patterns in your ${dataset.columns.filter(c => c.type === 'number').map(c => c.name).join(', ')} columns. Would you like me to generate a line chart visualization?`
          : 'Please upload a dataset first so I can analyze trends for you.';
        suggestions = ['Show me the trend chart', 'What factors drive this trend?', 'Compare with previous period'];
        chartRecommendation = { type: 'line', reason: 'Line charts best represent trends over time' };
        confidence = 0.88;
        reasoning = 'Detected trend-related query, recommending time-series analysis';
      } else if (questionLower.includes('quality') || questionLower.includes('issue')) {
        answer = dataset
          ? `I can help you identify data quality issues in ${dataset.name}. The dataset has ${dataset.rowCount} rows across ${dataset.columns.length} columns. Run a quality scan to detect missing values, duplicates, and outliers.`
          : 'Upload a dataset to analyze its quality.';
        suggestions = ['Run quality scan', 'Fix missing values', 'Remove duplicates'];
        confidence = 0.92;
        reasoning = 'Quality-related query detected, suggesting data quality analysis workflow';
      } else if (questionLower.includes('chart') || questionLower.includes('visual')) {
        const numCols = dataset?.columns.filter(c => c.type === 'number').length || 0;
        answer = dataset
          ? `For ${dataset.name}, I recommend: ${numCols > 1 ? 'Scatter plots for correlation, ' : ''}Bar charts for comparisons, and Pie charts for distribution.`
          : 'Upload data to get chart recommendations.';
        suggestions = ['Create a bar chart', 'Show distribution', 'Compare categories'];
        chartRecommendation = { type: 'bar', reason: 'Bar charts are ideal for comparing categorical data' };
        confidence = 0.85;
        reasoning = 'Visualization query detected, providing chart type recommendations';
      } else {
        answer = dataset
          ? `I've analyzed your query about ${dataset.name}. Based on the ${dataset.rowCount} rows and ${dataset.columns.length} columns, I recommend exploring correlations between numeric columns. Would you like specific insights?`
          : 'Hello! I\'m DataPulse AI. Upload a dataset and I\'ll help you analyze it with trends, quality checks, and visualizations.';
        suggestions = ['Show me the distribution', 'What are the top trends?', 'Run a quality scan'];
        chartRecommendation = { type: 'bar', reason: 'Start with bar charts for overview' };
        confidence = 0.82;
        reasoning = 'General query processed with comprehensive analysis recommendations';
      }
    }

    console.log(`[COPILOT] Question: "${question.substring(0, 50)}..." | Confidence: ${confidence}`);

    res.json({
      answer,
      suggestions: suggestions || [],
      chartRecommendation,
      confidence: confidence || 0.8,
      reasoning: reasoning || 'Processed query based on available context',
      suggestedActions: suggestions || []
    });
  } catch (error) {
    console.error('[COPILOT ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ HELPER FUNCTIONS ============

function detectColumns(data) {
  if (!data || data.length === 0) return [];
  
  const headers = Object.keys(data[0]);
  return headers.map(name => {
    const values = data.map(row => row[name]).filter(v => v !== null && v !== undefined);
    const sample = values[0];
    
    let type = 'string';
    if (typeof sample === 'number' || (typeof sample === 'string' && !isNaN(Number(sample)) && sample !== '')) {
      type = 'number';
    } else if (typeof sample === 'boolean') {
      type = 'boolean';
    } else if (typeof sample === 'string' && /^\d{4}-\d{2}-\d{2}/.test(sample)) {
      type = 'date';
    }

    return {
      name,
      type,
      nullable: data.some(row => row[name] === null || row[name] === undefined || row[name] === ''),
      uniqueValues: new Set(values).size,
      sampleValues: values.slice(0, 5)
    };
  });
}

// ============ START SERVER ============

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 DataPulse Analytics Backend                           ║
║                                                            ║
║   Server running at: http://localhost:${PORT}                 ║
║                                                            ║
║   Endpoints:                                               ║
║   • POST /api/workspace/:id/dataset  - Upload dataset      ║
║   • GET  /api/workspace/:id/dataset  - List datasets       ║
║   • POST /api/quality                - Quality scan        ║
║   • POST /api/insights               - Generate insights   ║
║   • POST /api/copilot                - AI assistant        ║
║                                                            ║
║   Set GROK_API_KEY in .env for real AI responses           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
