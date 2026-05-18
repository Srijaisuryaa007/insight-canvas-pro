// File attachment parser — text, code, CSV, PDF
import type { FileAttachment } from '../types';

const TEXT_EXTS = new Set([
  'txt', 'md', 'html', 'htm', 'css', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx',
  'py', 'rs', 'go', 'java', 'cpp', 'cc', 'c', 'h', 'hpp', 'sql', 'yaml',
  'yml', 'xml', 'json', 'toml', 'sh', 'bash', 'zsh', 'env', 'ini', 'cfg',
  'log', 'rb', 'php', 'swift', 'kt', 'scala', 'r', 'lua', 'pl',
]);
const MAX_TEXT = 50_000;
const MAX_PDF = 10_000;

function getExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result ?? ''));
    fr.onerror = () => reject(fr.error ?? new Error('read failed'));
    fr.readAsText(file);
  });
}

function readArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as ArrayBuffer);
    fr.onerror = () => reject(fr.error ?? new Error('read failed'));
    fr.readAsArrayBuffer(file);
  });
}

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQ = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ',') {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

async function parsePdf(file: File): Promise<string> {
  try {
    // Dynamic import keeps pdfjs out of the main bundle until needed.
    const pdfjs = await import('pdfjs-dist');
    const workerSrc = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default;
    (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = workerSrc;
    const buf = await readArrayBuffer(file);
    const doc = await (pdfjs as unknown as { getDocument: (a: { data: ArrayBuffer }) => { promise: Promise<{ numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str: string }> }> }> }> } })
      .getDocument({ data: buf })
      .promise;
    let text = '';
    for (let i = 1; i <= doc.numPages && text.length < MAX_PDF; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      text += tc.items.map((it) => it.str).join(' ') + '\n\n';
    }
    if (text.length > MAX_PDF) text = text.slice(0, MAX_PDF) + '\n[PDF truncated]';
    return text.trim() || '[PDF appears to contain no extractable text]';
  } catch (e: unknown) {
    return `[PDF parse failed: ${(e as Error).message}]`;
  }
}

export async function parseFile(file: File): Promise<FileAttachment> {
  const ext = getExt(file.name);
  const base = { name: file.name, type: file.type || ext, size: file.size };

  if (TEXT_EXTS.has(ext)) {
    let content = await readText(file);
    if (content.length > MAX_TEXT) content = content.slice(0, MAX_TEXT) + '\n[truncated]';
    return { ...base, content };
  }

  if (ext === 'csv') {
    const raw = await readText(file);
    const lines = raw.split(/\r?\n/).filter((l) => l.trim());
    const total = lines.length;
    const head = lines.slice(0, 100);
    const cols = head[0] ? parseCSVLine(head[0]) : [];
    const preview = head.map((l) => parseCSVLine(l).join('\t')).join('\n');
    return {
      ...base,
      content: `CSV File: ${file.name}\nRows: ${total} (showing first ${Math.min(100, total)})\nColumns: ${cols.join(', ')}\n\n${preview}`,
    };
  }

  if (ext === 'pdf') {
    return { ...base, content: await parsePdf(file) };
  }

  return {
    ...base,
    content: `[File type not supported for text extraction. Filename: ${file.name}, Size: ${Math.round(file.size / 1024)}kb]`,
  };
}

export function formatFileForPrompt(attachments: FileAttachment[]): string {
  return attachments.map((a) => `[File: ${a.name}]\n${a.content}\n[/File]`).join('\n\n');
}
