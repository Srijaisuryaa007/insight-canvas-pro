import { Dataset, DatasetColumn } from '@/types';

export function parseCSV(content: string): Record<string, unknown>[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const data: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: Record<string, unknown> = {};
      headers.forEach((header, idx) => {
        row[header] = parseValue(values[idx]);
      });
      data.push(row);
    }
  }

  return data;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  return values;
}

function parseValue(value: string): unknown {
  const trimmed = value.trim().replace(/^"|"$/g, '');
  
  if (trimmed === '' || trimmed.toLowerCase() === 'null') return null;
  if (trimmed.toLowerCase() === 'true') return true;
  if (trimmed.toLowerCase() === 'false') return false;
  
  // Try parsing as number
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') return num;
  
  // Try parsing as date
  const date = Date.parse(trimmed);
  if (!isNaN(date) && /\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(trimmed)) {
    return new Date(date).toISOString();
  }
  
  return trimmed;
}

export function detectSchema(data: Record<string, unknown>[]): DatasetColumn[] {
  if (data.length === 0) return [];

  const headers = Object.keys(data[0]);
  const columns: DatasetColumn[] = [];

  headers.forEach(header => {
    const values = data.map(row => row[header]);
    const nonNullValues = values.filter(v => v !== null && v !== undefined);
    
    // Detect type from sample values
    let type: DatasetColumn['type'] = 'string';
    if (nonNullValues.length > 0) {
      const sample = nonNullValues[0];
      if (typeof sample === 'number') {
        type = 'number';
      } else if (typeof sample === 'boolean') {
        type = 'boolean';
      } else if (typeof sample === 'string' && /^\d{4}-\d{2}-\d{2}/.test(sample)) {
        type = 'date';
      }
    }

    const uniqueValues = new Set(nonNullValues);

    columns.push({
      name: header,
      type,
      nullable: values.some(v => v === null || v === undefined),
      uniqueValues: uniqueValues.size,
      sampleValues: nonNullValues.slice(0, 5),
    });
  });

  return columns;
}

export function createDataset(
  name: string,
  fileName: string,
  workspaceId: string,
  data: Record<string, unknown>[]
): Dataset {
  const columns = detectSchema(data);

  return {
    id: crypto.randomUUID(),
    name,
    workspaceId,
    fileName,
    rowCount: data.length,
    columns,
    uploadedAt: new Date().toISOString(),
  };
}

// Generate mock data for demo purposes
export function generateMockData(): { data: Record<string, unknown>[]; dataset: Dataset } {
  const categories = ['Electronics', 'Clothing', 'Food', 'Books', 'Sports'];
  const regions = ['North', 'South', 'East', 'West', 'Central'];
  
  const data: Record<string, unknown>[] = [];
  const startDate = new Date('2024-01-01');

  for (let i = 0; i < 100; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + Math.floor(i / 5));
    
    data.push({
      id: i + 1,
      date: date.toISOString().split('T')[0],
      category: categories[Math.floor(Math.random() * categories.length)],
      region: regions[Math.floor(Math.random() * regions.length)],
      revenue: Math.round(Math.random() * 10000 + 1000),
      quantity: Math.floor(Math.random() * 100 + 10),
      profit: Math.round(Math.random() * 3000 + 200),
      discount: Math.round(Math.random() * 30),
      customer_rating: Math.round(Math.random() * 2 + 3),
    });
  }

  const dataset = createDataset('Sales Analytics', 'sales_data.csv', '', data);
  
  return { data, dataset };
}
