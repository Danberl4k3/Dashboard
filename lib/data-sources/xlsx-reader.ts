import { unzipSync } from 'fflate';

type CellValue = string | number | boolean | null;

function text(bytes: Uint8Array | undefined) {
  return bytes ? new TextDecoder().decode(bytes) : '';
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function attribute(source: string, name: string) {
  return source.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1] || '';
}

function zipPath(base: string, target: string) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = `${base}/${target}`.split('/');
  const resolved: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') resolved.pop();
    else resolved.push(part);
  }
  return resolved.join('/');
}

function columnNumber(reference: string) {
  const letters = reference.match(/^[A-Z]+/)?.[0] || '';
  return [...letters].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0);
}

function richText(source: string) {
  return [...source.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1])).join('');
}

export interface XlsxSheet {
  maxRow: number;
  get(row: number, column: number): CellValue;
}

export interface XlsxWorkbook {
  sheet(name: string): XlsxSheet | null;
}

export function readXlsx(buffer: ArrayBuffer): XlsxWorkbook {
  const files = unzipSync(new Uint8Array(buffer));
  const workbookXml = text(files['xl/workbook.xml']);
  const relationshipsXml = text(files['xl/_rels/workbook.xml.rels']);
  const sharedStringsXml = text(files['xl/sharedStrings.xml']);
  const sharedStrings = [...sharedStringsXml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map((match) => richText(match[1]));

  const relationships = new Map<string, string>();
  for (const match of relationshipsXml.matchAll(/<Relationship\s+([^>]*?)\/?\s*>/g)) {
    relationships.set(attribute(match[1], 'Id'), zipPath('xl', decodeXml(attribute(match[1], 'Target'))));
  }

  const sheetPaths = new Map<string, string>();
  for (const match of workbookXml.matchAll(/<sheet\s+([^>]*?)\/?\s*>/g)) {
    const name = decodeXml(attribute(match[1], 'name'));
    const relationshipId = attribute(match[1], 'r:id');
    const target = relationships.get(relationshipId);
    if (name && target) sheetPaths.set(name, target);
  }

  const cache = new Map<string, XlsxSheet>();
  return {
    sheet(name) {
      if (cache.has(name)) return cache.get(name)!;
      const source = text(files[sheetPaths.get(name) || '']);
      if (!source) return null;

      const cells = new Map<string, CellValue>();
      let maxRow = 0;
      for (const match of source.matchAll(/<c\s+([^>]*?)>([\s\S]*?)<\/c>/g)) {
        const attributes = match[1];
        const body = match[2];
        const reference = attribute(attributes, 'r');
        const row = Number(reference.match(/\d+$/)?.[0] || 0);
        const column = columnNumber(reference);
        if (!row || !column) continue;
        maxRow = Math.max(maxRow, row);

        const type = attribute(attributes, 't');
        const raw = body.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/)?.[1];
        let value: CellValue = null;
        if (type === 'inlineStr') value = richText(body);
        else if (type === 's') value = sharedStrings[Number(raw)] ?? '';
        else if (type === 'str' || type === 'e') value = decodeXml(raw || '');
        else if (type === 'b') value = raw === '1';
        else if (raw !== undefined && raw !== '') value = Number.isFinite(Number(raw)) ? Number(raw) : decodeXml(raw);
        cells.set(`${row}:${column}`, value);
      }

      const sheet = { maxRow, get: (row: number, column: number) => cells.get(`${row}:${column}`) ?? null };
      cache.set(name, sheet);
      return sheet;
    },
  };
}
