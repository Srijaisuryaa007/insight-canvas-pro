// Connector API — real backend calls for database & SaaS connectors

const API_BASE = '/api';

export interface ConnectorTestResult {
  success: boolean;
  message: string;
  connectionId?: string;
}

export interface ConnectorSchemaResult {
  tables: string[];
}

export interface ConnectorImportResult {
  success: boolean;
  dataset?: { id: string; name: string; rowCount: number };
  rowCount?: number;
  error?: string;
}

export async function testConnector(
  connectorId: string,
  credentials: Record<string, string>
): Promise<ConnectorTestResult> {
  try {
    const response = await fetch(`${API_BASE}/connector/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectorId, credentials }),
    });
    const result = await response.json();
    return result;
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Connection test failed' };
  }
}

export async function discoverSchema(
  connectionId: string,
  connectorId: string,
  credentials: Record<string, string>
): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE}/connector/schema`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionId, connectorId, credentials }),
    });
    const result = await response.json();
    return result.tables || [];
  } catch (error) {
    console.error('[ConnectorAPI] Schema discovery error:', error);
    return [];
  }
}

export async function importTable(
  connectionId: string,
  connectorId: string,
  credentials: Record<string, string>,
  table: string,
  limit?: number
): Promise<ConnectorImportResult> {
  try {
    const response = await fetch(`${API_BASE}/connector/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionId, connectorId, credentials, table, limit }),
    });
    const result = await response.json();
    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Import failed' };
  }
}
