// DataPulse Analytics - API Service Layer
// All frontend-backend communication goes through here

const API_BASE = '/api';

// Types for API responses
export interface APIResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

export interface DatasetResponse {
  id: string;
  name: string;
  fileName: string;
  rowCount: number;
  columns: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    nullable: boolean;
    uniqueValues: number;
    sampleValues: unknown[];
  }>;
  uploadedAt: string;
  data?: Record<string, unknown>[];
}

export interface QualityIssue {
  column: string;
  type: 'missing' | 'duplicate' | 'outlier' | 'invalid';
  severity: 'low' | 'medium' | 'high';
  count: number;
  percentage: number;
  suggestion: string;
  confidence: number;
  reasoning: string;
}

export interface QualityReport {
  datasetId: string;
  overallScore: number;
  issues: QualityIssue[];
  scannedAt: string;
  confidence: number;
  reasoning: string;
  suggestedActions: string[];
}

export interface Insight {
  id: string;
  datasetId: string;
  type: 'trend' | 'correlation' | 'anomaly' | 'distribution';
  title: string;
  description: string;
  confidence: number;
  chartType: string;
  config: Record<string, unknown>;
  reasoning: string;
  suggestedActions: string[];
}

export interface CopilotResponse {
  answer: string;
  suggestions?: string[];
  chartRecommendation?: {
    type: string;
    reason: string;
  };
  confidence: number;
  reasoning: string;
  suggestedActions?: string[];
}

// ============ DATASET API ============

export async function uploadDataset(
  workspaceId: string,
  name: string,
  fileName: string,
  data: Record<string, unknown>[],
  columns?: DatasetResponse['columns']
): Promise<{ success: boolean; dataset?: DatasetResponse; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/workspace/${workspaceId}/dataset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        fileName,
        data,
        columns,
        rowCount: data.length
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    const result = await response.json();
    return { success: true, dataset: result.dataset };
  } catch (error) {
    console.error('[API] Upload error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Upload failed' };
  }
}

export async function listDatasets(workspaceId: string): Promise<DatasetResponse[]> {
  try {
    const response = await fetch(`${API_BASE}/workspace/${workspaceId}/dataset`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch datasets');
    }

    const result = await response.json();
    return result.datasets || [];
  } catch (error) {
    console.error('[API] List datasets error:', error);
    return [];
  }
}

export async function getDataset(workspaceId: string, datasetId: string): Promise<DatasetResponse | null> {
  try {
    const response = await fetch(`${API_BASE}/workspace/${workspaceId}/dataset/${datasetId}`);
    
    if (!response.ok) {
      throw new Error('Dataset not found');
    }

    const result = await response.json();
    return result.dataset;
  } catch (error) {
    console.error('[API] Get dataset error:', error);
    return null;
  }
}

// ============ QUALITY API ============

export async function runQualityScan(datasetId: string): Promise<{ report?: QualityReport; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/quality`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datasetId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Quality scan failed');
    }

    const result = await response.json();
    return { report: result.report };
  } catch (error) {
    console.error('[API] Quality scan error:', error);
    return { error: error instanceof Error ? error.message : 'Scan failed' };
  }
}

// ============ INSIGHTS API ============

export async function generateInsights(datasetId: string): Promise<{ insights?: Insight[]; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datasetId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Insight generation failed');
    }

    const result = await response.json();
    return { insights: result.insights };
  } catch (error) {
    console.error('[API] Insights error:', error);
    return { error: error instanceof Error ? error.message : 'Failed to generate insights' };
  }
}

// ============ COPILOT API ============

export async function askCopilot(
  question: string,
  datasetId?: string,
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<CopilotResponse> {
  try {
    const response = await fetch(`${API_BASE}/copilot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, datasetId, history })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Copilot request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('[API] Copilot error:', error);
    return {
      answer: 'Sorry, I encountered an error processing your request. Please try again.',
      confidence: 0,
      reasoning: 'API connection failed'
    };
  }
}
